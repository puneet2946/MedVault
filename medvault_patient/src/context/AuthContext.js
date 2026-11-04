"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { createClient } from "../utils/supabase/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Track user IDs that have already attempted recovery to prevent repeated inserts on every render
  const attemptedRecoveryRef = useRef(new Set());

  // Safe manual profile fetcher (separate from auth state change listener)
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.warn("Could not fetch profile:", error.message);
        return null;
      }

      setProfile(data);
      return data;
    } catch (err) {
      console.warn("Unexpected error fetching profile:", err);
      return null;
    }
  }, []);

  // Safe profile creation helper after an authenticated session exists
  const createProfileIfMissing = useCallback(async (authUser, fallbackName) => {
    if (!authUser?.id) return null;

    try {
      const supabase = createClient();

      // Check whether a profile row already exists
      const { data: existing } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (existing) {
        setProfile(existing);
        setNeedsOnboarding(false);
        return existing;
      }

      const fullName =
        authUser.user_metadata?.full_name?.trim() ||
        authUser.user_metadata?.name?.trim() ||
        fallbackName?.trim();

      if (!fullName) {
        // Missing name: do not insert invalid/blank data into database
        setNeedsOnboarding(true);
        return null;
      }

      const { data: created, error } = await supabase
        .from("profiles")
        .insert({
          id: authUser.id,
          full_name: fullName,
        })
        .select()
        .maybeSingle();

      if (error) {
        // If conflict (e.g. created concurrently), refetch existing
        if (error.code === "23505") {
          const { data: refetched } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authUser.id)
            .maybeSingle();
          if (refetched) {
            setProfile(refetched);
            setNeedsOnboarding(false);
            return refetched;
          }
        }
        console.error("Error creating profile:", error.message);
        return null;
      }

      setProfile(created);
      setNeedsOnboarding(false);
      return created;
    } catch (err) {
      console.error("Unexpected error creating profile:", err);
      return null;
    }
  }, []);

  // Allows completing missing profile when metadata had no name
  const completeProfile = useCallback(
    async (fullName) => {
      if (!user?.id || !fullName?.trim()) return null;
      const cleanName = fullName.trim();
      const supabase = createClient();

      try {
        const { data, error } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            full_name: cleanName,
          })
          .select()
          .maybeSingle();

        if (error) {
          if (error.code === "23505") {
            const { data: existing } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", user.id)
              .maybeSingle();
            if (existing) {
              setProfile(existing);
              setNeedsOnboarding(false);
              return existing;
            }
          }
          console.error("Failed to complete profile:", error.message);
          return null;
        }

        if (data) {
          setProfile(data);
          setNeedsOnboarding(false);
          // Sync metadata asynchronously
          supabase.auth.updateUser({ data: { full_name: cleanName } }).catch(() => {});
          return data;
        }
      } catch (err) {
        console.error("Unexpected error completing profile:", err);
      }
      return null;
    },
    [user]
  );

  // Synchronous session initialization & auth listener (NO AWAITED QUERIES INSIDE LISTENER)
  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    async function initializeAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("Error getting initial session:", error.message);
        }
        if (isMounted) {
          const currentSession = data?.session ?? null;
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
        }
      } catch (err) {
        console.warn("Auth initialization error:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    // The onAuthStateChange callback is strictly synchronous: no awaited Supabase queries
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!isMounted) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (event === "SIGNED_OUT") {
        setProfile(null);
        setNeedsOnboarding(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Separate effect observing authenticated user ID for profile loading & automatic recovery
  useEffect(() => {
    let isCancelled = false;
    const currentUserId = user?.id;

    if (!currentUserId) {
      return;
    }

    async function loadAndRecoverProfile() {
      const supabase = createClient();

      try {
        // Step 1: Check for existing profile
        const { data: existing, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUserId)
          .maybeSingle();

        if (isCancelled) return;

        if (existing) {
          setProfile(existing);
          setNeedsOnboarding(false);
          return;
        }

        if (error) {
          console.warn("Error querying profile:", error.message);
        }

        // Step 2: Profile row does not exist -> Auto-recover
        if (attemptedRecoveryRef.current.has(currentUserId)) {
          // Already attempted recovery for this user; prevent repeated attempts
          return;
        }
        attemptedRecoveryRef.current.add(currentUserId);

        const metadataName =
          user.user_metadata?.full_name?.trim() || user.user_metadata?.name?.trim();

        if (metadataName) {
          // Metadata has full_name -> safely create profile
          const { data: created, error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: currentUserId,
              full_name: metadataName,
            })
            .select()
            .maybeSingle();

          if (isCancelled) return;

          if (insertError) {
            if (insertError.code === "23505") {
              const { data: refetched } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", currentUserId)
                .maybeSingle();
              if (!isCancelled && refetched) {
                setProfile(refetched);
                setNeedsOnboarding(false);
              }
            } else {
              console.error("Auto profile recovery insert error:", insertError.message);
            }
          } else if (created) {
            setProfile(created);
            setNeedsOnboarding(false);
          }
        } else {
          // Missing full_name in metadata: prompt onboarding without corrupting database
          if (!isCancelled) {
            setNeedsOnboarding(true);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn("Unexpected error during profile recovery:", err);
        }
      }
    }

    loadAndRecoverProfile();

    return () => {
      isCancelled = true;
    };
  }, [user?.id, user?.user_metadata]);

  // Sign In with email & password
  const signIn = useCallback(async (email, password) => {
    const supabase = createClient();
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  }, []);

  // Sign Up with explicit emailRedirectTo and full_name metadata
  const signUp = useCallback(
    async (email, password, fullName) => {
      const supabase = createClient();
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined;

      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: redirectUrl,
        },
      });

      // If a session exists immediately (e.g. auto-confirm enabled), create profile
      if (result.data?.session && result.data?.user) {
        await createProfileIfMissing(result.data.user, fullName);
      }

      return result;
    },
    [createProfileIfMissing]
  );

  // Password reset request
  const resetPassword = useCallback(async (email) => {
    const supabase = createClient();
    const redirectUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?type=recovery`
        : undefined;

    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
  }, []);

  // Sign In with Google OAuth
  const signInWithGoogle = useCallback(async () => {
    const supabase = createClient();
    const redirectUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : undefined;

    return await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
      },
    });
  }, []);

  // Sign Out
  const signOut = useCallback(async () => {
    const supabase = createClient();
    const result = await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setNeedsOnboarding(false);
    return result;
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      loading,
      needsOnboarding,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      resetPassword,
      completeProfile,
      fetchProfile,
      createProfileIfMissing,
    }),
    [
      user,
      session,
      profile,
      loading,
      needsOnboarding,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      resetPassword,
      completeProfile,
      fetchProfile,
      createProfileIfMissing,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

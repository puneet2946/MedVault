"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../utils/supabase/client";
import { useAuth } from "../../../context/AuthContext";

// Module-level in-flight deduplication cache.
// Keyed by authorization code, token hash, or access token so that React Strict Mode's
// double effect invocations share the exact same Promise without triggering duplicate network requests.
const verificationCache = new Map();

async function executeAuthVerification(supabase, { code, tokenHash, otpType, accessToken, refreshToken }) {
  let cacheKey = null;
  if (code) {
    cacheKey = `code:${code}`;
  } else if (tokenHash) {
    cacheKey = `token:${tokenHash}:${otpType}`;
  } else if (accessToken && refreshToken) {
    cacheKey = `session:${accessToken}`;
  } else {
    return { data: null, error: null };
  }

  if (verificationCache.has(cacheKey)) {
    return verificationCache.get(cacheKey);
  }

  const promise = (async () => {
    try {
      if (code) {
        return await supabase.auth.exchangeCodeForSession(code);
      }
      if (tokenHash) {
        return await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        });
      }
      if (accessToken && refreshToken) {
        return await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }
      return { data: null, error: null };
    } finally {
      // Free cache entry after 10 seconds to avoid memory leaks and not retain sensitive tokens
      setTimeout(() => {
        verificationCache.delete(cacheKey);
      }, 10000);
    }
  })();

  verificationCache.set(cacheKey, promise);
  return promise;
}

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { createProfileIfMissing } = useAuth();
  const [status, setStatus] = useState("verifying"); // 'verifying' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState("");
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    let isCancelled = false;

    async function handleAuthCallback() {
      const supabase = createClient();

      // Extract hash fragment parameters if present (for implicit-flow fallback)
      const rawHash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
      const hashParams = new URLSearchParams(rawHash);

      const typeParam = searchParams.get("type") || hashParams.get("type");
      const hashHasRecovery =
        typeof window !== "undefined" && window.location.hash.includes("type=recovery");
      const isRecovery = typeParam === "recovery" || hashHasRecovery;
      setIsRecoveryFlow(isRecovery);

      try {
        // 1. Check for explicit error parameters passed by Supabase (in query or hash)
        const errorDesc =
          searchParams.get("error_description") || hashParams.get("error_description");
        const errorCode = searchParams.get("error") || hashParams.get("error");
        if (errorDesc || errorCode) {
          if (!isCancelled) {
            setStatus("error");
            setErrorMessage(errorDesc || errorCode || "Verification failed.");
          }
          return;
        }

        const code = searchParams.get("code");
        const tokenHash = searchParams.get("token_hash");
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        let currentSession = null;

        if (code || tokenHash || (accessToken && refreshToken)) {
          // 2. Sole owner of URL verification:
          // Process PKCE authorization code, token_hash OTP, or explicit hash-fragment session
          const otpType = typeParam || (isRecovery ? "recovery" : "signup");
          const { data, error } = await executeAuthVerification(supabase, {
            code,
            tokenHash,
            otpType,
            accessToken,
            refreshToken,
          });

          if (error) {
            // Check if an existing valid session is already active (e.g., consumed code upon page reload)
            const { data: fallbackData } = await supabase.auth.getSession();
            if (fallbackData?.session?.user) {
              currentSession = fallbackData.session;
            } else {
              console.error("Auth verification error:", error.message);
              if (!isCancelled) {
                setStatus("error");
                setErrorMessage(error.message);
              }
              return;
            }
          } else {
            currentSession = data?.session;
          }
        } else {
          // 3. No verification params in URL: check for an existing session
          const { data, error } = await supabase.auth.getSession();
          if (data?.session) {
            currentSession = data.session;
          } else if (error) {
            if (!isCancelled) {
              setStatus("error");
              setErrorMessage(error.message);
            }
            return;
          }
        }

        if (currentSession?.user) {
          if (isRecovery) {
            // Route password recovery sessions to dedicated password update page
            if (!isCancelled && !hasNavigatedRef.current) {
              hasNavigatedRef.current = true;
              setStatus("success");
              router.replace("/auth/reset-password");
            }
            return;
          }

          // Normal email confirmation flow: ensure profile exists
          await createProfileIfMissing(
            currentSession.user,
            currentSession.user.user_metadata?.full_name || "Patient"
          );

          if (!isCancelled && !hasNavigatedRef.current) {
            hasNavigatedRef.current = true;
            setStatus("success");
            router.replace("/home");
          }
        } else {
          if (!isCancelled) {
            setStatus("error");
            setErrorMessage("No active session found. Please sign in or request a new link.");
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setStatus("error");
          setErrorMessage(err.message || "An unexpected error occurred during verification.");
        }
      }
    }

    handleAuthCallback();

    return () => {
      isCancelled = true;
    };
  }, [searchParams, router, createProfileIfMissing]);

  if (status === "error") {
    return (
      <div className="w-full max-w-md bg-white/70 backdrop-blur-xl rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white text-center">
        <div className="w-14 h-14 bg-error-container/30 text-error rounded-2xl mx-auto flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-3xl">error</span>
        </div>
        <h2 className="text-xl font-bold text-[#01261f] mb-2">
          {isRecoveryFlow ? "Password Reset Failed" : "Verification Failed"}
        </h2>
        <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
          {errorMessage || "The link may have expired or has already been used."}
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center w-full bg-[#01261f] text-[#c9e165] font-bold text-sm py-3.5 rounded-xl hover:bg-[#01261f]/90 transition-all cursor-pointer"
        >
          Return to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-white/70 backdrop-blur-xl rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white text-center">
      <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl mx-auto flex items-center justify-center mb-4">
        <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
      </div>
      <h2 className="text-xl font-bold text-[#01261f] mb-2">
        {isRecoveryFlow ? "Preparing Password Reset" : "Verifying Account"}
      </h2>
      <p className="text-sm text-on-surface-variant font-medium">
        Connecting your MedVault profile, please wait...
      </p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center font-['Plus_Jakarta_Sans'] bg-[#fafaf1] overflow-hidden px-6">
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-secondary-container/20 rounded-full blur-[80px]" />

      <Suspense
        fallback={
          <div className="w-full max-w-md bg-white/70 backdrop-blur-xl rounded-[2rem] p-8 text-center border border-white">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">
              progress_activity
            </span>
          </div>
        }
      >
        <CallbackHandler />
      </Suspense>
    </div>
  );
}

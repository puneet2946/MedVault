"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const {
    user,
    loading: authLoading,
    signIn,
    signUp,
    signInWithGoogle,
    resetPassword,
  } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // Redirect authenticated users to /home
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/home");
    }
  }, [user, authLoading, router]);

  // Reset messages when switching modes
  const handleToggle = (loginMode) => {
    setIsLogin(loginMode);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleForgotPassword = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage("Please enter your email address to request a password reset.");
      return;
    }

    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await resetPassword(cleanEmail);
      if (error) {
        setErrorMessage(error.message || "Unable to send password reset email.");
      } else {
        // Neutral message: do not reveal whether account exists
        setSuccessMessage(
          "If an account exists for this email, a password reset link has been sent. Please check your inbox."
        );
      }
    } catch (err) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      if (isLogin) {
        // Sign In
        const { error } = await signIn(email.trim(), password);
        if (error) {
          setErrorMessage(error.message || "Failed to sign in. Please check your credentials.");
          setIsLoading(false);
          return;
        }
        router.push("/home");
      } else {
        // Create Account (Sign Up)
        if (!name.trim()) {
          setErrorMessage("Please enter your full name.");
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMessage("Password must be at least 6 characters.");
          setIsLoading(false);
          return;
        }

        const { data, error } = await signUp(email.trim(), password, name.trim());
        if (error) {
          setErrorMessage(error.message || "Failed to create account.");
          setIsLoading(false);
          return;
        }

        // Check whether email confirmation is required
        if (data?.user && !data?.session) {
          setSuccessMessage(
            "Account created! Please check your email to confirm your account before logging in."
          );
          setIsLoading(false);
        } else if (data?.session) {
          // Immediate session established
          router.push("/home");
        }
      }
    } catch (err) {
      setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setErrorMessage(error.message || "Failed to initiate Google sign-in.");
        setIsLoading(false);
      }
    } catch (err) {
      setErrorMessage(err.message || "An unexpected error occurred during Google sign-in.");
      setIsLoading(false);
    }
  };

  const handleOAuth = () => {
    setErrorMessage("DigiLocker integration will be available in an upcoming update.");
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center font-['Plus_Jakarta_Sans'] bg-[#fafaf1] overflow-hidden px-6">
      {/* Background Ornaments */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-secondary-container/20 rounded-full blur-[80px]" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
        {/* Header / Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-fixed rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-primary/20 mb-4 transform -rotate-3 hover:rotate-0 transition-transform">
            <span
              className="material-symbols-outlined text-white text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              medical_services
            </span>
          </div>
          <h1 className="text-3xl font-black text-[#01261f] tracking-tight">MedVault</h1>
          <p className="text-[#01261f]/60 font-medium mt-1">Your secure digital health passport</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
          {/* Toggle */}
          <div className="flex p-1 bg-surface-container-low rounded-xl mb-6 relative">
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-in-out ${
                isLogin ? "left-1" : "left-[calc(50%+3px)]"
              }`}
            />
            <button
              type="button"
              onClick={() => handleToggle(true)}
              className={`flex-1 py-2.5 text-sm font-bold z-10 transition-colors ${
                isLogin ? "text-[#01261f]" : "text-on-surface-variant"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleToggle(false)}
              className={`flex-1 py-2.5 text-sm font-bold z-10 transition-colors ${
                !isLogin ? "text-[#01261f]" : "text-on-surface-variant"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Feedback messages */}
          {errorMessage && (
            <div className="mb-4 p-3.5 bg-error-container/30 border border-error/20 rounded-xl flex items-start gap-2.5 text-error text-xs font-semibold animate-in fade-in duration-200">
              <span className="material-symbols-outlined text-base shrink-0">error</span>
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3.5 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-2.5 text-primary text-xs font-semibold animate-in fade-in duration-200">
              <span className="material-symbols-outlined text-base shrink-0">mark_email_read</span>
              <span className="leading-relaxed">{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 ml-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Julian Reed"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3.5 text-sm text-[#01261f] font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-[#01261f]/30"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 ml-1">
                Email Address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3.5 text-sm text-[#01261f] font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-[#01261f]/30"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1 mr-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Password
                </label>
                {isLogin ? (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isLoading || authLoading}
                    className="text-xs font-bold text-primary hover:underline cursor-pointer disabled:opacity-50"
                  >
                    Forgot Password?
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-primary/80">
                    Min. 6 characters
                  </span>
                )}
              </div>
              <input
                type="password"
                required
                autoComplete={isLogin ? "current-password" : "new-password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3.5 text-sm text-[#01261f] font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-[#01261f]/30"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || authLoading}
              className="w-full bg-[#01261f] text-[#c9e165] font-bold text-sm py-4 rounded-xl mt-4 hover:bg-[#01261f]/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-[#01261f]/10 disabled:opacity-70 cursor-pointer"
            >
              {isLoading ? (
                <span className="material-symbols-outlined animate-spin text-lg">
                  progress_activity
                </span>
              ) : isLogin ? (
                "Sign In to MedVault"
              ) : (
                "Create MedVault Account"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6 opacity-60">
            <div className="flex-1 h-px bg-outline-variant"></div>
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              OR
            </span>
            <div className="flex-1 h-px bg-outline-variant"></div>
          </div>

          {/* Social / Alternate Auth */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full bg-white text-[#1f1f1f] border border-[#747775]/30 rounded-xl py-3.5 flex items-center justify-center gap-3 hover:bg-[#f8f9fa] transition-colors active:scale-[0.98] shadow-sm cursor-pointer disabled:opacity-50"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span className="text-sm font-bold tracking-wide">Continue with Google</span>
            </button>

            <button
              type="button"
              onClick={handleOAuth}
              disabled={isLoading}
              className="w-full bg-[#005696] text-white rounded-xl py-3.5 flex items-center justify-center gap-3 hover:bg-[#005696]/90 transition-colors active:scale-[0.98] shadow-lg shadow-[#005696]/20 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined font-bold text-xl">security</span>
              <span className="text-sm font-bold tracking-wide">Continue with DigiLocker</span>
            </button>
          </div>
        </div>

        {/* Footer text */}
        <p className="text-center text-xs text-on-surface-variant mt-8 font-medium">
          By continuing, you agree to our{" "}
          <a href="#" className="underline hover:text-[#01261f]">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="underline hover:text-[#01261f]">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}

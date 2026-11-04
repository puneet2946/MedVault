"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../utils/supabase/client";
import { useAuth } from "../../../context/AuthContext";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (password.length < 6) {
      setErrorMessage("New password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify both fields.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setErrorMessage(error.message || "Failed to update password. Please try again.");
        setIsLoading(false);
        return;
      }

      setSuccessMessage("Password updated successfully! Redirecting to dashboard...");
      setTimeout(() => {
        router.replace("/home");
      }, 1500);
    } catch (err) {
      setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  // If initial auth check completed and there is no active recovery session
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen relative flex items-center justify-center font-['Plus_Jakarta_Sans'] bg-[#fafaf1] overflow-hidden px-6">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-secondary-container/20 rounded-full blur-[80px]" />

        <div className="w-full max-w-md relative z-10 bg-white/70 backdrop-blur-xl rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white text-center">
          <div className="w-14 h-14 bg-error-container/30 text-error rounded-2xl mx-auto flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">lock_clock</span>
          </div>
          <h2 className="text-xl font-bold text-[#01261f] mb-2">Session Expired</h2>
          <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
            Your password reset session has expired or is invalid. Please return to the login screen and request a new password reset link.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center w-full bg-[#01261f] text-[#c9e165] font-bold text-sm py-3.5 rounded-xl hover:bg-[#01261f]/90 transition-all cursor-pointer"
          >
            Return to Sign In
          </Link>
        </div>
      </div>
    );
  }

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
              lock_reset
            </span>
          </div>
          <h1 className="text-3xl font-black text-[#01261f] tracking-tight">Set New Password</h1>
          <p className="text-[#01261f]/60 font-medium mt-1">Enter your new secure MedVault password</p>
        </div>

        {/* Card */}
        <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
          {/* Feedback messages */}
          {errorMessage && (
            <div className="mb-4 p-3.5 bg-error-container/30 border border-error/20 rounded-xl flex items-start gap-2.5 text-error text-xs font-semibold animate-in fade-in duration-200">
              <span className="material-symbols-outlined text-base shrink-0">error</span>
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3.5 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-2.5 text-primary text-xs font-semibold animate-in fade-in duration-200">
              <span className="material-symbols-outlined text-base shrink-0">check_circle</span>
              <span className="leading-relaxed">{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 ml-1">
                New Password
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3.5 text-sm text-[#01261f] font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-[#01261f]/30"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 ml-1">
                Confirm Password
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              ) : (
                "Update Password & Continue"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-xs font-bold text-on-surface-variant hover:text-[#01261f] transition-colors"
            >
              Cancel and Return to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


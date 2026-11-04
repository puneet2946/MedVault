"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function AuthGuard({ children }) {
  const router = useRouter();
  const { user, loading, needsOnboarding, completeProfile } = useAuth();
  const [onboardingName, setOnboardingName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [onboardingError, setOnboardingError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    if (!onboardingName.trim()) {
      setOnboardingError("Please enter your full name.");
      return;
    }

    setIsSaving(true);
    setOnboardingError("");

    try {
      const result = await completeProfile(onboardingName.trim());
      if (!result) {
        setOnboardingError("Could not save profile. Please try again.");
      }
    } catch (err) {
      setOnboardingError(err.message || "An error occurred saving your profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-['Plus_Jakarta_Sans'] bg-[#fafaf1] px-6">
        <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-fixed rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-4 animate-pulse">
          <span
            className="material-symbols-outlined text-white text-3xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            medical_services
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-[#01261f]/60 tracking-widest uppercase">
          <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
          <span>Loading MedVault</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Handle missing full_name / incomplete profile gracefully
  if (needsOnboarding) {
    return (
      <div className="min-h-screen relative flex items-center justify-center font-['Plus_Jakarta_Sans'] bg-[#fafaf1] overflow-hidden px-6">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-secondary-container/20 rounded-full blur-[80px]" />

        <div className="w-full max-w-md relative z-10 bg-white/70 backdrop-blur-xl rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl mx-auto flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">badge</span>
          </div>
          <h2 className="text-xl font-bold text-[#01261f] mb-1">Welcome to MedVault</h2>
          <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
            Please enter your full name to complete your medical profile.
          </p>

          <form onSubmit={handleOnboardingSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 ml-1">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="Julian Reed"
                value={onboardingName}
                onChange={(e) => setOnboardingName(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3.5 text-sm text-[#01261f] font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-[#01261f]/30"
              />
            </div>

            {onboardingError && (
              <p className="text-xs font-semibold text-error px-1">{onboardingError}</p>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-[#01261f] text-[#c9e165] font-bold text-sm py-4 rounded-xl mt-4 hover:bg-[#01261f]/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-[#01261f]/10 disabled:opacity-70 cursor-pointer"
            >
              {isSaving ? (
                <span className="material-symbols-outlined animate-spin text-lg">
                  progress_activity
                </span>
              ) : (
                "Complete Profile & Continue"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return children;
}

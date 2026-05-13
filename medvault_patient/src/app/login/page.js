"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API delay
    setTimeout(() => {
      setIsLoading(false);
      // Redirect to dashboard (home page)
      router.push("/");
    }, 1200);
  };

  const handleOAuth = () => {
    setIsLoading(true);
    setTimeout(() => {
      router.push("/");
    }, 1200);
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
            <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>medical_services</span>
          </div>
          <h1 className="text-3xl font-black text-[#01261f] tracking-tight">Med-Vault</h1>
          <p className="text-[#01261f]/60 font-medium mt-1">Your secure digital health passport</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
          
          {/* Toggle */}
          <div className="flex p-1 bg-surface-container-low rounded-xl mb-8 relative">
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-in-out ${isLogin ? 'left-1' : 'left-[calc(50%+3px)]'}`}
            />
            <button 
              onClick={() => setIsLogin(true)} 
              className={`flex-1 py-2.5 text-sm font-bold z-10 transition-colors ${isLogin ? 'text-[#01261f]' : 'text-on-surface-variant'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => setIsLogin(false)} 
              className={`flex-1 py-2.5 text-sm font-bold z-10 transition-colors ${!isLogin ? 'text-[#01261f]' : 'text-on-surface-variant'}`}
            >
              Create Account
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {!isLogin && (
              <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 ml-1">Full Name</label>
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
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
              <input 
                type="email" 
                required
                placeholder="julian@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3.5 text-sm text-[#01261f] font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-[#01261f]/30" 
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1 mr-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Password</label>
                {isLogin && <a href="#" className="text-xs font-bold text-primary hover:underline">Forgot?</a>}
              </div>
              <input 
                type="password" 
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3.5 text-sm text-[#01261f] font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-[#01261f]/30" 
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-[#01261f] text-[#c9e165] font-bold text-sm py-4 rounded-xl mt-4 hover:bg-[#01261f]/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-[#01261f]/10 disabled:opacity-70"
            >
              {isLoading ? (
                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
              ) : (
                isLogin ? "Sign In to MedVault" : "Create MedVault"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6 opacity-60">
            <div className="flex-1 h-px bg-outline-variant"></div>
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">OR</span>
            <div className="flex-1 h-px bg-outline-variant"></div>
          </div>

          {/* Social Auth */}
          <div className="space-y-3">
            <button onClick={handleOAuth} disabled={isLoading} className="w-full bg-white border border-outline-variant rounded-xl py-3.5 flex items-center justify-center gap-3 hover:bg-surface-container-lowest transition-colors active:scale-[0.98]">
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
              <span className="text-sm font-bold text-[#01261f]">Continue with Google</span>
            </button>
            <button onClick={handleOAuth} disabled={isLoading} className="w-full bg-black text-white rounded-xl py-3.5 flex items-center justify-center gap-3 hover:bg-black/90 transition-colors active:scale-[0.98]">
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>apple</span>
              <span className="text-sm font-bold">Continue with Apple</span>
            </button>
          </div>

        </div>

        {/* Footer text */}
        <p className="text-center text-xs text-on-surface-variant mt-8 font-medium">
          By continuing, you agree to our <a href="#" className="underline hover:text-[#01261f]">Terms of Service</a> and <a href="#" className="underline hover:text-[#01261f]">Privacy Policy</a>.
        </p>

      </div>
    </div>
  );
}

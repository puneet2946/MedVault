"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';

export default function Health() {
  const { t } = useLanguage();
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // SOS State
  const [sosActive, setSosActive] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(5);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const audioCtxRef = useRef(null);
  const sosIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const stopSOS = useCallback(() => {
    setSosActive(false);
    setSosModalOpen(false);
    setSosCountdown(5);
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (sosIntervalRef.current) clearInterval(sosIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, []);

  const playSirenTick = useCallback((ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.linearRampToValueAtTime(440, now + 0.4);
    osc.frequency.linearRampToValueAtTime(880, now + 0.8);
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.85);
    osc.start(now);
    osc.stop(now + 0.9);
  }, []);

  const triggerSOS = useCallback(() => {
    if (sosActive) { stopSOS(); return; }
    setSosActive(true);
    setSosModalOpen(true);
    setSosCountdown(5);

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;
    playSirenTick(ctx);
    sosIntervalRef.current = setInterval(() => playSirenTick(ctx), 1000);

    let count = 5;
    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      setSosCountdown(count);
      if (count <= 0) {
        clearInterval(countdownIntervalRef.current);
        window.location.href = 'tel:112';
        stopSOS();
      }
    }, 1000);
  }, [sosActive, stopSOS, playSirenTick]);

  useEffect(() => () => stopSOS(), [stopSOS]);

  const fileInputRef = useRef(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setError("The file is too large. Please upload a report smaller than 20MB.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('Unsupported file type. Please upload a PDF or an Image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      // Simulate network request delay (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockResponse = {
        summary: "The Complete Blood Count (CBC) report shows normal parameters overall, with a slight elevation in eosinophils, suggesting a possible mild allergic reaction.",
        keyFindings: [
          "Hemoglobin levels are within the healthy range (14.2 g/dL).",
          "White Blood Cell (WBC) count is normal.",
          "Eosinophils are slightly elevated at 6% (Normal: 1-4%)."
        ],
        jargonBuster: [
          {
            term: "Hemoglobin",
            explanation: "A protein in your red blood cells that carries oxygen to your body's organs and tissues."
          },
          {
            term: "Eosinophils",
            explanation: "A type of disease-fighting white blood cell. High levels often indicate an allergic reaction or a minor infection."
          }
        ],
        nextSteps: "No immediate concern. Continue monitoring your health. If you experience allergy symptoms like sneezing or skin rashes, consult your general physician."
      };

      setAnalysisResult(mockResponse);
    } catch (err) {
      setError(err.message || 'Failed to analyze the report. Please try again.');
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsHeaderVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setIsHeaderVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <div className="bg-surface text-on-surface font-body antialiased min-h-screen relative overflow-x-hidden selection:bg-primary-fixed selection:text-on-primary-fixed pb-32">
      {/* Background Organic Flourish */}
      <div className="organic-line"></div>

      {/* SOS Modal Overlay */}
      {sosModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}>
          <div
            className="relative rounded-3xl p-8 flex flex-col items-center gap-5 shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #ff1744 0%, #b71c1c 100%)',
              minWidth: 300,
              animation: 'sosPulse 0.8s ease-in-out infinite alternate',
            }}
          >
            <style>{`
              @keyframes sosPulse { from { box-shadow: 0 0 0 0 rgba(255,23,68,0.6); } to { box-shadow: 0 0 60px 20px rgba(255,23,68,0.15); } }
              @keyframes sosRing { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }
            `}</style>
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center" style={{ animation: 'sosRing 0.8s ease-in-out infinite' }}>
              <span className="material-symbols-outlined text-white text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>emergency</span>
            </div>
            <h2 className="text-white text-3xl font-extrabold tracking-tight">SOS</h2>
            <p className="text-white/90 text-center text-base font-medium">Calling emergency services in</p>
            <div className="text-white text-7xl font-black tabular-nums" style={{ textShadow: '0 0 30px rgba(255,255,255,0.5)' }}>{sosCountdown}</div>
            <p className="text-white/70 text-sm text-center">Dialling <strong>112</strong> (Emergency)</p>
            <button
              onClick={stopSOS}
              className="mt-2 px-8 py-3 rounded-2xl bg-white text-red-700 font-extrabold text-base hover:bg-red-50 transition-colors active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* TopAppBar */}
      <header className={`bg-[#fafaf1]/80 backdrop-blur-md text-[#01261f] font-['Plus_Jakarta_Sans'] font-bold tracking-tight text-xl fixed top-0 z-50 flex justify-between items-center px-6 py-4 w-full transition-transform duration-300 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <span className="text-[#01261f] font-bold italic tracking-tighter">{t('nav_health')}</span>
        <div className="flex items-center gap-2">
          {/* SOS Button */}
          <button
            id="sos-btn-health"
            aria-label="SOS Emergency"
            onClick={triggerSOS}
            className="relative flex items-center justify-center rounded-full font-extrabold text-white transition-all active:scale-95"
            style={{
              width: 44,
              height: 44,
              background: sosActive
                ? 'linear-gradient(135deg,#ff1744,#b71c1c)'
                : 'linear-gradient(135deg,#ff1744,#d50000)',
              boxShadow: sosActive
                ? '0 0 0 4px rgba(255,23,68,0.35), 0 4px 20px rgba(255,23,68,0.5)'
                : '0 4px 14px rgba(213,0,0,0.45)',
              animation: sosActive ? 'sosPulse 0.8s ease-in-out infinite alternate' : 'none',
              fontSize: 13,
              letterSpacing: '0.04em',
            }}
          >
            SOS
          </button>
          <Link href="/profile" className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high border-2 border-surface flex items-center justify-center hover:opacity-80 transition-opacity">
            <span className="material-symbols-outlined text-on-surface-variant text-sm">person</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 px-6 relative z-10 max-w-7xl mx-auto flex flex-col gap-8">
        
        {/* Greeting */}
        <div className="pl-2">
          <h2 className="text-4xl font-bold tracking-[-0.02em] text-velvet mb-2">{t("he_insights")}</h2>
          <p className="text-on-surface-variant text-lg leading-relaxed">{t("he_insights_desc")}</p>
        </div>

        {/* {t("he_reports")} Hero */}
        <section className="relative">
          <div className="bg-surface-container-lowest rounded-xl p-8 ambient-shadow relative overflow-hidden group">
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-secondary-container/20 rounded-full blur-3xl group-hover:bg-secondary-container/30 transition-all duration-700"></div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
              <div>
                <h3 className="text-xl font-bold text-on-surface mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>folder_special</span>
                  Medical Reports
                </h3>
                <p className="text-on-surface-variant text-sm max-w-md">{t("he_reports_desc")}</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*,application/pdf" 
                onChange={handleFileUpload} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
                className="bg-velvet text-on-primary px-8 py-4 rounded-xl font-bold text-base hover:opacity-90 transition-opacity active:scale-95 duration-200 shadow-lg shadow-primary/20 flex items-center gap-3 disabled:opacity-50 disabled:active:scale-100"
              >
                {isAnalyzing ? (
                  <span className="material-symbols-outlined animate-spin">refresh</span>
                ) : (
                  <span className="material-symbols-outlined">upload_file</span>
                )}
                {isAnalyzing ? t("he_uploading") : t("he_upload")}
              </button>
            </div>

            {/* Recent Reports Scroll */}
            <div className="mt-8">
              <h4 className="text-xs font-bold uppercase tracking-[0.05em] text-on-surface-variant mb-4">{t("he_recent")}</h4>
              <div className="flex overflow-x-auto pb-4 gap-4 snap-x hide-scrollbar -mx-8 px-8">
                {/* Report Card 1 */}
                <div className="min-w-[280px] bg-surface-container-low rounded-xl p-5 border border-outline-variant/15 snap-center hover:bg-surface-container transition-colors cursor-pointer">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center ambient-shadow text-primary">
                      <span className="material-symbols-outlined">description</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary-container bg-primary-fixed px-2 py-1 rounded-md">New</span>
                  </div>
                  <h5 className="font-bold text-on-surface text-base mb-1">Blood Panel.pdf</h5>
                  <p className="text-on-surface-variant text-xs">Oct 24, 2023 • Lab Corp</p>
                </div>
                {/* Report Card 2 */}
                <div className="min-w-[280px] bg-surface-container-low rounded-xl p-5 border border-outline-variant/15 snap-center hover:bg-surface-container transition-colors cursor-pointer">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center ambient-shadow text-primary">
                      <span className="material-symbols-outlined">image</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant bg-surface-variant px-2 py-1 rounded-md">Reviewed</span>
                  </div>
                  <h5 className="font-bold text-on-surface text-base mb-1">MRI Scan.png</h5>
                  <p className="text-on-surface-variant text-xs">Sep 12, 2023 • Radiology Dept</p>
                </div>
                {/* Report Card 3 */}
                <div className="min-w-[280px] bg-surface-container-low rounded-xl p-5 border border-outline-variant/15 snap-center hover:bg-surface-container transition-colors cursor-pointer">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center ambient-shadow text-primary">
                      <span className="material-symbols-outlined">clinical_notes</span>
                    </div>
                  </div>
                  <h5 className="font-bold text-on-surface text-base mb-1">Consultation Notes.pdf</h5>
                  <p className="text-on-surface-variant text-xs">Aug 05, 2023 • Dr. Smith</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI Analysis Result */}
        {(isAnalyzing || analysisResult || error) && (
          <section className="mb-12">
            <div className="bg-surface-container-lowest rounded-xl p-8 ambient-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/10 rounded-bl-full -mr-16 -mt-16 blur-2xl"></div>
              
              <h3 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-2 relative z-10">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                {t("he_ai_report")}
              </h3>

              {isAnalyzing && (
                <div className="animate-pulse flex flex-col gap-4 relative z-10">
                  <div className="h-4 bg-surface-container-high rounded w-3/4"></div>
                  <div className="h-4 bg-surface-container-high rounded w-full"></div>
                  <div className="h-4 bg-surface-container-high rounded w-5/6"></div>
                  <div className="mt-4 h-8 bg-surface-container-high rounded w-1/3"></div>
                </div>
              )}

              {error && (
                <div className="bg-error-container text-on-error-container p-4 rounded-lg flex items-start gap-3 relative z-10">
                   <span className="material-symbols-outlined shrink-0 mt-0.5">error</span>
                   <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              {analysisResult && (
                <div className="space-y-6 relative z-10">
                  <div className="bg-primary/5 p-5 rounded-xl border border-primary/10">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-primary mb-2">Summary</h4>
                    <p className="text-on-surface-variant text-[15px] leading-relaxed">{analysisResult.summary}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
                        Key Findings
                      </h4>
                      <ul className="space-y-3">
                        {analysisResult.keyFindings?.map((finding, idx) => (
                          <li key={idx} className="flex gap-3 text-sm text-on-surface-variant bg-surface-container-low p-3 rounded-lg">
                            <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0 mt-1.5"></span>
                            <span>{finding}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-lg">menu_book</span>
                        Jargon Buster
                      </h4>
                      <div className="space-y-3">
                        {analysisResult.jargonBuster?.map((item, idx) => (
                          <div key={idx} className="bg-surface-container-low p-3 rounded-lg text-sm">
                            <span className="font-bold text-on-surface block mb-1">{item.term}</span>
                            <span className="text-on-surface-variant block">{item.explanation}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-secondary-container/20 p-5 rounded-xl border border-secondary-container/30 flex gap-4 items-start mt-4">
                    <span className="material-symbols-outlined text-secondary shrink-0 mt-0.5">medical_information</span>
                    <div>
                      <h4 className="text-sm font-bold text-on-surface mb-1">Recommended Next Steps</h4>
                      <p className="text-on-surface-variant text-sm">{analysisResult.nextSteps}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* {t("he_sync")} Dashboard */}
        <section>
          <div className="mb-6 pl-2 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">watch</span>
                Live Sync
              </h3>
              <p className="text-on-surface-variant text-sm mt-1">{t("he_sync_desc")}</p>
            </div>
            <button className="text-primary font-bold text-sm hover:opacity-80 transition-opacity flex items-center gap-1">
              {t("he_manage")} <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* {t("he_hr")} */}
            <div className="bg-surface-container-lowest rounded-xl p-6 ambient-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-error-container/20 rounded-bl-full -mr-16 -mt-16 blur-2xl"></div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <h4 className="text-xs font-bold uppercase tracking-[0.05em] text-on-surface-variant">Heart Rate</h4>
                <span className="material-symbols-outlined text-[#ba1a1a]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
              </div>
              <div className="flex items-end gap-2 relative z-10">
                <span className="text-4xl font-bold tracking-tight text-on-surface">72</span>
                <span className="text-sm text-on-surface-variant font-medium mb-1">bpm</span>
              </div>
              <div className="mt-4 h-8 flex items-end gap-1 opacity-60">
                <div className="w-1 bg-error rounded-t-sm h-2"></div>
                <div className="w-1 bg-error rounded-t-sm h-4"></div>
                <div className="w-1 bg-error rounded-t-sm h-3"></div>
                <div className="w-1 bg-error rounded-t-sm h-6"></div>
                <div className="w-1 bg-error rounded-t-sm h-8"></div>
                <div className="w-1 bg-error rounded-t-sm h-5"></div>
                <div className="w-1 bg-error rounded-t-sm h-3"></div>
                <div className="w-1 bg-error rounded-t-sm h-4"></div>
                <div className="w-1 bg-error rounded-t-sm h-2"></div>
              </div>
            </div>

            {/* {t("he_steps")} */}
            <div className="bg-surface-container-lowest rounded-xl p-6 ambient-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/10 rounded-bl-full -mr-16 -mt-16 blur-2xl"></div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <h4 className="text-xs font-bold uppercase tracking-[0.05em] text-on-surface-variant">Daily Steps</h4>
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>directions_walk</span>
              </div>
              <div className="flex items-end gap-2 relative z-10">
                <span className="text-4xl font-bold tracking-tight text-on-surface">8,432</span>
                <span className="text-sm text-on-surface-variant font-medium mb-1">/ 10k</span>
              </div>
              <div className="mt-6 h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full bg-velvet rounded-full" style={{ width: '84%' }}></div>
              </div>
            </div>

            {/* {t("he_sleep")} */}
            <div className="bg-surface-container-lowest rounded-xl p-6 ambient-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-container/20 rounded-bl-full -mr-16 -mt-16 blur-2xl"></div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <h4 className="text-xs font-bold uppercase tracking-[0.05em] text-on-surface-variant">Sleep Quality</h4>
                <span className="material-symbols-outlined text-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>bedtime</span>
              </div>
              <div className="flex items-end gap-2 relative z-10">
                <span className="text-4xl font-bold tracking-tight text-on-surface">7h 12m</span>
              </div>
              <p className="text-xs text-on-surface-variant mt-4 font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-primary">trending_up</span>
                +45m vs last week
              </p>
            </div>

            {/* Oxygen Levels */}
            <div className="bg-surface-container-lowest rounded-xl p-6 ambient-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-inverse-primary/30 rounded-bl-full -mr-16 -mt-16 blur-2xl"></div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <h4 className="text-xs font-bold uppercase tracking-[0.05em] text-on-surface-variant">{t("he_o2")}</h4>
                <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>air</span>
              </div>
              <div className="flex items-end gap-2 relative z-10">
                <span className="text-4xl font-bold tracking-tight text-on-surface">98</span>
                <span className="text-sm text-on-surface-variant font-medium mb-1">%</span>
              </div>
              <p className="text-xs text-on-surface-variant mt-4 font-medium px-3 py-1 bg-surface-container-low rounded-md inline-block">
                {t("he_optimal")}
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* BottomNavBar */}
      <nav className="bg-[#fafaf1]/80 backdrop-blur-xl text-[#01261f] font-['Plus_Jakarta_Sans'] text-[11px] font-bold uppercase tracking-widest fixed bottom-0 left-0 w-full rounded-t-[2.5rem] z-50 no-border shadow-[0_-4px_40px_rgba(26,28,23,0.05)] hover:text-[#01261f] transition-colors flex justify-around items-center px-8 pb-8 pt-4">
        {/* Inactive Tab: Home */}
        <Link className="flex flex-col items-center justify-center text-[#1a1c17]/40 group hover:text-primary transition-colors" href="/home">
          <span className="material-symbols-outlined text-2xl mb-1">home_health</span>
          <span>{t('nav_home')}</span>
        </Link>

        {/* Inactive Tab: Vault */}
        <Link className="flex flex-col items-center justify-center text-[#1a1c17]/40 group hover:text-primary transition-colors" href="/vault">
          <span className="material-symbols-outlined text-2xl mb-1">folder_open</span>
          <span>{t('nav_records')}</span>
        </Link>

        {/* Inactive Tab: Tracker */}
        <Link className="flex flex-col items-center justify-center text-[#1a1c17]/40 group hover:text-primary transition-colors" href="/tracker">
          <span className="material-symbols-outlined text-2xl mb-1">event_note</span>
          <span>{t('nav_tracker')}</span>
        </Link>

        {/* Active Tab: Health */}
        <Link className="flex flex-col items-center justify-center text-[#01261f] relative after:content-[''] after:absolute after:-bottom-1 after:w-1 after:h-1 after:bg-[#f6e232] after:rounded-full group" href="/health">
          <span className="material-symbols-outlined text-2xl mb-1" style={{ fontVariationSettings: '"FILL" 1' }}>vital_signs</span>
          <span>{t('nav_health')}</span>
        </Link>
      </nav>
    </div>
  );
}

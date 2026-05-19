"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';

export default function Tracker() {
  const { t } = useLanguage();
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Medication Tracker State
  const [med1Taken, setMed1Taken] = useState(true);
  const [med2Taken, setMed2Taken] = useState(false);

  // Scanning State
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [showScanOptions, setShowScanOptions] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Camera State
  const videoRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState(null);

  const handleScanClick = () => {
    setShowScanOptions(true);
  };

  const openCamera = async () => {
    setShowScanOptions(false);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(mediaStream);
      setIsCameraActive(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      // Fallback to input if camera fails
      cameraInputRef.current?.click();
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    closeCamera();
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    }, 3000);
  };

  // Ensure video stream connects
  useEffect(() => {
    if (isCameraActive && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [isCameraActive, stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const openGallery = () => {
    setShowScanOptions(false);
    galleryInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsAnalyzing(true);
      // Simulate AI processing time
      setTimeout(() => {
        setIsAnalyzing(false);
        setShowSuccess(true);
        // Auto-hide success message
        setTimeout(() => setShowSuccess(false), 2500);
      }, 3000);
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
    <div className="bg-surface text-on-surface font-body antialiased min-h-screen relative overflow-x-hidden selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Decorative Organic Background Lines */}
      <svg className="absolute z-0 pointer-events-none opacity-40 text-primary-fixed-dim top-0 right-0 w-[300px] h-[300px] -translate-y-12 translate-x-12" fill="none" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <path d="M 200 0 C 150 50, 50 20, 20 100 C -10 180, 80 180, 100 250" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2"></path>
      </svg>
      <svg className="absolute z-0 pointer-events-none opacity-40 text-primary-fixed-dim top-[40%] left-0 w-[250px] h-[400px] -translate-x-16" fill="none" viewBox="0 0 200 400" xmlns="http://www.w3.org/2000/svg">
        <path d="M -50 50 C 50 100, 100 200, 50 300 C 0 400, 150 350, 200 450" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5"></path>
      </svg>

      {/* TopAppBar */}
      <header className={`bg-[#fafaf1]/80 backdrop-blur-md text-[#01261f] font-['Plus_Jakarta_Sans'] font-bold tracking-tight text-xl fixed top-0 z-50 flex justify-between items-center px-6 py-4 w-full transition-transform duration-300 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <span className="text-[#01261f] font-bold italic tracking-tighter">{t('tr_title')}</span>
        <Link href="/profile" className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high border-2 border-surface flex items-center justify-center hover:opacity-80 transition-opacity">
          <span className="material-symbols-outlined text-on-surface-variant text-sm">person</span>
        </Link>
      </header>

      {/* Main Content Canvas */}
      <main className="pt-[104px] pb-[120px] px-6 max-w-2xl mx-auto relative z-10 flex flex-col gap-8">
        


        {/* Section 1: Scan Prescription (Bento/Card Style) */}
        <section>
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            ref={cameraInputRef}
            onChange={handleFileChange}
            className="hidden" 
          />
          <input 
            type="file" 
            accept="image/*" 
            ref={galleryInputRef}
            onChange={handleFileChange}
            className="hidden" 
          />
          <button 
            onClick={handleScanClick}
            className="w-full relative overflow-hidden bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-[1.5rem] p-6 flex flex-col items-start justify-between min-h-[140px] shadow-[0_20px_40px_-15px_rgba(26,28,23,0.15)] group active:scale-[0.98] transition-transform duration-300"
          >
            {/* Decorative element inside card */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-fixed/10 rounded-bl-[100%] pointer-events-none"></div>
            <div className="w-12 h-12 rounded-full bg-surface/10 backdrop-blur-sm flex items-center justify-center mb-4 border border-on-primary/10">
              <span className="material-symbols-outlined text-secondary-container text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>document_scanner</span>
            </div>
            <div className="text-left z-10">
              <h3 className="font-display text-[1.25rem] font-bold tracking-tight">{t('tr_scan_title')}</h3>
              <p className="text-on-primary/80 text-sm mt-1 font-medium">{t('tr_scan_desc')}</p>
            </div>
          </button>
        </section>

        {/* Section 2: Today's Schedule */}
        <section className="bg-surface-container-low rounded-[1.5rem] p-6 relative">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-[1.5rem] font-bold text-on-surface tracking-tight">{t('tr_schedule')}</h2>
            <span className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant bg-surface-container-high px-3 py-1 rounded-full">{t('tr_left')}</span>
          </div>
          <div className="flex flex-col gap-4">
            
            {/* Medication Item 1 - Lisinopril */}
            <div className="bg-surface-container-lowest rounded-[1rem] p-4 flex items-center justify-between shadow-[0_4px_20px_rgba(26,28,23,0.03)]">
              <div className={`flex items-center gap-4 transition-opacity ${med1Taken ? 'opacity-80' : 'opacity-100'}`}>
                <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-outline-variant" style={{ fontVariationSettings: "'FILL' 1" }}>medication</span>
                </div>
                <div>
                  <h4 className={`font-display font-bold text-[1.125rem] transition-all ${med1Taken ? 'text-outline line-through decoration-outline/50' : 'text-on-surface'}`}>{t('h_med1_name')}</h4>
                  <p className="text-sm text-on-surface-variant font-medium mt-0.5">{t('h_med1_desc')}</p>
                </div>
              </div>
              <button 
                onClick={() => setMed1Taken(!med1Taken)}
                className={`w-8 h-8 rounded-full border-[2px] flex items-center justify-center shrink-0 transition-colors ${med1Taken ? 'border-[#01261f] bg-[#01261f] text-white' : 'border-outline-variant bg-transparent hover:border-[#01261f]'}`}
              >
                {med1Taken && <span className="material-symbols-outlined font-bold text-[20px]">check</span>}
              </button>
            </div>

            {/* Medication Item 2 - Vitamin D3 */}
            <div className="bg-surface-container-lowest rounded-[1rem] p-4 flex items-center justify-between shadow-[0_4px_20px_rgba(26,28,23,0.03)]">
              <div className={`flex items-center gap-4 transition-opacity ${med2Taken ? 'opacity-80' : 'opacity-100'}`}>
                <div className="w-12 h-12 rounded-full bg-[#fef8db] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#695f00]" style={{ fontVariationSettings: "'FILL' 1" }}>medication_liquid</span>
                </div>
                <div>
                  <h4 className={`font-display font-bold text-[1.125rem] transition-all ${med2Taken ? 'text-outline line-through decoration-outline/50' : 'text-on-surface'}`}>{t('h_med2_name')}</h4>
                  <p className="text-sm text-on-surface-variant font-medium mt-0.5">{t('h_med2_desc')}</p>
                </div>
              </div>
              <button 
                onClick={() => setMed2Taken(!med2Taken)}
                className={`w-8 h-8 rounded-full border-[2px] flex items-center justify-center shrink-0 transition-colors ${med2Taken ? 'border-[#01261f] bg-[#01261f] text-white' : 'border-outline-variant bg-transparent hover:border-[#01261f]'}`}
              >
                {med2Taken && <span className="material-symbols-outlined font-bold text-[20px]">check</span>}
              </button>
            </div>
            
          </div>
        </section>

        {/* Section 3: Upcoming Reminders */}
        <section className="mt-2">
          <h2 className="font-display text-[1.125rem] font-bold text-on-surface tracking-tight mb-4 px-2">{t('tr_upcoming')}</h2>
          <div className="flex flex-col gap-0 relative">
            {/* Timeline line */}
            <div className="absolute left-[11px] top-4 bottom-4 w-[2px] bg-surface-container-high rounded-full z-0"></div>
            
            {/* Reminder Item 1 */}
            <div className="flex gap-4 relative z-10 py-3">
              <div className="w-6 h-6 rounded-full bg-surface border-[2px] border-surface-container-high flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-outline-variant"></div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-baseline">
                  <h4 className="font-bold text-on-surface">{t("tr_med3_name")}</h4>
                  <span className="text-xs font-semibold text-on-surface-variant tracking-wider uppercase">{t("tr_med3_time")}</span>
                </div>
                <p className="text-sm text-on-surface-variant">{t("tr_med3_desc")}</p>
              </div>
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

        {/* Active Tab: Tracker */}
        <Link className="flex flex-col items-center justify-center text-[#01261f] relative after:content-[''] after:absolute after:-bottom-1 after:w-1 after:h-1 after:bg-[#f6e232] after:rounded-full group" href="/tracker">
          <span className="material-symbols-outlined text-2xl mb-1" style={{ fontVariationSettings: '"FILL" 1' }}>event_note</span>
          <span>{t('nav_tracker')}</span>
        </Link>

        {/* Inactive Tab: Health */}
        <Link className="flex flex-col items-center justify-center text-[#1a1c17]/40 group hover:text-primary transition-colors" href="/health">
          <span className="material-symbols-outlined text-2xl mb-1">vital_signs</span>
          <span>{t('nav_health')}</span>
        </Link>
      </nav>

      {/* Scan Options Modal */}
      {showScanOptions && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-[#01261f]/80 backdrop-blur-sm transition-opacity" onClick={() => setShowScanOptions(false)}>
          <div className="bg-[#fafaf1] rounded-t-3xl p-6 w-full animate-in slide-in-from-bottom-full duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#01261f] tracking-tight">Add Prescription</h3>
              <button onClick={() => setShowScanOptions(false)} className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-surface-variant transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant text-sm">close</span>
              </button>
            </div>
            <div className="flex flex-col gap-4 pb-6">
              <button onClick={openCamera} className="w-full bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant/30 text-[#01261f] font-bold py-4 px-6 rounded-2xl flex items-center gap-4 transition-all active:scale-[0.98] shadow-sm">
                <div className="w-10 h-10 rounded-full bg-primary-fixed/30 flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined">photo_camera</span>
                </div>
                <div className="text-left flex-1">
                  <p className="text-base font-bold">Open Camera</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Take a clear photo of the prescription</p>
                </div>
              </button>
              <button onClick={openGallery} className="w-full bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant/30 text-[#01261f] font-bold py-4 px-6 rounded-2xl flex items-center gap-4 transition-all active:scale-[0.98] shadow-sm">
                <div className="w-10 h-10 rounded-full bg-secondary-container/50 flex items-center justify-center text-secondary shrink-0">
                  <span className="material-symbols-outlined">photo_library</span>
                </div>
                <div className="text-left flex-1">
                  <p className="text-base font-bold">Upload from Gallery</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Choose an existing image or document</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scanning / Analyzing Overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#01261f]/80 backdrop-blur-md transition-opacity">
          <div className="bg-[#fafaf1] rounded-[2rem] p-8 flex flex-col items-center shadow-2xl w-[280px] animate-in zoom-in-95 duration-300">
            <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="material-symbols-outlined text-primary text-3xl animate-pulse">document_scanner</span>
            </div>
            <h3 className="text-xl font-bold text-[#01261f] tracking-tight">Analyzing...</h3>
            <p className="text-sm text-on-surface-variant text-center mt-2 font-medium">Extracting medications from your prescription using AI.</p>
          </div>
        </div>
      )}

      {/* Success Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#01261f]/80 backdrop-blur-md transition-opacity">
          <div className="bg-[#fafaf1] rounded-[2rem] p-8 flex flex-col items-center shadow-2xl w-[280px] animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-[#c9e165] rounded-full flex items-center justify-center mb-6 shadow-lg shadow-[#c9e165]/30">
              <span className="material-symbols-outlined text-[#01261f] text-4xl font-bold">check</span>
            </div>
            <h3 className="text-xl font-bold text-[#01261f] tracking-tight">Success!</h3>
            <p className="text-sm text-on-surface-variant text-center mt-2 font-medium">Prescription added to your tracker schedule.</p>
          </div>
        </div>
      )}

      {/* Live Camera View */}
      {isCameraActive && (
        <div className="fixed inset-0 z-[120] bg-black flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="absolute top-8 left-6 right-6 flex justify-between items-center z-10">
            <button onClick={closeCamera} className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white border border-white/20 active:scale-95 transition-transform">
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="px-4 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-white text-xs font-bold uppercase tracking-widest border border-white/20">
              Scan Prescription
            </div>
            <div className="w-10 h-10"></div>
          </div>
          
          <video 
            ref={videoRef}
            autoPlay 
            playsInline 
            muted
            className="w-full h-full object-cover"
          />

          {/* Scanner Guide Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-[85%] h-[65%] border-2 border-primary/80 rounded-2xl relative shadow-[0_0_0_4000px_rgba(0,0,0,0.6)]">
              {/* Corner markers */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-xl"></div>
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-xl"></div>
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-xl"></div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-xl"></div>
            </div>
          </div>

          <div className="absolute bottom-12 left-0 right-0 flex justify-center z-10">
            <button 
              onClick={capturePhoto} 
              className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-4 border-white active:scale-90 transition-transform"
            >
              <div className="w-14 h-14 rounded-full bg-white"></div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

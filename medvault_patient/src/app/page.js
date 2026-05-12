"use client";

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function Home() {
  const { t } = useLanguage();
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  // Medication Tracker State
  const [med1Taken, setMed1Taken] = useState(true);
  const [med2Taken, setMed2Taken] = useState(false);

  // SOS State
  const [sosActive, setSosActive] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(5);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const cameraRef = useRef(null);
  const fileRef = useRef(null);

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadMenuOpen(false);
    setToastMessage("Encrypting and saving " + file.name + "...");
    setTimeout(() => {
      setToastMessage("Successfully saved to Vault!");
      setTimeout(() => setToastMessage(""), 3500);
    }, 2500);
  };

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

    // Start audio
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;
    playSirenTick(ctx);
    sosIntervalRef.current = setInterval(() => playSirenTick(ctx), 1000);

    // Countdown then call
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
    <>
            {/* Hidden Inputs for Upload */}
      <input type="file" accept="image/*" capture="environment" hidden ref={cameraRef} onChange={handleFileSelected} />
      <input type="file" accept="image/*,application/pdf" hidden ref={fileRef} onChange={handleFileSelected} />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[110] bg-inverse-surface text-inverse-on-surface px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          <span className="text-sm font-medium whitespace-nowrap">{toastMessage}</span>
        </div>
      )}

      {/* Upload Bottom Sheet */}
      {uploadMenuOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
          style={{ background: 'rgba(1,38,31,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={() => setUploadMenuOpen(false)}
        >
          <div 
            className="w-full sm:w-96 bg-surface-container-lowest rounded-t-[2rem] sm:rounded-[2rem] p-6 pb-12 sm:pb-6 shadow-2xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-outline-variant/50 rounded-full mx-auto mb-6 sm:hidden"></div>
            <h3 className="text-xl font-bold text-on-surface mb-2">Upload Document</h3>
            <p className="text-sm text-on-surface-variant mb-6">Choose how you want to add your medical record to the vault.</p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => cameraRef.current?.click()}
                className="w-full bg-primary text-on-primary rounded-2xl p-4 flex items-center gap-4 hover:opacity-90 transition-opacity active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-full bg-on-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined">photo_camera</span>
                </div>
                <div className="text-left">
                  <div className="font-bold">Take Photo</div>
                  <div className="text-xs text-on-primary/80">Scan document with camera</div>
                </div>
              </button>
              
              <button 
                onClick={() => fileRef.current?.click()}
                className="w-full bg-surface-container-highest text-on-surface rounded-2xl p-4 flex items-center gap-4 hover:bg-surface-variant transition-colors active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center">
                  <span className="material-symbols-outlined">folder</span>
                </div>
                <div className="text-left">
                  <div className="font-bold">Choose File</div>
                  <div className="text-xs text-on-surface-variant">Upload PDF or Image from device</div>
                </div>
              </button>
            </div>
            
            <button 
              onClick={() => setUploadMenuOpen(false)}
              className="mt-6 w-full py-3 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* TopAppBar */}
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

      <header className={`bg-[#fafaf1]/80 backdrop-blur-md text-[#01261f] font-['Plus_Jakarta_Sans'] font-bold tracking-tight text-xl fixed top-0 z-50 flex justify-between items-center px-6 py-4 w-full transition-transform duration-300 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <button aria-label="Menu" className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-variant transition-colors">
          <span className="material-symbols-outlined text-primary">menu</span>
        </button>
        <span className="text-[#01261f] font-bold italic tracking-tighter -ml-8">{t('h_title')}</span>
        <div className="flex items-center gap-2">
          {/* SOS Button */}
          <button
            id="sos-btn-home"
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
            <style>{`@keyframes sosPulse { from { box-shadow: 0 0 0 4px rgba(255,23,68,0.35),0 4px 20px rgba(255,23,68,0.5); } to { box-shadow: 0 0 0 8px rgba(255,23,68,0.15),0 4px 30px rgba(255,23,68,0.6); } }`}</style>
            SOS
          </button>
          <Link href="/profile" className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high border-2 border-surface flex items-center justify-center hover:opacity-80 transition-opacity">
            <span className="material-symbols-outlined text-on-surface-variant text-sm">person</span>
          </Link>
        </div>
      </header>

      <main className="px-6 pt-24 pb-24 max-w-4xl mx-auto space-y-12">
        {/* Greeting */}
        <section className="pt-8 pb-4 mb-12 relative">
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-secondary-fixed/20 rounded-full blur-3xl -z-10"></div>
          <h1 className="leading-none tracking-[-0.02em] font-extrabold text-on-surface mb-2 text-[3.5rem]">
            {t('h_greeting')} <br /> <span className="text-primary italic font-serif font-medium relative z-10">Julian.</span>
          </h1>
          <p className="text-lg text-on-surface-variant max-w-md leading-relaxed mt-4">
            {t('h_sub_greeting')}
          </p>
        </section>

        {/* Dashboard Grid */}
        <section className="grid grid-cols-2 gap-4">
          {/* Upload New Tile */}
          <button onClick={() => setUploadMenuOpen(true)} className="bg-secondary-container rounded-xl p-6 flex flex-col justify-between items-start aspect-square relative overflow-hidden group hover:opacity-90 transition-opacity active:scale-[0.98]">
            <div className="bg-surface/30 p-3 rounded-full mb-4">
              <span className="material-symbols-outlined text-on-secondary-container text-3xl">upload_file</span>
            </div>
            <div className="text-left mt-auto z-10">
              <h3 className="text-lg font-bold text-on-secondary-container">{t('h_upload_new')}</h3>
              <p className="text-sm text-on-secondary-container/80 mt-1">{t('h_upload_desc')}</p>
            </div>
            {/* Organic shape */}
            <svg className="absolute top-[-20%] right-[-20%] w-[120%] h-[120%] text-white/20 -z-0 pointer-events-none" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <path d="M42.7,-73.4C55.9,-65.8,67.6,-54.6,76.5,-41.4C85.4,-28.1,91.4,-14.1,89.6,-0.9C87.8,12.3,78.2,24.6,68.8,36.1C59.5,47.7,50.3,58.4,38.8,65.8C27.3,73.1,13.7,77,-0.5,77.8C-14.7,78.6,-29.4,76.4,-42.6,69.9C-55.8,63.4,-67.5,52.5,-75.7,39.6C-83.9,26.7,-88.7,11.8,-86.6,-2.3C-84.5,-16.4,-75.5,-29.7,-65.4,-41.1C-55.4,-52.5,-44.3,-62,-31.6,-68.8C-18.9,-75.6,-4.5,-79.8,9.7,-78.9C23.9,-78.1,42.7,-73.4,42.7,-73.4Z" fill="currentColor" transform="translate(100 100)"></path>
            </svg>
          </button>

          {/* View Vault Tile */}
          <Link href="/vault" className="bg-primary-container rounded-xl p-6 flex flex-col justify-between items-start aspect-square relative overflow-hidden group hover:opacity-90 transition-opacity block w-full text-left">
            <div className="bg-surface/20 p-3 rounded-full mb-4">
              <span className="material-symbols-outlined text-on-primary-container text-3xl">folder_open</span>
            </div>
            <div className="text-left mt-auto z-10">
              <h3 className="text-lg font-bold text-on-primary">{t('h_view_vault')}</h3>
              <p className="text-sm text-on-primary-container mt-1">{t('h_view_desc')}</p>
            </div>
            {/* Organic shape */}
            <svg className="absolute bottom-[-10%] left-[-10%] w-[100%] h-[100%] text-white/5 -z-0 pointer-events-none" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <path d="M37.8,-63.9C52.7,-53.4,71.2,-48.5,82.4,-36.8C93.6,-25.1,97.5,-6.6,92.5,9.7C87.5,25.9,73.6,40,60.1,51.8C46.6,63.6,33.5,73.1,18.5,77.5C3.6,81.9,-13.2,81.2,-27.1,75.1C-41.1,69,-52.1,57.5,-63.2,44.9C-74.3,32.3,-85.4,18.7,-88.4,3.7C-91.5,-11.3,-86.5,-27.7,-76.3,-40.5C-66.2,-53.3,-50.9,-62.5,-35.8,-72.6C-20.6,-82.7,-5.7,-93.8,6.8,-92.4C19.3,-91.1,37.8,-63.9,37.8,-63.9Z" fill="currentColor" transform="translate(100 100)"></path>
            </svg>
          </Link>
        </section>

        {/* Medicine Tracker */}
        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <h2 className="text-[1.125rem] font-medium text-on-surface">{t('h_med_tracker')}</h2>
            <Link href="/tracker" className="text-sm font-bold text-primary hover:opacity-80 transition-opacity">{t('h_view_all')}</Link>
          </div>
          <div className="space-y-3">
            {/* Med 1 */}
            <div className={`rounded-xl p-4 shadow-[0_4px_20px_rgba(26,28,23,0.02)] flex items-center justify-between transition-colors ${med1Taken ? 'bg-surface-container-lowest/60' : 'bg-surface-container-lowest'}`}>
              <div className={`flex items-center gap-4 transition-opacity ${med1Taken ? 'opacity-60' : 'opacity-100'}`}>
                <div className="bg-primary/10 p-2 rounded-full">
                  <span className="material-symbols-outlined text-primary">medication</span>
                </div>
                <div>
                  <h3 className={`font-bold transition-all ${med1Taken ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>{t('h_med1_name')}</h3>
                  <p className="text-sm text-on-surface-variant">{t('h_med1_desc')}</p>
                </div>
              </div>
              <button 
                onClick={() => setMed1Taken(!med1Taken)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${med1Taken ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant bg-transparent hover:border-primary'}`}
              >
                {med1Taken && <span className="material-symbols-outlined text-[14px]">check</span>}
              </button>
            </div>

            {/* Med 2 */}
            <div className={`rounded-xl p-4 shadow-[0_4px_20px_rgba(26,28,23,0.02)] flex items-center justify-between transition-colors ${med2Taken ? 'bg-surface-container-lowest/60' : 'bg-surface-container-lowest'}`}>
              <div className={`flex items-center gap-4 transition-opacity ${med2Taken ? 'opacity-60' : 'opacity-100'}`}>
                <div className="bg-secondary-container/20 p-2 rounded-full">
                  <span className="material-symbols-outlined text-secondary">medication_liquid</span>
                </div>
                <div>
                  <h3 className={`font-bold transition-all ${med2Taken ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>{t('h_med2_name')}</h3>
                  <p className="text-sm text-on-surface-variant">{t('h_med2_desc')}</p>
                </div>
              </div>
              <button 
                onClick={() => setMed2Taken(!med2Taken)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${med2Taken ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant bg-transparent hover:border-primary'}`}
              >
                {med2Taken && <span className="material-symbols-outlined text-[14px]">check</span>}
              </button>
            </div>
          </div>
        </section>

        {/* Horizontal Scroll - Next Visit */}
        <section className="space-y-4">
          <h2 className="text-[1.125rem] font-medium text-on-surface">{t('h_next_visit')}</h2>
          <div className="flex overflow-x-auto gap-4 pb-4 -mx-6 px-6 snap-x hide-scrollbar">
            {/* Card 1 */}
            <div className="min-w-[280px] bg-surface-container-lowest rounded-xl p-6 shadow-[0_4px_20px_rgba(26,28,23,0.02)] snap-center relative overflow-hidden flex flex-col justify-between min-h-[160px]">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-surface-container-low p-2 rounded-full">
                  <span className="material-symbols-outlined text-primary">calendar_month</span>
                </div>
                <span className="text-[0.6875rem] uppercase tracking-[0.05em] font-bold text-on-surface-variant">{t('h_visit1_tag')}</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface">{t('h_visit1_title')}</h3>
                <p className="text-sm text-on-surface-variant mt-1">{t('h_visit1_desc')}</p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="min-w-[280px] bg-surface-container-low rounded-xl p-6 shadow-[0_4px_20px_rgba(26,28,23,0.02)] snap-center relative overflow-hidden flex flex-col justify-between min-h-[160px]">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-surface p-2 rounded-full">
                  <span className="material-symbols-outlined text-primary">science</span>
                </div>
                <span className="text-[0.6875rem] uppercase tracking-[0.05em] font-bold text-on-surface-variant">{t('h_visit2_tag')}</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface">{t('h_visit2_title')}</h3>
                <p className="text-sm text-on-surface-variant mt-1">{t('h_visit2_desc')}</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* BottomNavBar */}
      <nav className="bg-[#fafaf1]/80 backdrop-blur-xl text-[#01261f] font-['Plus_Jakarta_Sans'] text-[11px] font-bold uppercase tracking-widest fixed bottom-0 left-0 w-full rounded-t-[2.5rem] z-50 no-border shadow-[0_-4px_40px_rgba(26,28,23,0.05)] hover:text-[#01261f] transition-colors flex justify-around items-center px-8 pb-8 pt-4">
        {/* Active Tab: Home */}
        <Link className="flex flex-col items-center justify-center text-[#01261f] relative after:content-[''] after:absolute after:-bottom-1 after:w-1 after:h-1 after:bg-[#f6e232] after:rounded-full group" href="/">
          <span className="material-symbols-outlined text-2xl mb-1" style={{ fontVariationSettings: '"FILL" 1' }}>home_health</span>
          <span>{t('nav_home')}</span>
        </Link>

        {/* Inactive Tabs */}
        <Link className="flex flex-col items-center justify-center text-[#1a1c17]/40 group hover:text-primary transition-colors" href="/vault">
          <span className="material-symbols-outlined text-2xl mb-1">folder_open</span>
          <span>{t('nav_records')}</span>
        </Link>
        <Link className="flex flex-col items-center justify-center text-[#1a1c17]/40 group hover:text-primary transition-colors" href="/tracker">
          <span className="material-symbols-outlined text-2xl mb-1">event_note</span>
          <span>{t('nav_tracker')}</span>
        </Link>
        <Link className="flex flex-col items-center justify-center text-[#1a1c17]/40 group hover:text-primary transition-colors" href="/health">
          <span className="material-symbols-outlined text-2xl mb-1">vital_signs</span>
          <span>{t('nav_health')}</span>
        </Link>
      </nav>
    </>
  );
}

"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';

export default function Vault() {
  const { t } = useLanguage();
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

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
    <div className="antialiased min-h-screen relative overflow-x-hidden">
      {/* Ambient Background */}
      <div className="fixed top-[-20vh] right-[-10vw] w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(circle,var(--color-primary-fixed)_0%,transparent_70%)] opacity-15 z-0 pointer-events-none"></div>
      <div className="fixed bottom-[10vh] left-[-20vw] w-[80vw] h-[60vw] rounded-full bg-[radial-gradient(circle,var(--color-secondary-container)_0%,transparent_70%)] opacity-5 z-0 pointer-events-none"></div>

      {/* TopAppBar */}
      <header className={`bg-[#fafaf1]/80 backdrop-blur-md text-[#01261f] font-['Plus_Jakarta_Sans'] font-bold tracking-tight text-xl fixed top-0 z-50 flex justify-between items-center px-6 py-4 w-full transition-transform duration-300 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <button aria-label="Menu" className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-variant transition-colors">
          <span className="material-symbols-outlined text-primary">menu</span>
        </button>
        <span className="text-[#01261f] font-bold italic tracking-tighter -ml-8">{t('v_title')}</span>
        <Link href="/profile" className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high border-2 border-surface flex items-center justify-center hover:opacity-80 transition-opacity">
          <span className="material-symbols-outlined text-on-surface-variant text-sm">person</span>
        </Link>
      </header>

      {/* Main Content Canvas */}
      <main className="relative z-10 pt-28 pb-32 px-4 md:px-8 max-w-3xl mx-auto">
        {/* Header & Search */}
        <div className="mb-8 relative">
          <div className="absolute -left-4 top-2 w-1 h-12 bg-secondary-container rounded-r-full"></div>
          <h2 className="text-3xl font-bold text-on-surface mb-2 tracking-tight">{t('v_header')}</h2>
          <p className="text-on-surface-variant text-base mb-6 leading-relaxed">{t('v_desc')}</p>
          
          <div className="flex gap-3 items-center">
            <div className="flex-1 bg-surface-container-highest rounded-[1.5rem] px-5 py-4 flex items-center gap-3 transition-colors focus-within:bg-surface-container-low focus-within:ring-2 focus-within:ring-primary/10">
              <span className="material-symbols-outlined text-outline">search</span>
              <input className="bg-transparent border-none outline-none text-on-surface w-full placeholder:text-outline placeholder:font-medium text-base" placeholder={t('v_search')} type="text" />
            </div>
            <button className="bg-surface-container-highest text-on-surface w-14 h-14 rounded-[1.5rem] flex items-center justify-center hover:bg-surface-container-low transition-colors active:scale-95">
              <span className="material-symbols-outlined">tune</span>
            </button>
          </div>
        </div>

        {/* Record List */}
        <div className="space-y-8">
          {/* Group: This Month */}
          <section>
            <h3 className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-on-surface-variant mb-4 px-2">{t('v_month1')}</h3>
            <div className="space-y-3">
              {/* Record Item */}
              <div className="bg-surface-container-lowest rounded-[1.5rem] p-4 flex items-center gap-4 hover:-translate-y-1 transition-transform duration-300">
                <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-secondary shrink-0 relative overflow-hidden">
                  <div className="absolute inset-0 bg-secondary-container opacity-20"></div>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-on-surface font-semibold text-lg truncate">{t('v_rec1_title')}</h4>
                  <p className="text-on-surface-variant text-sm mt-0.5 truncate">{t('v_rec1_desc')}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-on-surface-variant text-sm font-medium mb-1">{t('v_rec1_date')}</p>
                  <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-primary bg-primary-fixed px-2 py-1 rounded-md">PDF</span>
                </div>
              </div>
              
              {/* Record Item */}
              <div className="bg-surface-container-lowest rounded-[1.5rem] p-4 flex items-center gap-4 hover:-translate-y-1 transition-transform duration-300">
                <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-primary shrink-0 relative overflow-hidden">
                  <div className="absolute inset-0 bg-primary-fixed opacity-40"></div>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>image</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-on-surface font-semibold text-lg truncate">{t('v_rec2_title')}</h4>
                  <p className="text-on-surface-variant text-sm mt-0.5 truncate">{t('v_rec2_desc')}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-on-surface-variant text-sm font-medium mb-1">{t('v_rec2_date')}</p>
                  <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-primary bg-primary-fixed px-2 py-1 rounded-md">IMG</span>
                </div>
              </div>
            </div>
          </section>

          {/* Group: Previous Month */}
          <section>
            <h3 className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-on-surface-variant mb-4 px-2">{t('v_month2')}</h3>
            <div className="space-y-3">
              {/* Record Item */}
              <div className="bg-surface-container-lowest rounded-[1.5rem] p-4 flex items-center gap-4 hover:-translate-y-1 transition-transform duration-300">
                <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-secondary shrink-0 relative overflow-hidden">
                  <div className="absolute inset-0 bg-secondary-container opacity-20"></div>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-on-surface font-semibold text-lg truncate">{t('v_rec3_title')}</h4>
                  <p className="text-on-surface-variant text-sm mt-0.5 truncate">{t('v_rec3_desc')}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-on-surface-variant text-sm font-medium mb-1">{t('v_rec3_date')}</p>
                  <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-primary bg-primary-fixed px-2 py-1 rounded-md">PDF</span>
                </div>
              </div>

              {/* Record Item */}
              <div className="bg-surface-container-lowest rounded-[1.5rem] p-4 flex items-center gap-4 hover:-translate-y-1 transition-transform duration-300">
                <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-secondary shrink-0 relative overflow-hidden">
                  <div className="absolute inset-0 bg-secondary-container opacity-20"></div>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-on-surface font-semibold text-lg truncate">{t('v_rec4_title')}</h4>
                  <p className="text-on-surface-variant text-sm mt-0.5 truncate">{t('v_rec4_desc')}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-on-surface-variant text-sm font-medium mb-1">{t('v_rec4_date')}</p>
                  <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-primary bg-primary-fixed px-2 py-1 rounded-md">PDF</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Floating Add Button */}
        <button className="fixed bottom-28 right-6 w-16 h-16 rounded-[1.5rem] bg-[#01261f] text-on-primary flex items-center justify-center shadow-[0_20px_40px_rgba(26,28,23,0.15)] hover:bg-primary-container transition-colors active:scale-95 z-40">
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      </main>

      {/* BottomNavBar */}
      <nav className="bg-[#fafaf1]/80 backdrop-blur-xl text-[#01261f] font-['Plus_Jakarta_Sans'] text-[11px] font-bold uppercase tracking-widest fixed bottom-0 left-0 w-full rounded-t-[2.5rem] z-50 no-border shadow-[0_-4px_40px_rgba(26,28,23,0.05)] hover:text-[#01261f] transition-colors flex justify-around items-center px-8 pb-8 pt-4">
        {/* Inactive Tab: Home */}
        <Link className="flex flex-col items-center justify-center text-[#1a1c17]/40 group hover:text-primary transition-colors" href="/">
          <span className="material-symbols-outlined text-2xl mb-1">home_health</span>
          <span>{t('nav_home')}</span>
        </Link>

        {/* Active Tab: Vault */}
        <Link className="flex flex-col items-center justify-center text-[#01261f] relative after:content-[''] after:absolute after:-bottom-1 after:w-1 after:h-1 after:bg-[#f6e232] after:rounded-full group" href="/vault">
          <span className="material-symbols-outlined text-2xl mb-1" style={{ fontVariationSettings: '"FILL" 1' }}>folder_open</span>
          <span>{t('nav_records')}</span>
        </Link>

        {/* Inactive Tabs */}
        <Link className="flex flex-col items-center justify-center text-[#1a1c17]/40 group hover:text-primary transition-colors" href="/tracker">
          <span className="material-symbols-outlined text-2xl mb-1">event_note</span>
          <span>Tracker</span>
        </Link>
        <Link className="flex flex-col items-center justify-center text-[#1a1c17]/40 group hover:text-primary transition-colors" href="/health">
          <span className="material-symbols-outlined text-2xl mb-1">vital_signs</span>
          <span>{t('nav_health')}</span>
        </Link>
      </nav>
    </div>
  );
}

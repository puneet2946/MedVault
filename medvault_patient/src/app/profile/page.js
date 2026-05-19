"use client";

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';

const PATIENT_DATA = {
  name: 'Julian Reed',
  patientId: 'MV-2024-0042',
  dob: '1990-03-15',
  bloodGroup: 'O+',
  allergies: ['Penicillin', 'Latex'],
  conditions: ['Hypertension', 'Type 2 Diabetes'],
  emergencyContact: '+91 98765 43210',
  insuranceId: 'HLTH-INS-7734',
  relation: 'Self'
};

const FAMILY_MEMBERS = [
  {
    name: 'Clara Reed',
    patientId: 'MV-2024-0043',
    relation: 'Wife',
    dob: '1992-07-22',
    bloodGroup: 'A-',
    allergies: ['None'],
    conditions: ['None'],
    emergencyContact: '+91 98765 43210',
    insuranceId: 'HLTH-INS-7734',
  },
  {
    name: 'Leo Reed',
    patientId: 'MV-2024-0044',
    relation: 'Son',
    dob: '2018-11-05',
    bloodGroup: 'O+',
    allergies: ['Peanuts'],
    conditions: ['Asthma'],
    emergencyContact: '+91 98765 43210',
    insuranceId: 'HLTH-INS-7734',
  }
];

function MedicalIdCard({ data }) {
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const qrCanvasRef = useRef(null);
  const qrModalCanvasRef = useRef(null);

  const drawQR = useCallback(async (canvasEl, size) => {
    if (!canvasEl) return;
    try {
      const QRCode = (await import('qrcode')).default;
      await QRCode.toCanvas(canvasEl, JSON.stringify(data), {
        width: size,
        margin: 2,
        color: { dark: '#01261f', light: '#fafaf1' },
        errorCorrectionLevel: 'H',
      });
    } catch (e) {
      console.error('QR generation failed', e);
    }
  }, [data]);

  useEffect(() => { drawQR(qrCanvasRef.current, 160); }, [drawQR]);

  useEffect(() => {
    if (qrModalOpen) {
      setTimeout(() => drawQR(qrModalCanvasRef.current, 280), 50);
    }
  }, [qrModalOpen, drawQR]);

  return (
    <>
      <div
        className="w-full rounded-2xl overflow-hidden relative shrink-0"
        style={{
          background: 'linear-gradient(135deg, #01261f 0%, #014d3a 60%, #026b50 100%)',
          boxShadow: '0 8px 40px rgba(1,38,31,0.25)',
        }}
      >
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />

        <div className="relative z-10 flex items-center gap-5 p-5">
          <div
            className="rounded-xl overflow-hidden shrink-0"
            style={{ background: '#fafaf1', padding: 6, boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}
          >
            <canvas ref={qrCanvasRef} style={{ display: 'block' }} />
          </div>

          <div className="flex flex-col gap-3 flex-1 min-w-0">
            <div>
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/50 mb-0.5">Medical ID</p>
                {data.relation !== 'Self' && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#01261f] bg-[#c9e165] px-1.5 py-0.5 rounded-sm">{data.relation}</span>
                )}
              </div>
              <p className="text-white font-extrabold text-lg leading-tight truncate mt-0.5">{data.name}</p>
              <p className="text-white/60 font-mono text-xs mt-0.5">{data.patientId}</p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(183,28,28,0.8)', color: '#fff' }}>
                🩸 {data.bloodGroup}
              </span>
              {data.allergies.map(a => (
                <span key={a} className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}>
                  ⚠︎ {a}
                </span>
              ))}
            </div>

            <button
              onClick={() => setQrModalOpen(true)}
              className="self-start flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <span className="material-symbols-outlined text-[14px]">open_in_full</span>
              View Full QR
            </button>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-center gap-2 py-2.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <span className="material-symbols-outlined text-white/40 text-[14px]">qr_code_scanner</span>
          <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest">Scan for emergency health info</p>
        </div>
      </div>

      {qrModalOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center"
          style={{ background: 'rgba(1,38,31,0.75)', backdropFilter: 'blur(10px)' }}
          onClick={() => setQrModalOpen(false)}
        >
          <div
            className="relative rounded-3xl p-8 flex flex-col items-center gap-5 shadow-2xl"
            style={{ background: '#fafaf1', minWidth: 320 }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setQrModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-variant transition-colors"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-lg">close</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>qr_code_2</span>
              <h3 className="text-lg font-extrabold tracking-tight text-on-surface">Medical ID</h3>
            </div>

            <div className="rounded-2xl overflow-hidden p-3" style={{ background: '#fafaf1', boxShadow: '0 4px 24px rgba(1,38,31,0.12)' }}>
              <canvas ref={qrModalCanvasRef} />
            </div>

            <div className="w-full rounded-xl p-4 space-y-1" style={{ background: 'rgba(1,38,31,0.05)' }}>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant font-medium">Name</span>
                <span className="font-bold text-on-surface">{data.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant font-medium">Patient ID</span>
                <span className="font-bold text-on-surface font-mono">{data.patientId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant font-medium">Blood Group</span>
                <span className="font-extrabold" style={{ color: '#b71c1c' }}>{data.bloodGroup}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant font-medium">Allergies</span>
                <span className="font-bold text-on-surface">{data.allergies.join(', ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant font-medium">Emergency</span>
                <span className="font-bold text-on-surface">{data.emergencyContact}</span>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant text-center px-4 mt-2">Show this to a healthcare provider for instant access to critical medical information.</p>
          </div>
        </div>
      )}
    </>
  );
}

export default function Profile() {
  const { t, language, setLanguage } = useLanguage();
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [familyModalOpen, setFamilyModalOpen] = useState(false);

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
    <div className="bg-surface text-on-surface min-h-screen flex flex-col relative overflow-x-hidden">
      {/* TopAppBar */}
      <header className={`bg-[#fafaf1]/80 backdrop-blur-md text-[#01261f] font-['Plus_Jakarta_Sans'] font-bold tracking-tight text-xl fixed top-0 z-50 flex justify-between items-center px-6 py-4 w-full transition-transform duration-300 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <span className="text-[#01261f] font-bold italic tracking-tighter">{t('p_title')}</span>
        <Link href="/profile" className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high border-2 border-surface flex items-center justify-center hover:opacity-80 transition-opacity">
          <span className="material-symbols-outlined text-on-surface-variant text-sm">person</span>
        </Link>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 w-full max-w-2xl mx-auto pt-24 pb-32 px-6 relative z-10" style={{
        backgroundImage: "url('data:image/svg+xml;utf8,<svg width=\"100%\" height=\"100%\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M-10,50 Q100,120 200,30 T300,100\" stroke=\"%23c5eadf\" stroke-width=\"2\" fill=\"none\" opacity=\"0.4\" stroke-dasharray=\"10 5\" stroke-linecap=\"round\"/><path d=\"M-50,80 Q150,10 250,90 T350,50\" stroke=\"%23c5eadf\" stroke-width=\"1.5\" fill=\"none\" opacity=\"0.3\" stroke-linecap=\"round\"/></svg>')",
        backgroundSize: 'cover',
        backgroundPosition: 'top center'
      }}>
        {/* Profile Header */}
        <section className="flex flex-col items-center mt-8 mb-12 relative">
          <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-surface-container-lowest shadow-[0_20px_40px_-10px_rgba(26,28,23,0.1)] mb-6">
            <img alt="Julian Reed" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBHZCPn7NSZ2wu_mpVYu5uo2tcRmwuvX1JjcwapY_A8k-PEoefNVVP2qS9-v3U2fhpyClVhtCy7iDgZs-5tlguih_1U5vfdVySYWESX61Jmhdj7eqgYhU5-CtRU_zV5GO-i5NkVBdVcfIRM7YLW8ya5cYrhVU-wLHQVOp_GOoRWZG34gwXYor-quySTVe00p_hgF3vENghkwcWuNGh9AMfgpdFMs7uRdIDzgqMn7Gm99tfJAlXrkaJy8wLOAE2tH_IhRCoT7mQgldw" />
          </div>
          <h2 className="text-[2.5rem] font-bold tracking-tight text-on-surface leading-none mb-2 text-center">Julian Reed</h2>
          <div className="flex items-center space-x-3 mb-4">
            <span className="font-label text-[0.6875rem] uppercase tracking-[0.05em] font-semibold text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full">{t('p_patient_id')}</span>
          </div>
          <div className="flex items-center space-x-2 text-primary font-medium text-sm bg-primary-fixed/20 px-4 py-1.5 rounded-full">
            <span className="material-symbols-outlined text-base text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            <span>{t('p_verified')}</span>
          </div>
        </section>

        {/* Medical ID QR Card (Self) */}
        <section className="mb-8 flex flex-col items-center">
          <MedicalIdCard data={PATIENT_DATA} />
          
          <button 
            onClick={() => setFamilyModalOpen(true)}
            className="mt-6 flex items-center justify-center gap-2 bg-surface-container-lowest hover:bg-surface-container-low text-[#01261f] font-bold py-3.5 px-6 rounded-xl transition-all active:scale-[0.98] shadow-sm w-full border border-outline-variant/30"
          >
            <span className="material-symbols-outlined">group</span>
            View Family Medical IDs
          </button>
        </section>

        {/* Family Modal */}
        {familyModalOpen && (
          <div className="fixed inset-0 z-[110] flex flex-col justify-end bg-[#01261f]/80 backdrop-blur-sm transition-opacity" onClick={() => setFamilyModalOpen(false)}>
            <div className="bg-[#fafaf1] rounded-t-3xl p-6 w-full max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-full duration-300" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">family_history</span>
                  <h3 className="text-xl font-bold text-[#01261f] tracking-tight">Family IDs</h3>
                </div>
                <button onClick={() => setFamilyModalOpen(false)} className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-surface-variant transition-colors">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">close</span>
                </button>
              </div>
              <div className="flex flex-col gap-6 pb-8">
                {FAMILY_MEMBERS.map(member => (
                  <MedicalIdCard key={member.patientId} data={member} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Menu Groups */}
        <div className="space-y-8">
          {/* Account Group */}
          <section className="bg-surface-container-low rounded-xl p-2 shadow-[0_10px_30px_rgba(26,28,23,0.02)]">
            <h3 className="font-label text-[0.6875rem] uppercase tracking-[0.05em] font-semibold text-on-surface-variant px-4 pt-4 pb-2">{t('p_grp_account')}</h3>
            <div className="flex flex-col space-y-1">
              <button className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl hover:bg-surface-bright transition-colors active:scale-[0.98]">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">person</span>
                  </div>
                  <span className="font-body text-base font-medium text-on-surface">{t('p_personal_info')}</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </button>
              <button className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl hover:bg-surface-bright transition-colors active:scale-[0.98]">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined">description</span>
                  </div>
                  <span className="font-body text-base font-medium text-on-surface">{t('p_med_records')}</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </button>
              <button className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl hover:bg-surface-bright transition-colors active:scale-[0.98]">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">health_and_safety</span>
                  </div>
                  <span className="font-body text-base font-medium text-on-surface">{t('p_insurance')}</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </button>
            </div>
          </section>

          {/* Preferences Group */}
          <section className="bg-surface-container-low rounded-xl p-2 shadow-[0_10px_30px_rgba(26,28,23,0.02)]">
            <h3 className="font-label text-[0.6875rem] uppercase tracking-[0.05em] font-semibold text-on-surface-variant px-4 pt-4 pb-2">{t('p_grp_pref')}</h3>
            <div className="flex flex-col space-y-1">
              {/* Language Selector */}
              <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl hover:bg-surface-bright transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">language</span>
                  </div>
                  <span className="font-body text-base font-medium text-on-surface">{t('p_language')}</span>
                </div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-transparent text-on-surface-variant border-none outline-none font-medium text-right pr-4 cursor-pointer focus:ring-0"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="bn">বাংলা (Bengali)</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                </select>
              </div>

              <button className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl hover:bg-surface-bright transition-colors active:scale-[0.98]">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">notifications_active</span>
                  </div>
                  <span className="font-body text-base font-medium text-on-surface">{t('p_notifications')}</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </button>
              <button className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl hover:bg-surface-bright transition-colors active:scale-[0.98]">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">lock</span>
                  </div>
                  <span className="font-body text-base font-medium text-on-surface">{t('p_security')}</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </button>
            </div>
          </section>

          {/* Support Group */}
          <section className="bg-surface-container-low rounded-xl p-2 shadow-[0_10px_30px_rgba(26,28,23,0.02)]">
            <h3 className="font-label text-[0.6875rem] uppercase tracking-[0.05em] font-semibold text-on-surface-variant px-4 pt-4 pb-2">{t('p_grp_support')}</h3>
            <div className="flex flex-col space-y-1">
              <button className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl hover:bg-surface-bright transition-colors active:scale-[0.98]">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">help</span>
                  </div>
                  <span className="font-body text-base font-medium text-on-surface">{t('p_help')}</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </button>
              <button className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl hover:bg-surface-bright transition-colors active:scale-[0.98]">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">chat_bubble</span>
                  </div>
                  <span className="font-body text-base font-medium text-on-surface">{t('p_contact')}</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </button>
            </div>
          </section>

          {/* Logout Button */}
          <div className="pt-6 pb-8 flex justify-center">
            <button className="text-error font-medium flex items-center space-x-2 border-b-2 border-error pb-1 hover:opacity-80 transition-opacity">
              <span className="material-symbols-outlined text-sm">logout</span>
              <span>{t('p_signout')}</span>
            </button>
          </div>
        </div>
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

        {/* Inactive Tab: Visits */}
        <Link className="flex flex-col items-center justify-center text-[#1a1c17]/40 group hover:text-primary transition-colors" href="/tracker">
          <span className="material-symbols-outlined text-2xl mb-1">event_note</span>
          <span>{t('nav_tracker')}</span>
        </Link>

        {/* Active Tab: Profile */}
        <Link className="flex flex-col items-center justify-center text-[#1a1c17]/40 group hover:text-primary transition-colors" href="/health">
          <span className="material-symbols-outlined text-2xl mb-1">vital_signs</span>
          <span>{t('nav_health')}</span>
        </Link>
      </nav>
    </div>
  );
}

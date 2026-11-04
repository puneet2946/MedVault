"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { createClient } from '../../utils/supabase/client';
import { uploadMedicalRecord } from '../../utils/uploadRecord';
import { downloadDocument } from '../../utils/documentAccess';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import ReportAnalysisModal from '../../components/ReportAnalysisModal';
import AuthGuard from '../../components/AuthGuard';

export default function Health() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Uploaded records and analyses from Supabase
  const [uploadedRecords, setUploadedRecords] = useState([]);
  const [analysesMap, setAnalysesMap] = useState({});
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState("");
  const [recordsRefreshKey, setRecordsRefreshKey] = useState(0);
  const [selectedViewerRecord, setSelectedViewerRecord] = useState(null);
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [selectedAnalysisRecord, setSelectedAnalysisRecord] = useState(null);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [latestUploadedRecord, setLatestUploadedRecord] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRecords() {
      if (!user?.id) return;
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('medical_records')
          .select('*')
          .eq('patient_id', user.id)
          .order('uploaded_at', { ascending: false });

        if (!error && data && isMounted) {
          setUploadedRecords(data);
        }

        const { data: anaData } = await supabase
          .from('report_analyses')
          .select('*')
          .eq('patient_id', user.id);

        if (anaData && isMounted) {
          const map = {};
          anaData.forEach((a) => {
            map[a.medical_record_id] = a;
          });
          setAnalysesMap(map);
        }
      } catch (err) {
        console.warn("Could not fetch records:", err);
      }
    }

    loadRecords();

    return () => {
      isMounted = false;
    };
  }, [user, recordsRefreshKey]);

  const handleDownloadRecord = async (rec) => {
    if (downloadingId) return;
    setDownloadingId(rec.id);
    try {
      const fileName = rec.original_filename || rec.title || 'medical_record';
      const { success, error: downErr } = await downloadDocument(rec.storage_path, fileName);
      if (!success && downErr) {
        setError(`Download failed: ${downErr.message}`);
      }
    } finally {
      setDownloadingId(null);
    }
  };

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

    if (!user?.id) {
      setError("Please sign in to upload and analyze reports.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

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
    setUploadSuccessMessage("");
    setAnalysisResult(null);

    try {
      const { data: record, error: uploadErr } = await uploadMedicalRecord(file);

      if (uploadErr) {
        throw uploadErr;
      }

      setUploadSuccessMessage(`"${file.name}" successfully uploaded and saved to your encrypted Vault.`);
      setLatestUploadedRecord(record);
      setRecordsRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message || 'Failed to upload the report. Please try again.');
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

  const handleSelectSample = (sampleType) => {
    if (sampleType === 'blood') {
      setAnalysisResult({
        isDemo: true,
        fileName: "Blood Panel (Sample).pdf",
        summary: "Illustrative complete blood count preview showing standard physiological reference parameters.",
        keyFindings: [
          "Demonstration record: Hemoglobin 14.2 g/dL (reference range: 12.0 - 15.5 g/dL).",
          "Demonstration record: Total White Blood Cell count 7,200 /µL (reference range: 4,500 - 11,000 /µL).",
          "Demonstration record: Eosinophils 6% (mild elevation noted for clinician follow-up)."
        ],
        jargonBuster: [
          {
            term: "Hemoglobin",
            explanation: "An iron-rich protein in red blood cells that transports oxygen throughout body tissues."
          },
          {
            term: "Eosinophils",
            explanation: "Specialized disease-fighting white blood cells often reflecting mild immune or allergic reactivity."
          }
        ],
        nextSteps: "This is sample demonstration data. Upload your own lab reports to run real MedVault AI analysis."
      });
    } else {
      setAnalysisResult({
        isDemo: true,
        fileName: "MRI Lumbar Spine (Sample).png",
        summary: "Illustrative imaging study preview showing spinal curvature and intervertebral disc height parameters.",
        keyFindings: [
          "Demonstration record: Normal lordotic curvature maintained without acute deformity.",
          "Demonstration record: Intervertebral disc space heights preserved without focal extrusion."
        ],
        jargonBuster: [
          {
            term: "Lumbar Spine",
            explanation: "The lower back region of the spinal column consisting of vertebrae L1 through L5."
          }
        ],
        nextSteps: "This is sample demonstration data. Upload your own diagnostic imaging to run real MedVault AI analysis."
      });
    }
  };

  return (
    <AuthGuard>
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
              <h4 className="text-xs font-bold uppercase tracking-[0.05em] text-on-surface-variant mb-4">
                {t("he_recent")} {uploadedRecords.length > 0 && `(${uploadedRecords.length} in Vault)`}
              </h4>
              <div className="flex overflow-x-auto pb-4 gap-4 snap-x hide-scrollbar -mx-8 px-8">
                {/* Live Uploaded Records from Supabase */}
                {uploadedRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="min-w-[300px] bg-surface-container-lowest rounded-2xl p-5 border border-primary/20 shadow-sm snap-center hover:bg-surface-container-low transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined">
                            {rec.record_type === "imaging" ? "image" : "description"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {analysesMap[rec.id] && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">auto_awesome</span>
                              Analyzed
                            </span>
                          )}
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-md">
                            Live Vault
                          </span>
                        </div>
                      </div>
                      <h5 className="font-bold text-on-surface text-base mb-1 truncate">{rec.original_filename || rec.title}</h5>
                      <p className="text-on-surface-variant text-xs">
                        {new Date(rec.uploaded_at).toLocaleDateString()} • {(rec.file_size / 1024).toFixed(0)} KB
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-outline-variant/15">
                      <button
                        onClick={() => {
                          setSelectedViewerRecord(rec);
                          setViewerModalOpen(true);
                        }}
                        className="flex-1 py-1.5 px-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                        title="View Document"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        <span>View</span>
                      </button>

                      <button
                        onClick={() => handleDownloadRecord(rec)}
                        disabled={downloadingId === rec.id}
                        className="py-1.5 px-2.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant text-xs font-bold rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                        title="Download Document"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {downloadingId === rec.id ? 'sync' : 'download'}
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedAnalysisRecord(rec);
                          setAnalysisModalOpen(true);
                        }}
                        className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 shadow-sm ${
                          analysesMap[rec.id]
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-primary text-white hover:opacity-90'
                        }`}
                        title={analysesMap[rec.id] ? 'View AI Analysis' : 'Analyze with MedVault AI'}
                      >
                        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                          auto_awesome
                        </span>
                        <span>{analysesMap[rec.id] ? 'View AI' : 'Analyze'}</span>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Sample Demo Records */}
                <div
                  onClick={() => handleSelectSample('blood')}
                  className="min-w-[280px] bg-surface-container-low rounded-2xl p-5 border border-outline-variant/20 snap-center hover:bg-surface-container transition-all cursor-pointer opacity-90 hover:opacity-100 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center ambient-shadow text-primary">
                        <span className="material-symbols-outlined">description</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant bg-surface-variant px-2 py-1 rounded-md">Sample</span>
                    </div>
                    <h5 className="font-bold text-on-surface text-base mb-1">Blood Panel (Sample).pdf</h5>
                    <p className="text-on-surface-variant text-xs">Oct 24, 2023 • Lab Corp</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-outline-variant/15 text-[11px] font-semibold text-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                    <span>Click to view demo extraction</span>
                  </div>
                </div>

                <div
                  onClick={() => handleSelectSample('mri')}
                  className="min-w-[280px] bg-surface-container-low rounded-2xl p-5 border border-outline-variant/20 snap-center hover:bg-surface-container transition-all cursor-pointer opacity-90 hover:opacity-100 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center ambient-shadow text-primary">
                        <span className="material-symbols-outlined">image</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant bg-surface-variant px-2 py-1 rounded-md">Sample</span>
                    </div>
                    <h5 className="font-bold text-on-surface text-base mb-1">MRI Scan (Sample).png</h5>
                    <p className="text-on-surface-variant text-xs">Sep 12, 2023 • Radiology Dept</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-outline-variant/15 text-[11px] font-semibold text-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                    <span>Click to view demo extraction</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Upload Success Banner */}
        {uploadSuccessMessage && (
          <div className="bg-emerald-50 text-emerald-950 border border-emerald-200/90 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm relative z-10 animate-in fade-in shadow-sm">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-600 text-2xl shrink-0">verified_user</span>
              <div>
                <p className="font-bold text-emerald-950">{uploadSuccessMessage}</p>
                <p className="text-xs text-emerald-800">Stored with zero-trust encryption in your private vault.</p>
              </div>
            </div>
            {latestUploadedRecord && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setSelectedViewerRecord(latestUploadedRecord);
                    setViewerModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-white text-emerald-900 border border-emerald-300 text-xs font-bold rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  <span>View</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedAnalysisRecord(latestUploadedRecord);
                    setAnalysisModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-primary text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1 shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  <span>Analyze with AI</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="bg-error-container text-on-error-container p-4 rounded-2xl flex items-start justify-between gap-3 relative z-10 shadow-sm">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined shrink-0 mt-0.5">error</span>
              <p className="text-sm font-medium">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-on-error-container/70 hover:text-on-error-container"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        )}

        {/* Sample Demo Extraction (only displayed when user selects sample card) */}
        {analysisResult && (
          <section className="mb-12">
            <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 ambient-shadow relative overflow-hidden border border-outline-variant/15">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/10 rounded-bl-full -mr-16 -mt-16 blur-2xl"></div>

              <div className="flex items-center justify-between mb-4 relative z-10 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  <h3 className="text-xl font-bold text-on-surface">
                    {t("he_ai_report")}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/90 px-2.5 py-1 rounded-md border border-amber-300/40">
                    Sample Demo Extraction
                  </span>
                </div>
                <button
                  onClick={() => setAnalysisResult(null)}
                  className="text-xs font-bold text-on-surface-variant hover:text-on-surface bg-surface-container px-3 py-1 rounded-lg transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                  <span>Dismiss Sample</span>
                </button>
              </div>

              <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200/80 p-3.5 rounded-xl mb-6 flex items-start gap-2.5 relative z-10">
                <span className="material-symbols-outlined text-base text-amber-700 mt-0.5 shrink-0">info</span>
                <span>
                  <strong>Sample Demo Preview:</strong> Displaying illustrative clinical extraction for demonstration. To analyze your own real medical records, upload a report above or click &quot;Analyze&quot; on any Live Vault document.
                </span>
              </div>

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

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        key={selectedViewerRecord?.id || 'viewer'}
        isOpen={viewerModalOpen}
        onClose={() => {
          setViewerModalOpen(false);
          setSelectedViewerRecord(null);
        }}
        record={selectedViewerRecord}
      />

      {/* AI Report Analysis Modal */}
      <ReportAnalysisModal
        key={selectedAnalysisRecord?.id || 'analysis'}
        isOpen={analysisModalOpen}
        onClose={() => {
          setAnalysisModalOpen(false);
          setSelectedAnalysisRecord(null);
          setRecordsRefreshKey((k) => k + 1);
        }}
        record={selectedAnalysisRecord}
        existingAnalysis={selectedAnalysisRecord ? analysesMap[selectedAnalysisRecord.id] : null}
      />
    </div>
    </AuthGuard>
  );
}

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

export default function Vault() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [records, setRecords] = useState([]);
  const [analysesMap, setAnalysesMap] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [recordsRefreshKey, setRecordsRefreshKey] = useState(0);
  const [selectedViewerRecord, setSelectedViewerRecord] = useState(null);
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [selectedAnalysisRecord, setSelectedAnalysisRecord] = useState(null);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const fileInputRef = useRef(null);

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
          setRecords(data);
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
        console.warn("Could not fetch vault records:", err);
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
      const { success, error } = await downloadDocument(rec.storage_path, fileName);
      if (!success && error) {
        setToastMessage(`Download failed: ${error.message}`);
        setTimeout(() => setToastMessage(""), 3500);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user?.id) {
      setToastMessage("Please sign in to upload records.");
      setTimeout(() => setToastMessage(""), 3500);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setToastMessage("File too large. Maximum file size is 20MB.");
      setTimeout(() => setToastMessage(""), 3500);
      return;
    }

    setIsUploading(true);
    setToastMessage(`Encrypting and uploading ${file.name}...`);

    try {
      const { data: record, error: uploadError } = await uploadMedicalRecord(file);

      if (uploadError) {
        setToastMessage(`Upload failed: ${uploadError.message || "Storage error"}`);
        setTimeout(() => setToastMessage(""), 4000);
        return;
      }

      setToastMessage("Record encrypted and saved to Vault!");
      setRecordsRefreshKey((k) => k + 1);
      setTimeout(() => setToastMessage(""), 3500);
    } catch (err) {
      console.error("Unexpected upload error:", err);
      setToastMessage(`Upload failed: ${err.message || "Unexpected error"}`);
      setTimeout(() => setToastMessage(""), 4000);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
    <AuthGuard>
      <div className="antialiased min-h-screen relative overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[110] bg-inverse-surface text-inverse-on-surface px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <span className="material-symbols-outlined text-primary text-xl">encrypted</span>
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Input for Vault Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*,application/pdf"
        className="hidden"
      />

      {/* Ambient Background */}
      <div className="fixed top-[-20vh] right-[-10vw] w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(circle,var(--color-primary-fixed)_0%,transparent_70%)] opacity-15 z-0 pointer-events-none"></div>
      <div className="fixed bottom-[10vh] left-[-20vw] w-[80vw] h-[60vw] rounded-full bg-[radial-gradient(circle,var(--color-secondary-container)_0%,transparent_70%)] opacity-5 z-0 pointer-events-none"></div>

      {/* TopAppBar */}
      <header className={`bg-[#fafaf1]/80 backdrop-blur-md text-[#01261f] font-['Plus_Jakarta_Sans'] font-bold tracking-tight text-xl fixed top-0 z-50 flex justify-between items-center px-6 py-4 w-full transition-transform duration-300 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <span className="text-[#01261f] font-bold italic tracking-tighter">{t('v_title')}</span>
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
              <input
                className="bg-transparent border-none outline-none text-on-surface w-full placeholder:text-outline placeholder:font-medium text-base"
                placeholder={t('v_search')}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="bg-surface-container-highest text-on-surface w-14 h-14 rounded-[1.5rem] flex items-center justify-center hover:bg-surface-container-low transition-colors active:scale-95">
              <span className="material-symbols-outlined">tune</span>
            </button>
          </div>
        </div>

        {/* Record List */}
        <div className="space-y-8">
          {/* Live Uploaded Vault Documents */}
          {records.length > 0 && (
            <section>
              <h3 className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-primary mb-4 px-2 flex items-center gap-2">
                <span>Your Vault Documents ({records.filter(r => !searchQuery || (r.original_filename || r.title).toLowerCase().includes(searchQuery.toLowerCase())).length})</span>
                <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">Live Supabase Sync</span>
              </h3>
              <div className="space-y-3">
                {records
                  .filter(r => !searchQuery || (r.original_filename || r.title).toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-surface-container-lowest rounded-[1.5rem] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-primary/20 shadow-sm hover:border-primary/40 transition-all duration-200"
                    >
                      {/* Left: Info */}
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary shrink-0 relative overflow-hidden">
                          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {rec.record_type === 'imaging' ? 'image' : 'description'}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-on-surface font-bold text-base sm:text-lg truncate">
                              {rec.original_filename || rec.title}
                            </h4>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md shrink-0">
                              {rec.record_type === 'imaging' ? 'IMG' : 'PDF'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-on-surface-variant mt-0.5 flex-wrap">
                            <span>{new Date(rec.uploaded_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{(rec.file_size / 1024).toFixed(0)} KB</span>
                            <span>•</span>
                            <span className="text-emerald-700 font-medium">Encrypted</span>
                            {analysesMap[rec.id] && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                                <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                                AI Analyzed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-outline-variant/10 w-full sm:w-auto justify-end">
                        {/* View Button */}
                        <button
                          onClick={() => {
                            setSelectedViewerRecord(rec);
                            setViewerModalOpen(true);
                          }}
                          className="px-3.5 py-2 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-all flex items-center gap-1.5 active:scale-95"
                          title="View document"
                        >
                          <span className="material-symbols-outlined text-sm">visibility</span>
                          <span>View</span>
                        </button>

                        {/* Download Button */}
                        <button
                          onClick={() => handleDownloadRecord(rec)}
                          disabled={downloadingId === rec.id}
                          className="px-3.5 py-2 text-xs font-bold text-on-surface-variant bg-surface-container-high hover:bg-surface-container-highest rounded-xl transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                          title="Download document"
                        >
                          <span className="material-symbols-outlined text-sm">
                            {downloadingId === rec.id ? 'sync' : 'download'}
                          </span>
                          <span>{downloadingId === rec.id ? 'Downloading...' : 'Download'}</span>
                        </button>

                        {/* AI Analysis Button */}
                        <button
                          onClick={() => {
                            setSelectedAnalysisRecord(rec);
                            setAnalysisModalOpen(true);
                          }}
                          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-sm ${
                            analysesMap[rec.id]
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-primary text-white hover:opacity-90'
                          }`}
                          title={analysesMap[rec.id] ? 'View AI Analysis' : 'Analyze with MedVault AI'}
                        >
                          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                            auto_awesome
                          </span>
                          <span>{analysesMap[rec.id] ? 'View AI' : 'Analyze AI'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* Group: Sample Demo Records */}
          <section>
            <h3 className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-on-surface-variant mb-4 px-2 flex items-center gap-2">
              <span>{t('v_month1')}</span>
              <span className="text-[10px] bg-surface-container-high px-2 py-0.5 rounded text-on-surface-variant font-bold">Sample Demo Records</span>
            </h3>
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
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          aria-label="Upload Medical Record"
          className="fixed bottom-28 right-6 w-16 h-16 rounded-[1.5rem] bg-[#01261f] text-on-primary flex items-center justify-center shadow-[0_20px_40px_rgba(26,28,23,0.15)] hover:bg-primary-container transition-colors active:scale-95 z-40 cursor-pointer disabled:opacity-50"
        >
          {isUploading ? (
            <span className="material-symbols-outlined text-2xl animate-spin">refresh</span>
          ) : (
            <span className="material-symbols-outlined text-3xl">add</span>
          )}
        </button>
      </main>

      {/* BottomNavBar */}
      <nav className="bg-[#fafaf1]/80 backdrop-blur-xl text-[#01261f] font-['Plus_Jakarta_Sans'] text-[11px] font-bold uppercase tracking-widest fixed bottom-0 left-0 w-full rounded-t-[2.5rem] z-50 no-border shadow-[0_-4px_40px_rgba(26,28,23,0.05)] hover:text-[#01261f] transition-colors flex justify-around items-center px-8 pb-8 pt-4">
        {/* Inactive Tab: Home */}
        <Link className="flex flex-col items-center justify-center text-[#1a1c17]/40 group hover:text-primary transition-colors" href="/home">
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
          <span>{t('nav_tracker')}</span>
        </Link>
        <Link className="flex flex-col items-center justify-center text-[#1a1c17]/40 group hover:text-primary transition-colors" href="/health">
          <span className="material-symbols-outlined text-2xl mb-1">vital_signs</span>
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

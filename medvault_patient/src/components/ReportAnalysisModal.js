"use client";

import { useState, useEffect } from 'react';
import { runMedicalReportAnalysis, fetchSavedAnalysis } from '../utils/aiAnalysis';

const PROGRESS_STEPS = [
  "Verifying document integrity...",
  "Sending to Gemini Multimodal Engine...",
  "Extracting clinical measurements & reference ranges...",
  "Finalizing structured summary..."
];

export default function ReportAnalysisModal({ isOpen, onClose, record, existingAnalysis }) {
  const [analysis, setAnalysis] = useState(existingAnalysis || null);
  const [loading, setLoading] = useState(!existingAnalysis);
  const [error, setError] = useState(null);
  const [deploymentNotice, setDeploymentNotice] = useState(null);
  const [activeStep, setActiveStep] = useState(0);

  // Rotate progress steps while analysis is loading
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev < PROGRESS_STEPS.length - 1 ? prev + 1 : prev));
    }, 3500);
    return () => clearInterval(interval);
  }, [loading]);

  // Load existing or run new analysis
  useEffect(() => {
    if (!isOpen || !record?.id) return;
    if (existingAnalysis) return;

    let isMounted = true;

    async function fetchOrAnalyze() {
      // 1. Check if already in database
      const { analysis: saved } = await fetchSavedAnalysis(record.id);
      if (!isMounted) return;

      if (saved) {
        setAnalysis(saved);
        setLoading(false);
        return;
      }

      // 2. Trigger live analysis via Edge Function
      const res = await runMedicalReportAnalysis(record.id);
      if (!isMounted) return;

      if (res.error) {
        if (res.isPendingDeployment) {
          setDeploymentNotice(res.error.message);
        } else {
          setError(res.error.message);
        }
      } else if (res.analysis) {
        setAnalysis(res.analysis);
      }
      setLoading(false);
    }

    fetchOrAnalyze();

    return () => {
      isMounted = false;
    };
  }, [isOpen, record?.id, existingAnalysis]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !record) return null;

  const findings = analysis?.structured_findings || {};
  const isDemo = analysis?.isDemo || false;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl h-[92vh] max-h-[920px] bg-surface-container-lowest rounded-3xl shadow-2xl flex flex-col border border-outline-variant/30 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-outline-variant/15 flex items-center justify-between gap-3 bg-surface-container-lowest">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                auto_awesome
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-on-surface truncate">
                  MedVault AI Clinical Extraction
                </h3>
                {isDemo ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-300/40">
                    Sample Demo Data
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-300/40">
                    {analysis?.model_name ? analysis.model_name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Gemini 2.5 Flash'}
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant truncate">
                Document: <span className="font-semibold">{record.title || record.original_filename}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors shrink-0"
            title="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 bg-surface-container-low p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Loading State */}
          {loading && (
            <div className="max-w-md mx-auto my-12 text-center p-8 bg-surface-container-lowest rounded-3xl border border-outline-variant/20 shadow-sm space-y-5">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  auto_awesome
                </span>
              </div>
              <div>
                <h4 className="font-bold text-base text-on-surface mb-1">Analyzing Medical Document</h4>
                <p className="text-xs text-primary font-medium animate-pulse">{PROGRESS_STEPS[activeStep]}</p>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${((activeStep + 1) / PROGRESS_STEPS.length) * 100}%` }}
                ></div>
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Privileged inference via Supabase Edge Runtime. Secure zero-trust pipeline.
              </p>
            </div>
          )}

          {/* Deployment Required Notice */}
          {!loading && deploymentNotice && (
            <div className="max-w-xl mx-auto my-6 p-6 sm:p-8 bg-surface-container-lowest rounded-3xl border border-amber-300 shadow-sm space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-2xl">cloud_upload</span>
              </div>
              <div className="text-center space-y-2">
                <h4 className="text-base font-bold text-on-surface">Supabase Edge Function Pending Deployment</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Real AI analysis runs securely inside a Supabase Edge Function with your server-side <code className="bg-surface-container-high px-1.5 py-0.5 rounded font-mono text-[11px]">GEMINI_API_KEY</code> secret.
                </p>
              </div>

              <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 text-left space-y-2 text-xs font-mono">
                <div className="text-[11px] font-sans font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                  To deploy from your terminal:
                </div>
                <div className="bg-slate-950 text-slate-100 p-3 rounded-xl overflow-x-auto space-y-1 text-[11px]">
                  <p className="text-slate-400"># 1. Set your Gemini API key secret in Supabase</p>
                  <p className="text-emerald-400">supabase secrets set GEMINI_API_KEY=your_key_here</p>
                  <p className="text-slate-400 mt-2"># 2. Deploy the Edge Function</p>
                  <p className="text-emerald-400">supabase functions deploy analyze-medical-report</p>
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
                >
                  Understood
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {!loading && error && !deploymentNotice && (
            <div className="max-w-md mx-auto my-8 p-6 bg-surface-container-lowest rounded-3xl border border-error/30 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-error-container text-on-error-container mx-auto flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">error</span>
              </div>
              <div>
                <h4 className="font-bold text-on-surface mb-1">Analysis Failed</h4>
                <p className="text-xs text-on-surface-variant">{error}</p>
              </div>
              <button
                onClick={onClose}
                className="px-5 py-2 bg-primary/10 text-primary text-xs font-bold rounded-xl hover:bg-primary/20 transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {/* Real Analysis Content */}
          {!loading && !error && !deploymentNotice && analysis && (
            <div className="space-y-6">
              {/* Prominent Clinical Disclaimer */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-sm">
                <span className="material-symbols-outlined text-amber-700 text-2xl shrink-0 mt-0.5">
                  health_and_safety
                </span>
                <div className="space-y-1 text-xs text-amber-900 leading-relaxed">
                  <h5 className="font-bold text-sm text-amber-950">Important Clinical Disclaimer</h5>
                  <p>
                    {findings.limitations_and_disclaimer ||
                      "This summary was generated by MedVault AI for informational organization only. It is not a clinical diagnosis or treatment recommendation. Always consult a licensed healthcare professional to evaluate your medical documents."}
                  </p>
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-surface-container-lowest rounded-2xl p-5 sm:p-6 border border-outline-variant/15 shadow-sm space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">Document Scope</span>
                    {findings.report_type && (
                      <span className="text-[11px] font-bold text-on-surface bg-surface-container-high px-2.5 py-0.5 rounded-full">
                        {findings.report_type}
                      </span>
                    )}
                  </div>
                  {findings.report_date && (
                    <span className="text-xs text-on-surface-variant">
                      Date on Report: <strong className="text-on-surface">{findings.report_date}</strong>
                    </span>
                  )}
                </div>
                <p className="text-sm sm:text-base text-on-surface leading-relaxed font-medium">
                  {findings.concise_summary || analysis.summary || "Summary unavailable."}
                </p>
              </div>

              {/* Key Findings */}
              {Array.isArray(findings.key_findings) && findings.key_findings.length > 0 && (
                <div className="bg-surface-container-lowest rounded-2xl p-5 sm:p-6 border border-outline-variant/15 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-base">checklist</span>
                    Key Findings
                  </h4>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {findings.key_findings.map((item, idx) => (
                      <li
                        key={idx}
                        className="bg-surface-container-low p-3.5 rounded-xl text-xs sm:text-sm text-on-surface flex items-start gap-2.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-2"></span>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Clinical Measurements Table */}
              {Array.isArray(findings.measurements) && findings.measurements.length > 0 && (
                <div className="bg-surface-container-lowest rounded-2xl p-5 sm:p-6 border border-outline-variant/15 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-base">monitoring</span>
                      Clinical Measurements & Reference Ranges
                    </h4>
                    <span className="text-[11px] text-on-surface-variant">
                      {findings.measurements.length} parameter{findings.measurements.length === 1 ? '' : 's'} extracted
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-outline-variant/20">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-container-high/60 text-on-surface-variant text-[11px] uppercase tracking-wider font-bold">
                        <tr>
                          <th className="p-3">Parameter</th>
                          <th className="p-3">Observed Value</th>
                          <th className="p-3">Printed Reference Range</th>
                          <th className="p-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/15">
                        {findings.measurements.map((m, idx) => {
                          const statusColor =
                            m.status === 'normal'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : m.status === 'high'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : m.status === 'low'
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : 'bg-surface-container-high text-on-surface-variant border-outline-variant/30';

                          return (
                            <tr key={idx} className="hover:bg-surface-container-low transition-colors">
                              <td className="p-3 font-semibold text-on-surface">{m.name}</td>
                              <td className="p-3 font-mono font-bold text-on-surface">
                                {m.value} {m.unit || ''}
                              </td>
                              <td className="p-3 text-on-surface-variant">
                                {m.reference_range || 'Unavailable'}
                              </td>
                              <td className="p-3 text-right">
                                <span
                                  className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${statusColor}`}
                                >
                                  {m.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Out-of-Range Observations */}
              {Array.isArray(findings.out_of_range_observations) && findings.out_of_range_observations.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">warning</span>
                    Out of Range Observations
                  </h4>
                  <ul className="space-y-1.5 text-xs text-amber-950">
                    {findings.out_of_range_observations.map((obs, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0 mt-1.5"></span>
                        <span>{obs}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Medical Terms Explained (Jargon Buster) */}
              {Array.isArray(findings.medical_terms_explained) && findings.medical_terms_explained.length > 0 && (
                <div className="bg-surface-container-lowest rounded-2xl p-5 sm:p-6 border border-outline-variant/15 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">menu_book</span>
                    Medical Jargon Buster
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {findings.medical_terms_explained.map((item, idx) => (
                      <div key={idx} className="bg-surface-container-low p-4 rounded-xl text-xs space-y-1">
                        <span className="font-bold text-on-surface block text-sm">{item.term}</span>
                        <span className="text-on-surface-variant block leading-relaxed">{item.explanation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Questions for Your Doctor */}
              {Array.isArray(findings.suggested_questions_for_doctor) && findings.suggested_questions_for_doctor.length > 0 && (
                <div className="bg-surface-container-lowest rounded-2xl p-5 sm:p-6 border border-outline-variant/15 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-base">quiz</span>
                    Questions to Ask Your Doctor
                  </h4>
                  <ul className="space-y-2">
                    {findings.suggested_questions_for_doctor.map((q, idx) => (
                      <li
                        key={idx}
                        className="bg-surface-container-low p-3.5 rounded-xl text-xs sm:text-sm text-on-surface flex items-start gap-2.5"
                      >
                        <span className="material-symbols-outlined text-secondary text-base shrink-0">help_outline</span>
                        <span className="leading-relaxed font-medium">{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-outline-variant/15 bg-surface-container-lowest flex items-center justify-between text-xs text-on-surface-variant">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="material-symbols-outlined text-xs text-primary">verified</span>
            <span>Patient Record Isolation · PostgreSQL RLS Enforced</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-bold text-on-surface hover:text-primary transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

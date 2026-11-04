"use client";

import { useState, useEffect } from 'react';
import { getSignedDocumentUrl, downloadDocument } from '../utils/documentAccess';

export default function DocumentViewerModal({ isOpen, onClose, record }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Load time-limited signed URL whenever modal is open or record/retry changes
  useEffect(() => {
    if (!isOpen || !record?.storage_path) {
      return;
    }

    let isMounted = true;

    getSignedDocumentUrl(record.storage_path, 300).then(({ signedUrl: url, error: fetchErr }) => {
      if (!isMounted) return;

      if (fetchErr || !url) {
        setError(fetchErr?.message || 'Could not load document preview.');
      } else {
        setSignedUrl(url);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, record, retryKey]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while modal is visible
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

  const fileName = record.original_filename || record.title || 'medical_record';
  const isPdf = record.mime_type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
  const isImage =
    record.mime_type?.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadDocument(record.storage_path, fileName);
    } finally {
      setDownloading(false);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setSignedUrl(null);
    setRetryKey((k) => k + 1);
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl h-[92vh] max-h-[900px] bg-surface-container-lowest rounded-3xl shadow-2xl flex flex-col border border-outline-variant/30 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-outline-variant/15 flex items-center justify-between gap-3 bg-surface-container-lowest">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-2xl">
                {isPdf ? 'description' : isImage ? 'image' : 'draft'}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-on-surface truncate">
                {record.title || fileName}
              </h3>
              <div className="flex items-center gap-2 text-xs text-on-surface-variant flex-wrap">
                <span className="font-mono">{fileName}</span>
                {record.file_size ? (
                  <>
                    <span>•</span>
                    <span>{(record.file_size / 1024).toFixed(0)} KB</span>
                  </>
                ) : null}
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                  <span className="material-symbols-outlined text-xs">lock</span>
                  Encrypted Vault
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {signedUrl && (
              <a
                href={signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors"
                title="Open in new window"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                <span>Open in Tab</span>
              </a>
            )}

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-primary hover:opacity-90 active:scale-95 rounded-xl transition-all shadow-sm disabled:opacity-50"
              title="Download original file"
            >
              <span className="material-symbols-outlined text-sm">
                {downloading ? 'sync' : 'download'}
              </span>
              <span>{downloading ? 'Downloading...' : 'Download'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors"
              title="Close (Esc)"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 bg-surface-container-low p-3 sm:p-5 overflow-auto flex items-center justify-center relative">
          {loading && (
            <div className="flex flex-col items-center gap-3 text-center p-8">
              <div className="w-12 h-12 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-on-surface">Generating secure view session...</p>
              <p className="text-xs text-on-surface-variant">Decentralized authorization in progress</p>
            </div>
          )}

          {!loading && error && (
            <div className="max-w-md w-full bg-surface-container-lowest p-6 rounded-2xl border border-error/20 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-error-container text-on-error-container mx-auto flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">lock_clock</span>
              </div>
              <div>
                <h4 className="font-bold text-on-surface mb-1">Preview Unavailable</h4>
                <p className="text-xs text-on-surface-variant">{error}</p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 bg-primary/10 text-primary text-xs font-bold rounded-xl hover:bg-primary/20 transition-colors"
                >
                  Retry Loading
                </button>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
                >
                  Download File Instead
                </button>
              </div>
            </div>
          )}

          {!loading && !error && signedUrl && (
            <div className="w-full h-full flex items-center justify-center">
              {isPdf ? (
                <iframe
                  src={`${signedUrl}#toolbar=0`}
                  className="w-full h-full rounded-2xl border border-outline-variant/20 shadow-inner bg-white"
                  title={record.title || 'PDF Document Viewer'}
                />
              ) : isImage ? (
                <div className="max-w-full max-h-full flex items-center justify-center p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={signedUrl}
                    alt={record.title || 'Medical Image Preview'}
                    className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-xl border border-white"
                  />
                </div>
              ) : (
                <div className="text-center p-8 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 max-w-md space-y-3">
                  <span className="material-symbols-outlined text-4xl text-primary">folder_zip</span>
                  <h4 className="font-bold text-on-surface">Binary Document</h4>
                  <p className="text-xs text-on-surface-variant">
                    In-browser inline preview is not supported for this file type. Please download the file to view it locally.
                  </p>
                  <button
                    onClick={handleDownload}
                    className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Download File
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-outline-variant/15 bg-surface-container-lowest flex items-center justify-between text-xs text-on-surface-variant">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="material-symbols-outlined text-xs text-primary">shield</span>
            <span>Zero-Trust Token · 5-minute single-session expiry · Never stored</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-bold text-on-surface hover:text-primary transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

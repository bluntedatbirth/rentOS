'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useI18n } from '@/lib/i18n/context';

interface PdfPreviewProps {
  contractText: string;
  /** Debounce delay in ms before regenerating PDF (default 800) */
  debounceMs?: number;
}

export function PdfPreview({ contractText, debounceMs = 800 }: PdfPreviewProps) {
  const { t } = useI18n();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevUrlRef = useRef<string | null>(null);

  const generatePreview = useCallback(async (text: string) => {
    if (!text.trim()) {
      setPdfUrl(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { generateContractPdf } = await import('@/lib/pdf/generateContractPdf');
      const pdfBytes = await generateContractPdf(text);
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      // Revoke previous URL to prevent memory leaks
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
      }
      prevUrlRef.current = url;
      setPdfUrl(url);
    } catch (err) {
      console.error('PDF preview error:', err);
      setError('Failed to generate PDF preview');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced regeneration when contract text changes
  useEffect(() => {
    const timer = setTimeout(() => {
      generatePreview(contractText);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [contractText, debounceMs, generatePreview]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
      }
    };
  }, []);

  const handleDownload = useCallback(async () => {
    if (!contractText.trim()) return;
    const { generateContractPdf, downloadPdf } = await import('@/lib/pdf/generateContractPdf');
    const pdfBytes = await generateContractPdf(contractText);
    downloadPdf(pdfBytes, 'contract-renewal.pdf');
  }, [contractText]);

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-700">{t('renewal.pdf_preview')}</h3>
        <div className="flex items-center gap-2">
          {loading && <span className="text-xs text-gray-400">{t('renewal.generating')}</span>}
          <button
            type="button"
            onClick={handleDownload}
            disabled={!contractText.trim()}
            className="min-h-[36px] rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {t('renewal.download_pdf')}
          </button>
        </div>
      </div>
      <div className="relative flex-1 bg-gray-100 p-2" style={{ minHeight: '500px' }}>
        {loading && !pdfUrl && (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        )}
        {error && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}
        {pdfUrl && (
          <>
            {/* Desktop: iframe renders PDF inline */}
            <iframe
              src={pdfUrl}
              className="hidden h-full w-full rounded border-0 md:block"
              style={{ minHeight: '500px' }}
              title="Contract PDF Preview"
            />
            {/* Mobile: many browsers can't render PDF in iframe, show open/download fallback */}
            <div className="flex h-full flex-col items-center justify-center gap-4 md:hidden">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-12 w-12 text-blue-400"
              >
                <path
                  fillRule="evenodd"
                  d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z"
                  clipRule="evenodd"
                />
                <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
              </svg>
              <p className="text-sm text-gray-600">{t('renewal.pdf_ready')}</p>
              <div className="flex gap-3">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  {t('renewal.open_pdf')}
                </a>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t('renewal.download_pdf')}
                </button>
              </div>
            </div>
          </>
        )}
        {!pdfUrl && !loading && !error && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400">{t('renewal.no_preview')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

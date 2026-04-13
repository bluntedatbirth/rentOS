'use client';

import { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/context';

const MAX_DESCRIPTION_LENGTH = 5000;

export function BugReportButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Close on outside click — also reset sent state
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSent(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (open && !sent) {
      textareaRef.current?.focus();
    }
  }, [open, sent]);

  const handleSubmit = async () => {
    const trimmed = description.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      const res = await fetch('/api/bug-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: trimmed.slice(0, MAX_DESCRIPTION_LENGTH),
          page: window.location.pathname,
          userAgent: navigator.userAgent,
        }),
      });
      if (!res.ok) throw new Error('API error');
      setSending(false);
      setSent(true);
      setDescription('');
      setTimeout(() => {
        setSent(false);
        setOpen(false);
      }, 2000);
    } catch (err) {
      console.error('[bug-report] submit failed', err);
      setSending(false);
      setError(t('bug_report.error') ?? 'Failed to send. Please try again.');
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 md:bottom-6" ref={panelRef}>
      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label={t('bug_report.title')}
          className="mb-2 w-72 rounded-lg border border-warm-200 bg-warm-50 p-4 shadow-lg"
        >
          {sent ? (
            <p className="text-center text-sm font-medium text-green-700">{t('bug_report.sent')}</p>
          ) : (
            <>
              <h3 className="mb-2 text-sm font-semibold text-charcoal-900">
                {t('bug_report.title')}
              </h3>
              <textarea
                ref={textareaRef}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH));
                  if (error) setError('');
                }}
                placeholder={t('bug_report.placeholder')}
                rows={3}
                maxLength={MAX_DESCRIPTION_LENGTH}
                className="mb-2 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm text-charcoal-900 placeholder-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
              />
              {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!description.trim() || sending}
                className="min-h-[44px] w-full rounded-lg bg-saffron-500 px-4 py-2 text-sm font-medium text-charcoal-900 hover:bg-saffron-600 disabled:opacity-50"
              >
                {sending ? t('bug_report.sending') : t('bug_report.submit')}
              </button>
            </>
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          setSent(false);
        }}
        aria-label={t('bug_report.title')}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-all hover:scale-105 hover:bg-red-700 active:scale-95"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M8 2l1.88 1.88" />
          <path d="M14.12 3.88L16 2" />
          <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
          <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
          <path d="M12 20v-9" />
          <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
          <path d="M6 13H2" />
          <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
          <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
          <path d="M22 13h-4" />
          <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
        </svg>
      </button>
    </div>
  );
}

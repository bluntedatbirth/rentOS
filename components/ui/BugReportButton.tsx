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
        className="flex h-12 w-12 items-center justify-center rounded-full bg-charcoal-800 text-white shadow-lg transition-all hover:scale-105 hover:bg-saffron-500 hover:text-charcoal-900 active:scale-95"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path
            fillRule="evenodd"
            d="M6.56 1.14a.75.75 0 01.177 1.045 3.989 3.989 0 00-.464.86c.185.17.382.329.59.473A5.987 5.987 0 0110 3c1.09 0 2.114.29 2.997.793.39-.269.752-.59 1.058-.96a.75.75 0 011.2.9 6.726 6.726 0 01-.755.724c.156.37.272.762.34 1.17A3.502 3.502 0 0118 9v.5c0 .164-.013.325-.037.482a.75.75 0 01-1.486-.214A2.002 2.002 0 0016.5 9v-.5a2 2 0 00-2-2H10a.75.75 0 010-1.5h4.129a4.467 4.467 0 00-.17-.593 5.98 5.98 0 00-1.02-.503A.75.75 0 0112.5 3c-.257 0-.5.032-.728.09a5.477 5.477 0 01-3.544 0A2.998 2.998 0 007.5 3a.75.75 0 01-.44-.857 4.466 4.466 0 00-.17.593H10a.75.75 0 010 1.5H5.5a2 2 0 00-2 2v.5c0 .06.003.118.008.176a.75.75 0 01-1.486.214A3.51 3.51 0 012 6.5V6a3.5 3.5 0 013.14-3.482c.068-.408.184-.8.34-1.17a6.729 6.729 0 01-.755-.724.75.75 0 01.835-1.085zM10 7a3 3 0 00-3 3v3a3 3 0 106 0v-3a3 3 0 00-3-3zm-1.5 4.5a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3zm-.5 3.5a.75.75 0 01.75-.75h2.5a.75.75 0 010 1.5h-2.5a.75.75 0 01-.75-.75z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}

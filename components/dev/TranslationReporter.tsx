'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import enLocale from '@/locales/en.json';
import thLocale from '@/locales/th.json';
import zhLocale from '@/locales/zh.json';

const allLocales: Record<string, Record<string, string>> = {
  en: enLocale as Record<string, string>,
  th: thLocale as Record<string, string>,
  zh: zhLocale as Record<string, string>,
};

function inferKey(text: string, locale: string): { key: string; currentValue: string } | null {
  const strings: Record<string, string> = allLocales[locale] ?? allLocales['en'] ?? {};
  const trimmed = text.trim();
  // Try exact match
  for (const [k, v] of Object.entries(strings)) {
    if (v === trimmed) return { key: k, currentValue: v };
  }
  // Try partial match (text contained in value or value contained in text)
  for (const [k, v] of Object.entries(strings)) {
    if (trimmed.length > 3 && v.includes(trimmed)) return { key: k, currentValue: v };
  }
  return null;
}

function collectText(el: Element, depth: number): string[] {
  const texts: string[] = [];
  // Direct text nodes
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent?.trim();
      if (t) texts.push(t);
    }
  }
  // Try element's full textContent
  const full = el.textContent?.trim();
  if (full) texts.push(full);
  // Go up ancestors
  if (depth > 0 && el.parentElement) {
    texts.push(...collectText(el.parentElement, depth - 1));
  }
  return Array.from(new Set(texts));
}

interface ModalState {
  open: boolean;
  locale: string;
  key: string;
  currentValue: string;
  suggestion: string;
}

export function TranslationReporter() {
  const { locale, t } = useI18n();
  const [devMode, setDevMode] = useState(false);
  const [modal, setModal] = useState<ModalState>({
    open: false,
    locale: 'en',
    key: '',
    currentValue: '',
    suggestion: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine dev mode on mount (env or URL param)
  useEffect(() => {
    const fromEnv = process.env.NEXT_PUBLIC_TRANSLATION_DEV_MODE === 'true';
    const fromUrl =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('dev') === '1';
    setDevMode(fromEnv || fromUrl);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3500);
  }, []);

  useEffect(() => {
    if (!devMode) return;

    const handler = (e: MouseEvent) => {
      if (!e.altKey) return;
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as Element;
      const texts = collectText(target, 3);
      let found: { key: string; currentValue: string } | null = null;
      for (const text of texts) {
        found = inferKey(text, locale);
        if (found) break;
      }

      setModal({
        open: true,
        locale,
        key: found?.key ?? '',
        currentValue: found?.currentValue ?? texts[0] ?? '',
        suggestion: '',
      });
    };

    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [devMode, locale]);

  const handleSubmit = async () => {
    if (!modal.key.trim() || !modal.currentValue.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/translation-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale: modal.locale,
          key: modal.key.trim(),
          current_value: modal.currentValue.trim(),
          suggestion: modal.suggestion.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'Failed to submit report');
      }
      setModal((m) => ({ ...m, open: false }));
      showToast(t('translation.report_success'));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error submitting report');
    } finally {
      setSubmitting(false);
    }
  };

  if (!devMode) return null;

  return (
    <>
      {/* Dev mode indicator badge */}
      <div className="fixed bottom-4 left-4 z-[9000] rounded-full bg-saffron-500 px-2 py-1 text-xs font-medium text-white opacity-60 pointer-events-none select-none">
        DEV: Alt+click to report
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-[9999] rounded-lg bg-charcoal-800 px-4 py-3 text-sm text-white shadow-lg">
          {toastMsg}
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-warm-50/80 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal((m) => ({ ...m, open: false }));
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-warm-200 bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-charcoal-900">
              {t('translation.report_title')}
            </h2>

            <div className="space-y-4">
              {/* Locale (read-only display) */}
              <div>
                <label className="mb-1 block text-xs font-medium text-charcoal-600">Locale</label>
                <div className="rounded-lg border border-warm-200 bg-warm-50 px-3 py-2 text-sm text-charcoal-700">
                  {modal.locale}
                </div>
              </div>

              {/* Key (editable) */}
              <div>
                <label className="mb-1 block text-xs font-medium text-charcoal-600">Key</label>
                <input
                  type="text"
                  value={modal.key}
                  onChange={(e) => setModal((m) => ({ ...m, key: e.target.value }))}
                  placeholder="e.g. onboarding.welcome_title"
                  className="block w-full rounded-lg border border-warm-200 px-3 py-2 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-400 focus:outline-none focus:ring-1 focus:ring-saffron-400"
                />
              </div>

              {/* Current value (read-only) */}
              <div>
                <label className="mb-1 block text-xs font-medium text-charcoal-600">
                  Current value
                </label>
                <div className="rounded-lg border border-warm-200 bg-warm-50 px-3 py-2 text-sm text-charcoal-500">
                  {modal.currentValue || <span className="italic">—</span>}
                </div>
              </div>

              {/* Suggestion */}
              <div>
                <label className="mb-1 block text-xs font-medium text-charcoal-600">
                  {t('translation.report_suggestion_label')}
                </label>
                <textarea
                  value={modal.suggestion}
                  onChange={(e) => setModal((m) => ({ ...m, suggestion: e.target.value }))}
                  rows={3}
                  className="block w-full rounded-lg border border-warm-200 px-3 py-2 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-400 focus:outline-none focus:ring-1 focus:ring-saffron-400"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setModal((m) => ({ ...m, open: false }))}
                className="min-h-[40px] flex-1 rounded-lg border border-sage-500 px-4 py-2 text-sm font-medium text-sage-700 hover:bg-sage-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !modal.key.trim() || !modal.currentValue.trim()}
                className="min-h-[40px] flex-1 rounded-lg bg-saffron-500 px-4 py-2 text-sm font-medium text-white hover:bg-saffron-600 disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

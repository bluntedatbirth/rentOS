'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import thLocale from '@/locales/th.json';
import enLocale from '@/locales/en.json';
import zhLocale from '@/locales/zh.json';
import {
  formatDate as _formatDate,
  formatDateTime as _formatDateTime,
  formatDateRange as _formatDateRange,
} from '@/lib/format/date';
import { formatPhone as _formatPhone } from '@/lib/format/phone';

export type Locale = 'th' | 'en' | 'zh';
type LocaleStrings = Record<string, string>;

const locales: Record<Locale, LocaleStrings> = {
  th: thLocale,
  en: enLocale,
  zh: zhLocale,
};

const VALID_LOCALES: Locale[] = ['th', 'en', 'zh'];

/** @deprecated cycling removed — kept only if external callers import it */
export function cycleLocale(current: Locale): Locale {
  return current === 'th' ? 'en' : current === 'en' ? 'zh' : 'th';
}

/**
 * Maps navigator.language to one of our supported locales.
 * Returns null when navigator is unavailable (SSR).
 */
export function detectSystemLocale(): Locale | null {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return null;
  const lang = navigator.language ?? '';
  if (lang.startsWith('th')) return 'th';
  if (lang.startsWith('en')) return 'en';
  if (lang.startsWith('zh')) return 'zh';
  return null; // caller should fall back to 'th'
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  formatDate: (d: Date | string | null | undefined) => string;
  formatDateTime: (d: Date | string | null | undefined) => string;
  formatDateRange: (
    start: Date | string | null | undefined,
    end: Date | string | null | undefined
  ) => string;
  formatPhone: (raw: string | null | undefined) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  initialLocale = 'th',
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  // Capture initialLocale in a ref so the mount effect can use it without
  // adding it to the deps array (it is a mount-time constant and never changes).
  const initialLocaleRef = useRef(initialLocale);

  // Hydrate locale on mount (priority order):
  //   1. profile.language (wired externally via initialLocale prop — already applied)
  //   2. localStorage 'rentos_locale'
  //   3. navigator.language → mapped locale (written back to localStorage for stability)
  //   4. hard default 'th' (SSR-safe, set as initialLocale above)
  useEffect(() => {
    const stored = localStorage.getItem('rentos_locale');
    if (stored && (VALID_LOCALES as string[]).includes(stored)) {
      setLocaleState(stored as Locale);
      document.documentElement.lang = stored;
      // Sync cookie so SSR on next load renders in the correct locale (no flash)
      if (!document.cookie.includes('rentos_locale=')) {
        document.cookie = `rentos_locale=${stored}; path=/; max-age=31536000; SameSite=Lax`;
      }
      return;
    }
    // Step 3: system locale detection (client-only, never overwrites profile PATCH)
    const detected = detectSystemLocale();
    if (detected) {
      setLocaleState(detected);
      document.documentElement.lang = detected;
      localStorage.setItem('rentos_locale', detected); // stabilise subsequent loads
    }
    // Step 4: nothing matched — initialLocale ('th') already in state, nothing to do
    // Resolve the final locale to write to cookie (detected or initialLocale fallback)
    const resolvedLocale = detected ?? initialLocaleRef.current;
    // Sync cookie so SSR on next load renders in the correct locale (no flash)
    if (!document.cookie.includes('rentos_locale=')) {
      document.cookie = `rentos_locale=${resolvedLocale}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    document.documentElement.lang = newLocale;
    localStorage.setItem('rentos_locale', newLocale);
    // Sync cookie so SSR on the next navigation renders in the correct locale (no flash)
    if (typeof document !== 'undefined') {
      document.cookie = `rentos_locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    }
    // Fire-and-forget: sync to profile when authenticated (401 is fine for guests)
    fetch('/api/profile/language', {
      method: 'PATCH',
      body: JSON.stringify({ language: newLocale }),
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {
      /* ignore */
    });
  }, []);

  const t = useCallback(
    (key: string) => {
      const strings = locales[locale];
      return strings[key] ?? key;
    },
    [locale]
  );

  const formatDate = useCallback(
    (d: Date | string | null | undefined) => _formatDate(d, locale),
    [locale]
  );
  const formatDateTime = useCallback(
    (d: Date | string | null | undefined) => _formatDateTime(d, locale),
    [locale]
  );
  const formatDateRange = useCallback(
    (start: Date | string | null | undefined, end: Date | string | null | undefined) =>
      _formatDateRange(start, end, locale),
    [locale]
  );
  const formatPhone = useCallback((raw: string | null | undefined) => _formatPhone(raw), []);

  return (
    <I18nContext.Provider
      value={{ locale, setLocale, t, formatDate, formatDateTime, formatDateRange, formatPhone }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

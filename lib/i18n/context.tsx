'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import thLocale from '@/locales/th.json';
import enLocale from '@/locales/en.json';

type Locale = 'th' | 'en';
type LocaleStrings = Record<string, string>;

const locales: Record<Locale, LocaleStrings> = {
  th: thLocale,
  en: enLocale,
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
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

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  const t = useCallback(
    (key: string) => {
      const strings = locales[locale];
      return strings[key] ?? key;
    },
    [locale]
  );

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

import thLocale from '@/locales/th.json';
import enLocale from '@/locales/en.json';

type Locale = 'th' | 'en';
type LocaleStrings = Record<string, string>;

const locales: Record<Locale, LocaleStrings> = {
  th: thLocale,
  en: enLocale,
};

let currentLocale: Locale = 'th';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: string, locale?: Locale): string {
  const lang = locale ?? currentLocale;
  const strings = locales[lang];
  return strings[key] ?? key;
}

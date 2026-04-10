import { cookies } from 'next/headers';
import en from '@/locales/en.json';
import th from '@/locales/th.json';
import zh from '@/locales/zh.json';

const LOCALES = { en, th, zh } as const;
export type ServerLocale = keyof typeof LOCALES;

const VALID_LOCALES: ServerLocale[] = ['en', 'th', 'zh'];

/**
 * Reads the locale from the 'rentos_locale' cookie.
 * Falls back to 'th' if absent or unrecognised (Thai-first default).
 * The cookie is written by the client-side I18nProvider on every setLocale call
 * and on initial mount, so subsequent page loads SSR-render in the correct locale.
 * On the very first visit (no cookie yet) SSR falls back to 'th', matching
 * the initialLocale="th" set in app/providers.tsx.
 */
export function getServerLocale(): ServerLocale {
  const cookieLocale = cookies().get('rentos_locale')?.value;
  if (cookieLocale && (VALID_LOCALES as string[]).includes(cookieLocale)) {
    return cookieLocale as ServerLocale;
  }
  return 'th';
}

export function getServerTranslations(locale: ServerLocale): Record<string, string> {
  return LOCALES[locale] as Record<string, string>;
}

/**
 * Drop-in replacement for the client-side t() function.
 * Uses a flat key lookup with fallback to the key itself —
 * matching the exact behaviour of context.tsx's useI18n().t().
 */
export function getServerT(locale: ServerLocale) {
  const translations = getServerTranslations(locale);
  return (key: string): string => translations[key] ?? key;
}

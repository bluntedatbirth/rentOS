'use client';

import { I18nProvider } from '@/lib/i18n/context';

export function Providers({ children }: { children: React.ReactNode }) {
  return <I18nProvider initialLocale="th">{children}</I18nProvider>;
}

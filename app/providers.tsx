'use client';

import { I18nProvider } from '@/lib/i18n/context';
import { ThemeProvider } from '@/lib/theme/context';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { ContractParseProvider } from '@/components/providers/ContractParseProvider';
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider initialLocale="th">
        <ToastProvider>
          <ContractParseProvider>{children}</ContractParseProvider>
        </ToastProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

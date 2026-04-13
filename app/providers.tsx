'use client';

import { I18nProvider } from '@/lib/i18n/context';
import { ThemeProvider } from '@/lib/theme/context';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { BugReportButton } from '@/components/ui/BugReportButton';
import { TranslationReporter } from '@/components/dev/TranslationReporter';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider initialLocale="th">
        <ToastProvider>
          {children}
          <BugReportButton />
          {process.env.NODE_ENV === 'development' && <TranslationReporter />}
        </ToastProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

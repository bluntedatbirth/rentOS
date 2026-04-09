'use client';

import { I18nProvider } from '@/lib/i18n/context';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { BugReportButton } from '@/components/ui/BugReportButton';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider initialLocale="en">
      <ToastProvider>
        {children}
        <BugReportButton />
      </ToastProvider>
    </I18nProvider>
  );
}

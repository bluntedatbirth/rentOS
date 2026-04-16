'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RouteError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[RouteError]', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <ErrorState kind="server" onRetry={reset} />
      </div>
    </div>
  );
}

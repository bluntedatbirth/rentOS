'use client';

import { useState, useEffect } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';

interface OfflineGuardProps {
  children: React.ReactNode;
}

/**
 * Wraps the main content area and shows a network error state whenever the
 * browser reports the user is offline. Prevents Next.js from falling back to
 * hard navigation (which hits the server, fails session verification, and
 * redirects to the landing page).
 *
 * SSR-safe: defaults to online (true) so no content is suppressed during
 * server rendering. Navigator.onLine is only checked on the client.
 */
export function OfflineGuard({ children }: OfflineGuardProps) {
  // Default to true — navigator is not available on the server
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Sync with the actual browser state on mount
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <ErrorState kind="network" onRetry={() => window.location.reload()} />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

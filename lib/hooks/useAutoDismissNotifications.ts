'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/supabase/useAuth';

/**
 * Auto-dismiss notifications when the user visits a page that matches
 * the notification's URL or type.
 *
 * Usage: useAutoDismissNotifications({ types: ['lease_renewal_offer'] });
 *        useAutoDismissNotifications({ url: '/contracts/abc-123' });
 */
export function useAutoDismissNotifications(opts: { url?: string; types?: string[] }) {
  const { user } = useAuth();
  const dismissed = useRef(false);

  // Stable key to avoid re-running on every render
  const key = opts.url ?? '' + '|' + (opts.types?.join(',') ?? '');

  useEffect(() => {
    if (!user || dismissed.current) return;
    if (!opts.url && (!opts.types || opts.types.length === 0)) return;

    dismissed.current = true;
    fetch('/api/notifications/dismiss-by-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: opts.url, types: opts.types }),
    }).catch(() => {
      /* non-critical */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, key]);
}

'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/supabase/useAuth';

/**
 * /pair?code=<CODE>&property=<PROPERTY_ID>
 *
 * Landing page for QR-encoded pairing URLs.
 *
 * - Unauthenticated tenant → redirect to /signup?role=tenant&pair=<code>
 *   so signup → pair is a single flow.
 * - Authenticated tenant → POST to /api/pairing/redeem with the code,
 *   then redirect to /tenant/dashboard.
 * - Authenticated landlord → redirect to /landlord/dashboard (can't self-pair).
 */
function PairPageInner() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const code = searchParams.get('code') ?? '';
  const propertyId = searchParams.get('property') ?? '';

  useEffect(() => {
    if (loading) return;

    if (!code) {
      // No code — go home
      router.replace('/');
      return;
    }

    if (!user) {
      // Unauthenticated: redirect to signup preserving the code (and property)
      const params = new URLSearchParams({ role: 'tenant', pair: code });
      if (propertyId) params.set('property', propertyId);
      router.replace(`/signup?${params.toString()}`);
      return;
    }

    // Authenticated: attempt redeem immediately
    void (async () => {
      try {
        const res = await fetch('/api/pairing/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        if (res.ok) {
          router.replace('/tenant/dashboard');
        } else {
          // Code invalid/expired/already used — go to dashboard anyway
          router.replace('/tenant/dashboard');
        }
      } catch {
        router.replace('/tenant/dashboard');
      }
    })();
  }, [user, loading, code, propertyId, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-warm-50">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-saffron-500 border-t-transparent" />
        <p className="mt-4 text-sm text-charcoal-500">Connecting…</p>
      </div>
    </div>
  );
}

export default function PairPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-warm-50">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-saffron-500 border-t-transparent" />
            <p className="mt-4 text-sm text-charcoal-500">Connecting…</p>
          </div>
        </div>
      }
    >
      <PairPageInner />
    </Suspense>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { createClient } from '@/lib/supabase/client';
import { ContractClauseCard } from '@/components/landlord/ContractClauseCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDisplayDate } from '@/lib/format/date';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { ContractAnalysis } from '@/components/landlord/ContractAnalysis';
import { RenewalBanner } from '@/components/landlord/RenewalBanner';
import { useAutoDismissNotifications } from '@/lib/hooks/useAutoDismissNotifications';
import type { StructuredClause } from '@/lib/supabase/types';
import { FEATURE_PENALTIES } from '@/lib/features';

const supabase = createClient();

interface ContractData {
  id: string;
  property_id: string;
  tenant_id: string | null;
  structured_clauses: StructuredClause[] | null;
  raw_text_th: string | null;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  security_deposit: number | null;
  status: string;
  created_at: string;
  original_file_url: string | null;
}

export default function ContractReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t, locale } = useI18n();
  const [contract, setContract] = useState<ContractData | null>(null);
  const [pendingRenewal, setPendingRenewal] = useState<{
    id: string;
    status: string;
    lease_start: string | null;
    lease_end: string | null;
    monthly_rent: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [reparseLoading, setReparseLoading] = useState(false);
  const [reparseError, setReparseError] = useState<string | null>(null);
  const [isPollingCheck, setIsPollingCheck] = useState(false);
  const [signedFileUrl, setSignedFileUrl] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-dismiss notifications related to this contract
  useAutoDismissNotifications({ url: `/contracts/${id}` });

  const handleRaisePenalty = useCallback(
    (clause: StructuredClause) => {
      router.push(`/landlord/penalties?contract_id=${id}&clause_id=${clause.clause_id}`);
    },
    [id, router]
  );

  const loadContract = useCallback(async () => {
    // Wait until auth resolves — don't run with a stale null user during
    // SPA navigations (e.g. redirect from upload page). Without this the
    // page would stay on skeleton forever.
    if (authLoading) return;
    if (!user || !id) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('contracts')
      .select(
        'id, property_id, tenant_id, structured_clauses, raw_text_th, lease_start, lease_end, monthly_rent, security_deposit, status, created_at, original_file_url'
      )
      .eq('id', id)
      .single();
    setContract(data as ContractData | null);

    // Check if a pending or awaiting_signature renewal exists for this contract
    if (data) {
      const { data: renewalData } = await supabase
        .from('contracts')
        .select('id, status, lease_start, lease_end, monthly_rent')
        .eq('renewed_from' as never, id)
        .in('status', ['pending', 'awaiting_signature'])
        .limit(1)
        .single();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPendingRenewal((renewalData as any) ?? null);
    }

    setLoading(false);
  }, [user, authLoading, id]);

  const handleReparse = useCallback(async () => {
    if (!id) return;
    setReparseLoading(true);
    setReparseError(null);
    try {
      const res = await fetch(`/api/contracts/${id}/reparse`, { method: 'POST' });
      if (res.status === 429) {
        const body = (await res.json()) as { retryAfterSeconds?: number };
        const seconds = body.retryAfterSeconds ?? 60;
        setReparseError(t('contract.reparse_rate_limited').replace('{seconds}', String(seconds)));
        return;
      }
      if (!res.ok) {
        setReparseError(t('contract.reparse_failed'));
        return;
      }
      await loadContract();
    } catch {
      setReparseError(t('contract.reparse_failed'));
    } finally {
      setReparseLoading(false);
    }
  }, [id, t, loadContract]);

  useEffect(() => {
    loadContract();
  }, [loadContract]);

  // Fetch a signed URL for the original file preview. The contracts bucket
  // is private (PDPA), so the stored public URL no longer works in iframes.
  useEffect(() => {
    if (!contract?.original_file_url || !id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/contracts/${id}/file-url`);
        if (res.ok) {
          const data = (await res.json()) as { url: string };
          if (!cancelled) setSignedFileUrl(data.url);
        }
      } catch {
        // Silent — user still sees "Open in new tab" link as fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contract?.original_file_url, id]);

  // Poll every 10 s while contract status is 'pending'
  useEffect(() => {
    if (!contract || contract.status !== 'pending') {
      if (pollIntervalRef.current !== null) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    pollIntervalRef.current = setInterval(() => {
      setIsPollingCheck(true);
      void loadContract().finally(() => setIsPollingCheck(false));
    }, 10_000);

    return () => {
      if (pollIntervalRef.current !== null) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [contract, loadContract]);

  if (loading) return <LoadingSkeleton count={4} />;

  if (!contract) {
    // Contract was deleted or doesn't exist — redirect to dashboard
    router.replace('/landlord/dashboard');
    return <LoadingSkeleton count={4} />;
  }

  const clauses = contract.structured_clauses ?? [];

  // Show processing banner if contract is still being parsed by AI
  if (contract.status === 'pending') {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link
            href="/landlord/contracts"
            className="mb-2 inline-flex items-center gap-1 text-sm text-charcoal-500 dark:text-white/50 hover:text-charcoal-700 dark:hover:text-white/70"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="h-3.5 w-3.5"
            >
              <path
                fillRule="evenodd"
                d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.22 8.53a.75.75 0 010-1.06l3.5-3.5a.75.75 0 011.06 0z"
                clipRule="evenodd"
              />
            </svg>
            {t('nav.contracts')}
          </Link>
        </div>

        <div className="rounded-2xl border border-warm-200 bg-white p-10 shadow-sm text-center">
          {/* Animated pulse ring */}
          <div className="relative mx-auto mb-6 h-16 w-16">
            <span className="absolute inset-0 animate-ping rounded-full bg-saffron-200 opacity-60" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-saffron-100">
              <svg
                className="h-8 w-8 animate-spin text-saffron-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          </div>

          <h2 className="mb-2 text-lg font-bold text-charcoal-900">
            {t('contract.processing_banner')}
          </h2>
          <p className="text-sm text-charcoal-500">
            {isPollingCheck ? t('contract.processing_check') : t('contract.background_note')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/landlord/contracts"
            className="mb-2 inline-flex items-center gap-1 text-sm text-charcoal-500 dark:text-white/50 hover:text-charcoal-700 dark:hover:text-white/70"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="h-3.5 w-3.5"
            >
              <path
                fillRule="evenodd"
                d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.22 8.53a.75.75 0 010-1.06l3.5-3.5a.75.75 0 011.06 0z"
                clipRule="evenodd"
              />
            </svg>
            {t('nav.contracts')}
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-charcoal-900 dark:text-white">
              {t('contract.review_title')}
            </h2>
            <StatusBadge status={contract.status} />
          </div>
        </div>
        {contract.tenant_id ? (
          <span className="inline-flex min-h-[44px] items-center rounded-lg bg-green-100 dark:bg-green-500/15 px-4 py-2 text-sm font-medium text-green-800 dark:text-green-400">
            ✓ {t('pairing.already_paired')}
          </span>
        ) : (
          <Link
            href={`/landlord/contracts/${id}/pair`}
            className="min-h-[44px] flex items-center rounded-lg bg-saffron-500 px-4 py-2 text-sm font-medium text-white hover:bg-saffron-600"
          >
            {t('pairing.pair_tenant')}
          </Link>
        )}
      </div>

      {/* AI-parsed content warning */}
      <div className="mb-6 rounded-lg border border-warning-100 bg-warning-50 p-4 text-warning-700">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 text-lg leading-none" aria-hidden="true">
            ⚠
          </span>
          <div>
            <p className="text-sm font-bold">{t('contract.ai_parsed_top_warning_title')}</p>
            <p className="mt-1 text-sm">{t('contract.ai_parsed_top_warning_body')}</p>
          </div>
        </div>
      </div>

      {/* Contract summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-white dark:bg-charcoal-800 p-4 shadow-sm sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <p className="text-xs text-charcoal-500 dark:text-white/50">
            {t('contract.lease_period')}
          </p>
          <p className="break-all text-sm font-medium text-charcoal-900 dark:text-white">
            {formatDisplayDate(contract.lease_start) || '—'} →{' '}
            {formatDisplayDate(contract.lease_end) || '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-charcoal-500 dark:text-white/50">
            {t('contract.monthly_rent')}
          </p>
          <p className="text-sm font-medium text-charcoal-900 dark:text-white">
            {contract.monthly_rent ? `฿${contract.monthly_rent.toLocaleString()}` : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-charcoal-500 dark:text-white/50">
            {t('contract.security_deposit')}
          </p>
          <p className="text-sm font-medium text-charcoal-900 dark:text-white">
            {contract.security_deposit ? `฿${contract.security_deposit.toLocaleString()}` : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-charcoal-500 dark:text-white/50">{t('contract.clauses')}</p>
          <p className="text-sm font-medium text-charcoal-900 dark:text-white">{clauses.length}</p>
        </div>
      </div>

      {/* Renewal banner — shows when lease is in final month */}
      <RenewalBanner
        contract={contract}
        pendingRenewal={pendingRenewal}
        onRenewed={() => loadContract()}
      />

      {/* Original contract file preview */}
      {contract.original_file_url && (
        <section className="mb-6 rounded-2xl border border-warm-200 dark:border-white/10 bg-white dark:bg-charcoal-800 p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-charcoal-900 dark:text-white">
            {t('contract.original_file')}
          </h2>
          {signedFileUrl ? (
            <iframe
              src={signedFileUrl}
              title={t('contract.original_file')}
              className="h-[60vh] w-full rounded-xl border border-warm-200 dark:border-white/10"
            />
          ) : (
            <div className="flex h-[60vh] w-full items-center justify-center rounded-xl border border-warm-200 dark:border-white/10 bg-warm-50 dark:bg-charcoal-900">
              <p className="text-sm text-charcoal-400 dark:text-white/40">
                {t('contract.file_loading')}
              </p>
            </div>
          )}
          {signedFileUrl && (
            <a
              href={signedFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-medium text-saffron-600 hover:underline"
            >
              {t('contract.open_in_new_tab')} ↗
            </a>
          )}
        </section>
      )}

      {/* Clauses list */}
      {clauses.length === 0 ? (
        <div className="rounded-lg bg-warm-50 dark:bg-charcoal-900 p-8 text-center text-sm text-charcoal-500 dark:text-white/50">
          {contract.raw_text_th ? (
            <div className="space-y-3">
              <p>{t('contract.reparse_empty_state_hint')}</p>
              {reparseError && <p className="text-red-500 text-xs">{reparseError}</p>}
              <button
                type="button"
                onClick={() => void handleReparse()}
                disabled={reparseLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-saffron-500 px-4 py-2 text-sm font-medium text-white hover:bg-saffron-600 disabled:opacity-60"
              >
                {reparseLoading ? (
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : null}
                {t('contract.reparse_button')}
              </button>
            </div>
          ) : (
            t('contract.no_clauses')
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {clauses.map((clause) => (
            <ContractClauseCard
              key={clause.clause_id}
              clause={clause}
              showLang={locale === 'th' ? 'th' : 'en'}
              onRaisePenalty={FEATURE_PENALTIES ? handleRaisePenalty : undefined}
            />
          ))}
        </div>
      )}

      {/* AI Analysis section — Pro feature */}
      <div className="mt-8">
        <ContractAnalysis contractId={id} showLang={locale === 'th' ? 'th' : 'en'} />
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { createClient } from '@/lib/supabase/client';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { UpgradePrompt } from '@/components/ui/UpgradePrompt';
import { useProGate } from '@/lib/hooks/useProGate';
import { useToast } from '@/components/ui/ToastProvider';
import { getPropertyLimit } from '@/lib/tier';
import { computePropertyStatus, type PropertyStatus } from '@/lib/properties/status';
import { useContractParse, type ParseJob } from '@/components/providers/ContractParseProvider';

const supabase = createClient();

interface PropertyRow {
  id: string;
  name: string;
  address: string | null;
  unit_number: string | null;
  cover_image_url: string | null;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  daily_rate: number | null;
  current_tenant_id: string | null;
  pair_code: string | null;
  created_at: string;
}

// ── Status badge ───────────────────────────────────────────────────────────────

function statusBadgeClass(status: PropertyStatus): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-400';
    case 'expiring':
      return 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400';
    case 'vacant':
      return 'bg-warm-100 dark:bg-white/5 text-charcoal-500 dark:text-white/50';
    case 'upcoming':
      return 'bg-saffron-100 dark:bg-saffron-500/15 text-saffron-600 dark:text-saffron-400';
  }
}

function statusLabel(status: PropertyStatus, t: (k: string) => string): string {
  switch (status) {
    case 'active':
      return t('contract.status_active');
    case 'expiring':
      return t('tier.expiring_soon').split(' ')[0] + '…'; // fallback — overridden below
    case 'vacant':
      return t('properties.vacant');
    case 'upcoming':
      return t('contract.status_pending');
  }
}

// ── Property row card ──────────────────────────────────────────────────────────

interface PropertyListRowProps {
  property: PropertyRow;
  overdueIds: Set<string>;
  onRemoved: (id: string) => void;
  activeJob: ParseJob | null;
}

function PropertyListRow({ property, overdueIds, onRemoved, activeJob }: PropertyListRowProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const status = computePropertyStatus(
    property.lease_start,
    property.lease_end,
    undefined,
    !!property.daily_rate
  );
  const isOverdue = overdueIds.has(property.id);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/properties/${property.id}`, { method: 'DELETE' });
      if (res.ok) {
        setConfirmDelete(false);
        toast.success(t('properties.v2c_removed_toast'));
        onRemoved(property.id);
      } else {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        toast.error(body.message ?? t('auth.error'));
      }
    } catch {
      toast.error(t('auth.error'));
    } finally {
      setDeleting(false);
    }
  };

  // Resolve the display label for the expiring status
  const resolvedStatusLabel = (s: PropertyStatus) => {
    if (s === 'expiring') return 'Expiring';
    return statusLabel(s, t);
  };

  return (
    <div className="overflow-hidden rounded-lg bg-white dark:bg-charcoal-800 shadow-sm transition-shadow hover:shadow-md">
      {/* Cover image banner */}
      {property.cover_image_url && (
        <div
          className="h-32 w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${property.cover_image_url})` }}
          aria-hidden="true"
        />
      )}

      {/* Main property row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-charcoal-900 dark:text-white">{property.name}</p>
            {/* Status badge */}
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(status)}`}
            >
              {resolvedStatusLabel(status)}
            </span>
            {/* Overdue indicator */}
            {isOverdue && (
              <span className="inline-block rounded-full bg-rose-100 dark:bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:text-red-400">
                {t('payments.overdue')}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-charcoal-500 dark:text-white/50">
            {property.address && <span>{property.address}</span>}
            {property.unit_number && (
              <span>
                {t('property.unit')}: {property.unit_number}
              </span>
            )}
            {property.daily_rate != null && status !== 'vacant' && (
              <span>
                ฿{property.daily_rate.toLocaleString()}
                {t('property.per_night')}
              </span>
            )}
            {property.daily_rate == null &&
              property.monthly_rent != null &&
              status !== 'vacant' && (
                <span>
                  ฿{property.monthly_rent.toLocaleString()}
                  {t('payments.per_month')}
                </span>
              )}
          </div>
        </div>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-5 w-5 shrink-0 text-charcoal-400 dark:text-white/40 transition-transform ${expanded ? 'rotate-90' : ''}`}
        >
          <path
            fillRule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Expanded quick actions */}
      {expanded && (
        <div className="border-t border-warm-100 dark:border-white/5 px-4 pb-4 pt-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {/* Property detail — always */}
            <Link
              href={`/landlord/properties/${property.id}`}
              className="w-full text-xs font-medium text-saffron-600 hover:text-saffron-800 sm:w-auto"
            >
              {t('property.detail_title')} &rarr;
            </Link>

            {/* Pair Tenant — when no current tenant and not a shell */}
            {!property.current_tenant_id && (
              <Link
                href={`/landlord/properties/${property.id}`}
                className="w-full rounded-md border border-saffron-500 px-3 py-1.5 text-xs font-medium text-saffron-600 hover:bg-saffron-50 sm:w-auto"
              >
                {t('properties.action_pair_tenant')}
              </Link>
            )}

            {/* Upload Contract — shows parse progress when this property's contract is being parsed */}
            {activeJob?.propertyId === property.id ? (
              activeJob.status === 'parsing' ? (
                <Link
                  href={`/landlord/contracts/upload?property_id=${property.id}`}
                  className="flex items-center gap-2 rounded-md border border-saffron-300 bg-saffron-50 px-3 py-1.5 text-saffron-600 hover:bg-saffron-100 dark:border-saffron-500/30 dark:bg-saffron-500/10 dark:hover:bg-saffron-500/20"
                  title={t('ocr.view_progress') || 'View progress'}
                >
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span className="text-xs font-medium">
                    {t('ocr.parsing_contract')} {Math.round(activeJob.progress)}%
                  </span>
                </Link>
              ) : activeJob.status === 'done' ? (
                <span className="text-sm text-sage-600 dark:text-sage-400">
                  ✓ {t('ocr.parse_complete')}
                </span>
              ) : (
                <span className="text-sm text-red-500 dark:text-red-400">
                  ✗ {t('ocr.parse_failed')}
                </span>
              )
            ) : (
              <Link
                href={`/landlord/contracts/upload?property_id=${property.id}`}
                className="w-full rounded-md border border-warm-300 dark:border-white/15 px-3 py-1.5 text-xs font-medium text-charcoal-600 dark:text-white/60 hover:bg-warm-50 dark:hover:bg-white/5 sm:w-auto"
              >
                {t('properties.action_upload_contract')}
              </Link>
            )}

            {/* Renew Lease — when expiring */}
            {status === 'expiring' && (
              <Link
                href={`/landlord/properties/${property.id}`}
                className="w-full rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 sm:w-auto"
              >
                {t('properties.action_renew_lease')}
              </Link>
            )}

            {/* Remove — soft-delete */}
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full rounded-md border border-red-600 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 sm:ml-auto sm:w-auto"
            >
              {t('properties.v2c_remove')}
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmDelete(false);
          }}
        >
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-charcoal-800 p-6 shadow-xl">
            <h3 className="mb-2 text-base font-semibold text-charcoal-900 dark:text-white">
              {t('properties.v2c_confirm_title').replace('{name}', property.name)}
            </h3>
            <p className="mb-5 text-sm text-charcoal-500 dark:text-white/50">
              {t('properties.v2c_confirm_body')}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-warm-300 dark:border-white/15 px-4 py-2 text-sm font-medium text-charcoal-700 dark:text-white/70 hover:bg-warm-50 dark:hover:bg-white/5 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
                    {t('properties.v2c_deleting')}
                  </span>
                ) : (
                  t('properties.v2c_delete_confirm')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PropertiesPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const { activeJob } = useContractParse();
  const router = useRouter();
  const { PromptModal } = useProGate('slot_limit', { showSlotUnlock: true });
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [overduePropertyIds, setOverduePropertyIds] = useState<Set<string>>(new Set());
  const [unpaidRentTotal, setUnpaidRentTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSlotModal, setShowSlotModal] = useState(false);

  const loadProperties = useCallback(async () => {
    // If auth has resolved and there's no user, unstick the skeleton — middleware
    // will handle redirect but we don't want to spin forever waiting.
    if (!user) {
      if (!authLoading) setLoading(false);
      return;
    }

    try {
      // Load properties — select all fields needed for status computation.
      // lease_start, lease_end, monthly_rent, current_tenant_id, pair_code, is_shell
      // are not yet in generated types, so we cast via unknown.
      const { data: propData } = await (supabase
        .from('properties')
        .select(
          'id, name, address, unit_number, cover_image_url, lease_start, lease_end, monthly_rent, daily_rate, current_tenant_id, pair_code, created_at, is_shell'
        )
        .eq('landlord_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false }) as unknown as Promise<{
        data: Array<PropertyRow & { is_shell: boolean }> | null;
      }>);

      const props = (propData ?? []).filter((p) => !p.is_shell) as PropertyRow[];

      if (props.length === 0) {
        setProperties([]);
        setOverduePropertyIds(new Set());
        setUnpaidRentTotal(0);
        setLoading(false);
        return;
      }

      const propIds = props.map((p) => p.id);

      // Load active contracts so we can resolve which properties have overdue payments
      const { data: contractData } = (await supabase
        .from('contracts')
        .select('id, property_id')
        .in('property_id', propIds)
        .eq('status', 'active')) as {
        data: Array<{ id: string; property_id: string }> | null;
      };

      const contracts = contractData ?? [];
      const contractIds = contracts.map((c) => c.id);
      const contractToProperty: Record<string, string> = {};
      for (const c of contracts) {
        contractToProperty[c.id] = c.property_id;
      }

      const overdueSet = new Set<string>();
      let unpaidTotal = 0;
      if (contractIds.length > 0) {
        const { data: overdueData } = (await supabase
          .from('payments')
          .select('contract_id, amount')
          .in('contract_id', contractIds)
          .eq('status', 'overdue')) as {
          data: Array<{ contract_id: string; amount: number | null }> | null;
        };

        for (const r of overdueData ?? []) {
          const propId = contractToProperty[r.contract_id];
          if (propId) overdueSet.add(propId);
          unpaidTotal += r.amount ?? 0;
        }
      }

      setProperties(props);
      setOverduePropertyIds(overdueSet);
      setUnpaidRentTotal(unpaidTotal);
    } catch (err) {
      console.error('[landlord/properties] loadProperties failed:', err);
      // Ensure UI unsticks even on error — show empty state rather than infinite skeleton.
      setProperties([]);
      setOverduePropertyIds(new Set());
      setUnpaidRentTotal(0);
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  // Safety net: if loading is still true after 15s (query hung, auth stuck,
  // etc.), force-release the skeleton so the user isn't trapped on hard
  // refresh. Cleared on any successful state update.
  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => {
      console.warn('[landlord/properties] loading safety timeout hit — releasing skeleton');
      setLoading(false);
    }, 15000);
    return () => clearTimeout(timeout);
  }, [loading]);

  const profileTier = profile?.tier ?? 'free';
  const profilePurchasedSlots = profile?.purchased_slots ?? 0;
  const slotLimit = getPropertyLimit(profileTier, profilePurchasedSlots);
  const slotsUsed = properties.length;
  const slotState: 'under' | 'at' | 'over' =
    slotLimit === Infinity
      ? 'under'
      : slotsUsed < slotLimit
        ? 'under'
        : slotsUsed === slotLimit
          ? 'at'
          : 'over';

  // Compute summary bar counts from loaded property data
  const overdueCount = overduePropertyIds.size;
  const expiringCount = properties.filter(
    (p) =>
      computePropertyStatus(p.lease_start, p.lease_end, undefined, !!p.daily_rate) === 'expiring'
  ).length;
  const vacantCount = properties.filter(
    (p) => computePropertyStatus(p.lease_start, p.lease_end, undefined, !!p.daily_rate) === 'vacant'
  ).length;

  if (loading) return <LoadingSkeleton count={3} />;

  // Pill styling by slot state
  const pillStyles =
    slotState === 'under'
      ? 'bg-warm-100 dark:bg-white/5 text-charcoal-600 dark:text-white/60'
      : 'bg-amber-50 text-amber-800 border border-amber-200';

  return (
    <div className="mx-auto max-w-3xl">
      {PromptModal}
      {showSlotModal && (
        <UpgradePrompt
          feature="slot_limit"
          showSlotUnlock={true}
          onDismiss={() => setShowSlotModal(false)}
        />
      )}

      {/* Dashboard stat cards */}
      {properties.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Active Properties */}
          <div className="rounded-2xl border border-warm-200 dark:border-white/10 bg-white dark:bg-charcoal-800 p-5 shadow-sm">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-saffron-500/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 text-saffron-500"
              >
                <path
                  fillRule="evenodd"
                  d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-2xl font-bold text-charcoal-900 dark:text-white">
              {properties.length}
            </p>
            <p className="text-xs text-charcoal-500 dark:text-white/50">
              {t('dashboard.card_active_properties')}
            </p>
          </div>

          {/* Unpaid Rent */}
          <div className="rounded-2xl border border-warm-200 dark:border-white/10 bg-white dark:bg-charcoal-800 p-5 shadow-sm">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-saffron-500/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 text-saffron-500"
              >
                <path d="M1 4.25a3.733 3.733 0 012.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0016.75 2H3.25A2.25 2.25 0 001 4.25zM1 7.25a3.733 3.733 0 012.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0016.75 5H3.25A2.25 2.25 0 001 7.25zM7 8a1 1 0 000 2h.01a1 1 0 000-2H7zm-2 3a2.25 2.25 0 00-2.25 2.25v1.5A2.25 2.25 0 005 17h10a2.25 2.25 0 002.25-2.25v-1.5A2.25 2.25 0 0015 11H5z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-saffron-600">
              {unpaidRentTotal > 0
                ? `฿${unpaidRentTotal.toLocaleString()}`
                : overdueCount > 0
                  ? overdueCount
                  : '0'}
            </p>
            <p className="text-xs text-charcoal-500 dark:text-white/50">
              {t('dashboard.card_unpaid_rent')}
            </p>
            {overdueCount > 0 && (
              <Link
                href="/landlord/payments"
                className="mt-2 inline-block text-xs font-semibold text-saffron-600 hover:text-saffron-700"
              >
                {t('dashboard.card_unpaid_rent_action')} →
              </Link>
            )}
          </div>

          {/* Expiring Soon */}
          <div className="rounded-2xl border border-warm-200 dark:border-white/10 bg-white dark:bg-charcoal-800 p-5 shadow-sm">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-sage-500/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 text-sage-500"
              >
                <path
                  fillRule="evenodd"
                  d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-2xl font-bold text-sage-500">{expiringCount}</p>
            <p className="text-xs text-charcoal-500 dark:text-white/50">
              {t('dashboard.card_contracts_expiring')}
            </p>
            {expiringCount > 0 && (
              <Link
                href="/landlord/contracts"
                className="mt-2 inline-block text-xs font-semibold text-saffron-600 hover:text-saffron-700"
              >
                {t('dashboard.card_contracts_expiring_action')} →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Header row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold text-charcoal-900 dark:text-white">
            {t('property.title')}
          </h2>
          {/* Slot usage pill — hidden when limit is Infinity (alpha/defer mode) */}
          {slotLimit !== Infinity && (
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${pillStyles}`}
            >
              <span>
                {slotState === 'under'
                  ? t('properties.slots_usage')
                      .replace('{used}', String(slotsUsed))
                      .replace('{limit}', String(slotLimit))
                  : t('properties.slots_full')
                      .replace('{used}', String(slotsUsed))
                      .replace('{limit}', String(slotLimit))}
              </span>
              {(slotState === 'at' || slotState === 'over') && (
                <Link href="/landlord/billing/slots" className="font-medium underline">
                  {t('properties.unlock_more_slots')}
                </Link>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            if (slotState !== 'under') {
              setShowSlotModal(true);
              return;
            }
            router.push('/landlord/properties/new');
          }}
          className="min-h-[44px] rounded-lg bg-saffron-500 px-4 py-2 text-sm font-medium text-white hover:bg-saffron-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('property.add')}
        </button>
      </div>

      {/* Summary bar — only shown when there are properties */}
      {properties.length > 0 && (overdueCount > 0 || expiringCount > 0 || vacantCount > 0) && (
        <div className="mb-5 flex flex-wrap gap-2">
          {overdueCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-rose-100 dark:bg-red-500/15 px-3 py-1 text-xs font-medium text-rose-700 dark:text-red-400">
              {t('properties.summary_overdue').replace('{n}', String(overdueCount))}
            </span>
          )}
          {expiringCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
              {t('properties.summary_expiring').replace('{n}', String(expiringCount))}
            </span>
          )}
          {vacantCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-warm-100 dark:bg-white/5 px-3 py-1 text-xs font-medium text-charcoal-500 dark:text-white/50">
              {t('properties.summary_vacant').replace('{n}', String(vacantCount))}
            </span>
          )}
        </div>
      )}

      {/* Properties list */}
      {properties.length === 0 ? (
        <div className="rounded-lg bg-warm-50 dark:bg-charcoal-900 p-8 text-center text-sm text-charcoal-500 dark:text-white/50">
          {t('property.no_properties')}
        </div>
      ) : (
        <div className="space-y-3">
          {properties.map((p) => (
            <PropertyListRow
              key={p.id}
              property={p}
              overdueIds={overduePropertyIds}
              onRemoved={(id) => setProperties((prev) => prev.filter((x) => x.id !== id))}
              activeJob={activeJob}
            />
          ))}
        </div>
      )}
    </div>
  );
}

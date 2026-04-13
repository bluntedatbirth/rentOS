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
      return 'bg-green-100 text-green-800';
    case 'expiring':
      return 'bg-amber-100 text-amber-800';
    case 'vacant':
      return 'bg-gray-100 text-gray-500';
    case 'upcoming':
      return 'bg-blue-100 text-blue-800';
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
}

function PropertyListRow({ property, overdueIds, onRemoved }: PropertyListRowProps) {
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
    <div className="overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md">
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
            <p className="font-medium text-gray-900">{property.name}</p>
            {/* Status badge */}
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(status)}`}
            >
              {resolvedStatusLabel(status)}
            </span>
            {/* Overdue indicator */}
            {isOverdue && (
              <span className="inline-block rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                {t('payments.overdue')}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
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
          className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
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
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
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

            {/* Upload Contract — always */}
            <Link
              href={`/landlord/contracts/upload?property_id=${property.id}`}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 sm:w-auto"
            >
              {t('properties.action_upload_contract')}
            </Link>

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
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-base font-semibold text-gray-900">
              {t('properties.v2c_confirm_title').replace('{name}', property.name)}
            </h3>
            <p className="mb-5 text-sm text-gray-500">{t('properties.v2c_confirm_body')}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const { PromptModal } = useProGate('slot_limit', { showSlotUnlock: true });
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [overduePropertyIds, setOverduePropertyIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showSlotModal, setShowSlotModal] = useState(false);

  const loadProperties = useCallback(async () => {
    if (!user) return;

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
    if (contractIds.length > 0) {
      const { data: overdueData } = (await supabase
        .from('payments')
        .select('contract_id')
        .in('contract_id', contractIds)
        .eq('status', 'overdue')) as { data: Array<{ contract_id: string }> | null };

      for (const r of overdueData ?? []) {
        const propId = contractToProperty[r.contract_id];
        if (propId) overdueSet.add(propId);
      }
    }

    setProperties(props);
    setOverduePropertyIds(overdueSet);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

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
      ? 'bg-warm-100 text-charcoal-600'
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

      {/* Header row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold text-gray-900">{t('property.title')}</h2>
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
            <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
              {t('properties.summary_overdue').replace('{n}', String(overdueCount))}
            </span>
          )}
          {expiringCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
              {t('properties.summary_expiring').replace('{n}', String(expiringCount))}
            </span>
          )}
          {vacantCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
              {t('properties.summary_vacant').replace('{n}', String(vacantCount))}
            </span>
          )}
        </div>
      )}

      {/* Properties list */}
      {properties.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-500">
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

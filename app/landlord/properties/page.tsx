'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { UpgradePrompt } from '@/components/ui/UpgradePrompt';
import { useProGate } from '@/lib/hooks/useProGate';
import { useToast } from '@/components/ui/ToastProvider';
import { getPropertyLimit } from '@/lib/tier';

const supabase = createClient();

type ContractStatus =
  | 'pending'
  | 'active'
  | 'expired'
  | 'terminated'
  | 'parse_failed'
  | 'scheduled';

interface ContractSummary {
  id: string;
  status: ContractStatus;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  tenant_id: string | null;
  renewed_from: string | null;
  created_at: string;
  tenant_name: string | null;
}

interface PropertyRow {
  id: string;
  name: string;
  address: string | null;
  unit_number: string | null;
  contracts: ContractSummary[];
}

function getActiveContract(contracts: ContractSummary[]): ContractSummary | null {
  return contracts.find((c) => c.status === 'active') ?? null;
}

function getPendingContract(contracts: ContractSummary[]): ContractSummary | null {
  return contracts.find((c) => c.status === 'pending') ?? null;
}

function getExpiredContracts(contracts: ContractSummary[]): ContractSummary[] {
  return contracts
    .filter((c) => c.status === 'expired' || c.status === 'terminated')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

interface ContractSubRowProps {
  contract: ContractSummary;
  label: string;
  prominent?: boolean;
}

function ContractSubRow({ contract, label, prominent }: ContractSubRowProps) {
  const { t, formatDateRange } = useI18n();
  return (
    <Link
      href={`/landlord/contracts/${contract.id}`}
      className={`flex items-center justify-between rounded-lg px-4 py-3 transition-colors hover:bg-gray-100 ${
        prominent ? 'bg-white shadow-sm' : 'bg-gray-50'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-xs font-semibold uppercase tracking-wide ${
              prominent ? 'text-gray-700' : 'text-gray-400'
            }`}
          >
            {label}
          </span>
          <StatusBadge status={contract.status} />
          {contract.monthly_rent != null && (
            <span
              className={`text-sm font-medium ${prominent ? 'text-gray-900' : 'text-gray-500'}`}
            >
              ฿{contract.monthly_rent.toLocaleString()}
              {t('payments.per_month')}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
          {contract.tenant_name && <span>{contract.tenant_name}</span>}
          {!contract.tenant_id && <span>{t('contract.unpaired')}</span>}
          {contract.lease_start && contract.lease_end && (
            <span>{formatDateRange(contract.lease_start, contract.lease_end)}</span>
          )}
        </div>
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="ml-2 h-4 w-4 shrink-0 text-gray-300"
      >
        <path
          fillRule="evenodd"
          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
          clipRule="evenodd"
        />
      </svg>
    </Link>
  );
}

interface PropertyListRowProps {
  property: PropertyRow;
  onRemoved: (id: string) => void;
}

function PropertyListRow({ property, onRemoved }: PropertyListRowProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Filter out parse_failed / scheduled from the display lists
  const visibleContracts = property.contracts.filter(
    (c) => c.status !== 'parse_failed' && c.status !== 'scheduled'
  );

  const activeContract = getActiveContract(visibleContracts);
  const pendingContract = getPendingContract(visibleContracts);
  const expiredContracts = getExpiredContracts(visibleContracts);

  const hasContracts = activeContract || pendingContract || expiredContracts.length > 0;
  const isVacant = !activeContract;

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
        // keep modal open on 409 (active contract)
      }
    } catch {
      toast.error(t('auth.error'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Main property row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-gray-900">{property.name}</p>
            {activeContract ? (
              <StatusBadge status="active" />
            ) : pendingContract ? (
              <StatusBadge status="pending" />
            ) : (
              <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                {t('properties.vacant')}
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
            {activeContract?.tenant_name && (
              <span className="text-gray-600">
                {t('properties.current_tenant')}: {activeContract.tenant_name}
              </span>
            )}
            {activeContract?.monthly_rent != null && (
              <span>
                ฿{activeContract.monthly_rent.toLocaleString()}
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

      {/* Expanded contract section */}
      {expanded && (
        <div className="border-t border-gray-100 px-2 pb-2">
          {!hasContracts ? (
            <p className="px-2 py-4 text-center text-xs text-gray-400">
              {t('properties.no_contracts')}
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {activeContract && (
                <ContractSubRow
                  contract={activeContract}
                  label={t('properties.active_contract')}
                  prominent
                />
              )}
              {pendingContract && (
                <ContractSubRow
                  contract={pendingContract}
                  label={t('properties.pending_contract')}
                />
              )}
              {expiredContracts.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowPast((v) => !v)}
                    className="flex w-full items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className={`h-3.5 w-3.5 transition-transform ${showPast ? 'rotate-90' : ''}`}
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {showPast
                      ? t('properties.hide_past_contracts')
                      : t('properties.show_past_contracts').replace(
                          '{}',
                          String(expiredContracts.length)
                        )}
                  </button>
                  {showPast && (
                    <div className="mt-1 space-y-1">
                      {expiredContracts.map((c) => (
                        <ContractSubRow
                          key={c.id}
                          contract={c}
                          label={
                            c.status === 'terminated'
                              ? t('contract.status_terminated')
                              : t('contract.status_expired')
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quick actions */}
          <div className="mt-2 flex flex-wrap items-center gap-2 px-2 pb-1">
            <Link
              href={`/landlord/properties/${property.id}`}
              className="text-xs font-medium text-saffron-600 hover:text-saffron-800"
            >
              {t('property.detail_title')} &rarr;
            </Link>

            {/* Create contract CTA — shown when no active contract */}
            {isVacant && (
              <Link
                href={`/landlord/contracts/create?property_id=${property.id}`}
                className="rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-saffron-600"
              >
                {t('properties.v2c_create_contract')}
              </Link>
            )}

            {/* Remove property — destructive, red outline */}
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="ml-auto rounded-md border border-red-600 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
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

export default function PropertiesPage() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const { PromptModal } = useProGate('slot_limit', { showSlotUnlock: true });
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [creating, setCreating] = useState(false);

  const loadProperties = useCallback(async () => {
    if (!user) return;

    // Load properties
    const { data: propData } = await supabase
      .from('properties')
      .select('id, name, address, unit_number')
      .eq('landlord_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    const props = (propData ?? []) as Omit<PropertyRow, 'contracts'>[];

    if (props.length === 0) {
      setProperties([]);
      setLoading(false);
      return;
    }

    const propIds = props.map((p) => p.id);

    // Load contracts for all properties in one query, excluding parse_failed
    const { data: contractData } = await supabase
      .from('contracts')
      .select(
        'id, property_id, status, lease_start, lease_end, monthly_rent, tenant_id, renewed_from, created_at'
      )
      .in('property_id', propIds)
      .neq('status', 'parse_failed')
      .order('created_at', { ascending: false });

    const contracts = (contractData ?? []) as (ContractSummary & { property_id: string })[];

    // Load tenant names
    const tenantIds = Array.from(
      new Set(contracts.map((c) => c.tenant_id).filter(Boolean))
    ) as string[];

    let tenantMap: Record<string, string> = {};
    if (tenantIds.length > 0) {
      const { data: tenantData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', tenantIds);
      tenantMap = Object.fromEntries(
        (tenantData ?? []).map((tp) => [tp.id as string, (tp.full_name as string | null) ?? ''])
      );
    }

    // Group contracts by property_id
    const contractsByProp: Record<string, ContractSummary[]> = {};
    for (const c of contracts) {
      const { property_id, ...rest } = c;
      if (!contractsByProp[property_id]) contractsByProp[property_id] = [];
      contractsByProp[property_id].push({
        ...rest,
        tenant_name: rest.tenant_id ? (tenantMap[rest.tenant_id] ?? null) : null,
      });
    }

    const rows: PropertyRow[] = props.map((p) => ({
      ...p,
      contracts: contractsByProp[p.id] ?? [],
    }));

    setProperties(rows);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);

    const response = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        address: address.trim() || undefined,
        unit_number: unitNumber.trim() || undefined,
      }),
    });

    if (response.ok) {
      setName('');
      setAddress('');
      setUnitNumber('');
      setShowForm(false);
      await loadProperties();
    } else {
      let errorMessage = t('auth.error');
      try {
        const body = await response.json();
        if (body?.error === 'property_limit_reached') {
          errorMessage = t('properties.slots_full_toast');
        } else if (body?.message) {
          errorMessage = body.message;
        }
      } catch {
        // body wasn't JSON — fall back to generic error
      }
      toast.error(errorMessage);
    }
    setCreating(false);
  };

  const profileTier = profile?.tier ?? 'free';
  const profilePurchasedSlots = profile?.purchased_slots ?? 0;
  const slotLimit = getPropertyLimit(profileTier, profilePurchasedSlots);
  const slotsUsed = properties.length;
  // When DEFER_TIER_ENFORCEMENT=true, slotLimit is Infinity — always treat as 'under'
  // so the amber warning pill and gate modal never appear during alpha.
  const slotState: 'under' | 'at' | 'over' =
    slotLimit === Infinity
      ? 'under'
      : slotsUsed < slotLimit
        ? 'under'
        : slotsUsed === slotLimit
          ? 'at'
          : 'over';

  if (loading) return <LoadingSkeleton count={3} />;

  // Pill styling by state
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

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
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
              // At or over slot limit for any tier — show slot-unlock modal
              setShowSlotModal(true);
              return;
            }
            setShowForm(!showForm);
          }}
          className="min-h-[44px] rounded-lg bg-saffron-500 px-4 py-2 text-sm font-medium text-white hover:bg-saffron-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {showForm ? t('common.cancel') : t('property.add')}
        </button>
      </div>

      {/* Add property form */}
      {showForm && (
        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          {/* Quick contract options */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/landlord/contracts/create"
              className="flex flex-1 items-center gap-3 rounded-lg border-2 border-dashed border-green-300 bg-green-50 p-4 transition-colors hover:border-green-400 hover:bg-green-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-8 w-8 shrink-0 text-green-500"
              >
                <path
                  fillRule="evenodd"
                  d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm4.75 6.75a.75.75 0 00-1.5 0v2.25H5.5a.75.75 0 000 1.5h2.25v2.25a.75.75 0 001.5 0v-2.25h2.25a.75.75 0 000-1.5h-2.25V8.75z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm font-semibold text-green-800">
                  {t('property.create_contract_option')}
                </p>
                <p className="text-xs text-green-600">{t('property.create_contract_hint')}</p>
              </div>
            </Link>
            <Link
              href="/landlord/contracts/upload"
              className="flex flex-1 items-center gap-3 rounded-lg border-2 border-dashed border-saffron-300 bg-saffron-50 p-4 transition-colors hover:border-saffron-400 hover:bg-saffron-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-8 w-8 shrink-0 text-saffron-500"
              >
                <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-saffron-800">
                  {t('property.upload_contract_option')}
                </p>
                <p className="text-xs text-saffron-600">{t('property.upload_contract_hint')}</p>
              </div>
            </Link>
          </div>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-400">{t('property.or_manual')}</span>
            </div>
          </div>

          <form onSubmit={handleCreate}>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="prop-name"
                  className="mb-1 block text-sm font-medium text-charcoal-700"
                >
                  {t('property.name')}
                </label>
                <input
                  id="prop-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('property.name_placeholder')}
                  className="block w-full rounded-lg border border-warm-200 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                />
              </div>
              <div>
                <label
                  htmlFor="prop-address"
                  className="mb-1 block text-sm font-medium text-charcoal-700"
                >
                  {t('property.address')}
                </label>
                <input
                  id="prop-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t('property.address_placeholder')}
                  className="block w-full rounded-lg border border-warm-200 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                />
              </div>
              <div>
                <label
                  htmlFor="prop-unit"
                  className="mb-1 block text-sm font-medium text-charcoal-700"
                >
                  {t('property.unit')}
                </label>
                <input
                  id="prop-unit"
                  type="text"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  placeholder={t('property.unit_placeholder')}
                  className="block w-full rounded-lg border border-warm-200 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                />
              </div>
              <button
                type="submit"
                disabled={creating}
                className="min-h-[44px] w-full rounded-lg bg-saffron-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-saffron-600 disabled:opacity-50"
              >
                {creating ? t('property.creating') : t('property.add')}
              </button>
            </div>
          </form>
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
              onRemoved={(id) => setProperties((prev) => prev.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

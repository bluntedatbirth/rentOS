'use client';

import { useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PropertyImageGallery } from '@/components/landlord/PropertyImageGallery';
import { PairShareModal } from '@/components/landlord/PairShareModal';
import { QRCodeSVG } from 'qrcode.react';
import { formatDisplayDate } from '@/lib/format/date';
import { computePropertyStatus } from '@/lib/properties/status';
import {
  PropertyPaymentsTab,
  type PaymentRecord,
  type ContractForPayments,
} from '@/components/payments/PropertyPaymentsTab';

const supabase = createClient();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PropertyDetail {
  id: string;
  name: string;
  address: string | null;
  unit_number: string | null;
  created_at: string;
  cover_image_url: string | null;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  current_tenant_id: string | null;
  pair_code: string | null;
  pair_code_rotated_at: string | null;
  previous_tenant_count: number;
}

interface LinkedContract {
  id: string;
  status: string;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  tenant_id: string | null;
  created_at: string;
}

interface TenantProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
}

type Tab = 'contracts' | 'payments' | 'notify';

interface PropertyDetailClientProps {
  property: PropertyDetail;
  initialContracts: LinkedContract[];
  initialTenants: Record<string, TenantProfile>;
  initialPayments: PaymentRecord[];
}

// ---------------------------------------------------------------------------
// Status badge colour mapping
// ---------------------------------------------------------------------------

function StatusPill({ status }: { status: ReturnType<typeof computePropertyStatus> }) {
  const { t } = useI18n();
  const labelKey = `property.status_${status}` as const;
  const styles: Record<string, string> = {
    active: 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400',
    expiring: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
    vacant: 'bg-warm-100 dark:bg-white/5 text-charcoal-600 dark:text-white/60',
    upcoming: 'bg-saffron-100 dark:bg-saffron-500/15 text-saffron-600 dark:text-saffron-400',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status] ?? styles.vacant}`}
    >
      {t(labelKey)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Permanent QR section
// ---------------------------------------------------------------------------

interface PropertyQRSectionProps {
  property: PropertyDetail;
  pairedTenantName: string | null;
  onPropertyUpdate: (updates: Partial<PropertyDetail>) => void;
}

function PropertyQRSection({
  property,
  pairedTenantName,
  onPropertyUpdate,
}: PropertyQRSectionProps) {
  const { t } = useI18n();
  const [rotating, setRotating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const pairCode = property.pair_code;
  const qrUrl =
    typeof window !== 'undefined' && pairCode
      ? `${window.location.origin}/pair?code=${pairCode}&property=${property.id}`
      : '';

  async function handleRotate() {
    setRotating(true);
    setError(null);
    try {
      const res = await fetch(`/api/properties/${property.id}/rotate-code`, { method: 'POST' });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setError(json.error ?? t('pairing.rotate_error'));
        return;
      }
      const json = (await res.json()) as { pair_code: string };
      onPropertyUpdate({
        pair_code: json.pair_code,
        pair_code_rotated_at: new Date().toISOString(),
      });
    } catch {
      setError(t('pairing.rotate_error'));
    } finally {
      setRotating(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/pairing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: property.id }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setError(json.error ?? t('pairing.generate_error'));
        return;
      }
      const json = (await res.json()) as { code: string };
      onPropertyUpdate({ pair_code: json.code, pair_code_rotated_at: new Date().toISOString() });
    } catch {
      setError(t('pairing.generate_error'));
    } finally {
      setGenerating(false);
    }
  }

  // If no pair_code yet — show generate button
  if (!pairCode) {
    return (
      <div className="mt-4 rounded-xl border border-warm-200 dark:border-white/10 bg-white dark:bg-charcoal-800 p-5 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-charcoal-700 dark:text-white/70">
          {t('pairing.property_section_title')}
        </h3>
        <p className="mb-4 text-xs text-charcoal-500 dark:text-white/50">
          {t('pairing.property_section_description')}
        </p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="min-h-[44px] rounded-lg bg-saffron-500 px-4 py-2 text-sm font-medium text-white hover:bg-saffron-600 disabled:opacity-50"
        >
          {generating ? t('common.loading') : t('pairing.generate_pair_code')}
        </button>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <>
      <div className="mt-4 rounded-xl border border-warm-200 dark:border-white/10 bg-white dark:bg-charcoal-800 p-5 shadow-sm">
        {/* Header row */}
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-charcoal-700">
            {t('pairing.property_section_title')}
          </h3>
          {pairedTenantName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sage-50 px-2 py-0.5 text-xs font-medium text-sage-700">
              {t('pairing.paired_with').replace('{name}', pairedTenantName)}
            </span>
          )}
        </div>

        {/* QR + code side by side on larger screens */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="shrink-0 rounded-xl border border-warm-200 dark:border-white/10 bg-white dark:bg-charcoal-800 p-2 shadow-sm self-start">
            <QRCodeSVG value={qrUrl} size={200} />
          </div>

          <div className="flex flex-col gap-3">
            {/* Pair code */}
            <div>
              <p className="mb-1 text-xs font-medium text-charcoal-500">
                {t('pairing.code_label')}
              </p>
              <p className="font-mono text-2xl font-bold tracking-widest text-charcoal-900">
                {pairCode}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="min-h-[36px] rounded-lg bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
              >
                {t('pairing.share_button')}
              </button>
              <button
                type="button"
                onClick={handleRotate}
                disabled={rotating}
                className="min-h-[36px] rounded-lg border border-warm-200 px-3 py-1.5 text-xs font-medium text-charcoal-700 hover:bg-warm-50 disabled:opacity-50"
              >
                {rotating ? t('common.loading') : t('pairing.rotate_code')}
              </button>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        </div>

        {/* Previous tenants count */}
        {property.previous_tenant_count > 0 && (
          <p className="mt-4 text-xs text-charcoal-400">
            {t('pairing.previous_tenants').replace('{n}', String(property.previous_tenant_count))}
          </p>
        )}
      </div>

      {showShareModal && pairCode && (
        <PairShareModal
          pairCode={pairCode}
          qrUrl={qrUrl}
          propertyName={property.name}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main inner component
// ---------------------------------------------------------------------------

function PropertyDetailInner({
  property: initialProperty,
  initialContracts,
  initialTenants,
  initialPayments,
}: PropertyDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, formatPhone } = useI18n();

  const [property, setProperty] = useState<PropertyDetail>(initialProperty);
  const [contracts, setContracts] = useState<LinkedContract[]>(initialContracts);
  const [tenants] = useState<Record<string, TenantProfile>>(initialTenants);
  const [payments] = useState<PaymentRecord[]>(initialPayments);

  const [deleting, setDeleting] = useState(false);
  const [deletingContractId, setDeletingContractId] = useState<string | null>(null);

  // Initialise tab from ?tab= query param if present
  const tabParam = searchParams.get('tab') as Tab | null;
  const [tab, setTab] = useState<Tab | null>(tabParam);

  // Send notification state
  const [notifMessage, setNotifMessage] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifSent, setNotifSent] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(property.name);
  const [editAddress, setEditAddress] = useState(property.address ?? '');
  const [editUnit, setEditUnit] = useState(property.unit_number ?? '');
  const [saving, setSaving] = useState(false);

  // Cover image state
  const [coverUrl, setCoverUrl] = useState<string | null>(property.cover_image_url ?? null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);

  // Lease management state
  const [renewalDismissed, setRenewalDismissed] = useState(false);
  const [showRenewForm, setShowRenewForm] = useState(false);
  const [renewLeaseEnd, setRenewLeaseEnd] = useState(property.lease_end ?? '');
  const [renewSaving, setRenewSaving] = useState(false);
  const [renewError, setRenewError] = useState<string | null>(null);
  const [endingTenancy, setEndingTenancy] = useState(false);

  // Computed status
  const propertyStatus = computePropertyStatus(property.lease_start, property.lease_end);

  const handlePropertyUpdate = useCallback((updates: Partial<PropertyDetail>) => {
    setProperty((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverError(null);
    setCoverUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/properties/${property.id}/cover`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        setCoverError(t('property.cover_image_error'));
      } else {
        const data = (await res.json()) as { url: string };
        setCoverUrl(data.url);
        setProperty((prev) => ({ ...prev, cover_image_url: data.url }));
      }
    } catch {
      setCoverError(t('property.cover_image_error'));
    } finally {
      setCoverUploading(false);
      e.target.value = '';
    }
  };

  const handleCoverRemove = async () => {
    setCoverError(null);
    setCoverUploading(true);
    try {
      const res = await fetch(`/api/properties/${property.id}/cover`, { method: 'DELETE' });
      if (res.ok) {
        setCoverUrl(null);
        setProperty((prev) => ({ ...prev, cover_image_url: null }));
      } else {
        setCoverError(t('property.cover_image_error'));
      }
    } catch {
      setCoverError(t('property.cover_image_error'));
    } finally {
      setCoverUploading(false);
    }
  };

  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('properties')
      .update({
        name: editName.trim(),
        address: editAddress.trim() || null,
        unit_number: editUnit.trim() || null,
      })
      .eq('id', property.id);

    if (!error) {
      setProperty((prev) => ({
        ...prev,
        name: editName.trim(),
        address: editAddress.trim() || null,
        unit_number: editUnit.trim() || null,
      }));
      setEditing(false);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm(t('property.delete_confirm'))) return;
    setDeleting(true);
    const response = await fetch(`/api/properties/${property.id}`, { method: 'DELETE' });
    if (response.ok) {
      router.push('/landlord/properties');
    }
    setDeleting(false);
  };

  const handleDeleteContract = async (contractId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(t('contract.delete_confirm') || 'Delete this contract?')) return;
    setDeletingContractId(contractId);
    const res = await fetch(`/api/contracts/${contractId}`, { method: 'DELETE' });
    if (res.ok) {
      setContracts((prev) => prev.filter((c) => c.id !== contractId));
    }
    setDeletingContractId(null);
  };

  const [terminatingContractId, setTerminatingContractId] = useState<string | null>(null);

  const handleTerminateContract = async (contractId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      !confirm(
        t('contract.terminate_confirm') ||
          'Are you sure you want to terminate this contract? This action cannot be undone.'
      )
    )
      return;
    setTerminatingContractId(contractId);
    const res = await fetch(`/api/contracts/${contractId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'terminated' }),
    });
    if (res.ok) {
      setContracts((prev) =>
        prev.map((c) => (c.id === contractId ? { ...c, status: 'terminated' } : c))
      );
    }
    setTerminatingContractId(null);
  };

  const handleRenewLease = async () => {
    if (!renewLeaseEnd) return;
    setRenewSaving(true);
    setRenewError(null);
    try {
      const res = await fetch(`/api/properties/${property.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lease_end: renewLeaseEnd }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setRenewError(json.error ?? t('property.renew_error'));
        return;
      }
      setProperty((prev) => ({ ...prev, lease_end: renewLeaseEnd }));
      setShowRenewForm(false);
      setRenewalDismissed(false);
    } catch {
      setRenewError(t('property.renew_error'));
    } finally {
      setRenewSaving(false);
    }
  };

  const handleEndTenancy = async () => {
    if (!confirm(t('property.end_tenancy_confirm'))) return;
    setEndingTenancy(true);
    try {
      const res = await fetch(`/api/properties/${property.id}/end-tenancy`, { method: 'POST' });
      if (res.ok) {
        const json = (await res.json()) as { newPairCode?: string };
        setProperty((prev) => ({
          ...prev,
          current_tenant_id: null,
          pair_code: json.newPairCode ?? prev.pair_code,
          pair_code_rotated_at: json.newPairCode
            ? new Date().toISOString()
            : prev.pair_code_rotated_at,
          previous_tenant_count: prev.previous_tenant_count + 1,
        }));
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setEndingTenancy(false);
    }
  };

  const tenantIds = contracts.map((c) => c.tenant_id).filter(Boolean) as string[];
  const uniqueTenantIds = Array.from(new Set(tenantIds));

  const handleSendNotification = async () => {
    if (!notifMessage.trim() || uniqueTenantIds.length === 0) return;
    setSendingNotif(true);
    setNotifSent(false);
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: uniqueTenantIds[0],
          title: t('property.send_notification'),
          body: notifMessage.trim(),
        }),
      });
      if (res.ok) {
        setNotifSent(true);
        setNotifMessage('');
        setTimeout(() => setNotifSent(false), 3000);
      }
    } catch {
      // Silently fail for now
    } finally {
      setSendingNotif(false);
    }
  };

  const defaultTab: Tab = 'contracts';

  const tabs: { key: Tab; label: string; count?: number; alert?: boolean }[] = [
    { key: 'contracts', label: t('nav.contracts'), count: contracts.length },
    {
      key: 'payments',
      label: t('property.tab_payments'),
      count: payments.length > 0 ? payments.length : undefined,
    },
    ...(uniqueTenantIds.length > 0
      ? [{ key: 'notify' as Tab, label: t('property.send_notification') }]
      : []),
  ];

  const pairedTenantName = property.current_tenant_id
    ? (tenants[property.current_tenant_id]?.full_name ?? null)
    : null;

  // Format lease date range for display
  const leaseDateRange =
    property.lease_start || property.lease_end
      ? `${formatDisplayDate(property.lease_start) || '—'} – ${formatDisplayDate(property.lease_end) || '—'}`
      : null;

  return (
    <div className="mx-auto max-w-3xl">
      {/* ----------------------------------------------------------------- */}
      {/* Status header                                                       */}
      {/* ----------------------------------------------------------------- */}
      <div className="mb-5 rounded-xl bg-white dark:bg-charcoal-800 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Property name */}
            <h1 className="text-xl font-bold text-charcoal-900 dark:text-white truncate">
              {property.name}
            </h1>

            {/* Status pill + lease dates row */}
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <StatusPill status={propertyStatus} />
              {leaseDateRange ? (
                <span className="text-xs text-charcoal-500">{leaseDateRange}</span>
              ) : (
                <span className="text-xs text-charcoal-400">{t('property.no_lease_dates')}</span>
              )}
              {property.monthly_rent && (
                <span className="text-xs font-semibold text-charcoal-700">
                  ฿{property.monthly_rent.toLocaleString()}
                  {t('property.per_month')}
                </span>
              )}
            </div>

            {property.address && (
              <p className="mt-2 text-sm text-charcoal-500">{property.address}</p>
            )}
            {property.unit_number && (
              <p className="text-xs text-charcoal-400">
                {t('property.unit')}: {property.unit_number}
              </p>
            )}
          </div>

          {/* Edit / Delete buttons */}
          <div className="flex gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-charcoal-400 dark:text-white/40 hover:text-charcoal-600 dark:hover:text-white/60 hover:bg-warm-100 dark:hover:bg-white/10"
              title={t('property.edit')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path d="M13.488 2.513a1.75 1.75 0 00-2.475 0L6.75 6.774a2.75 2.75 0 00-.596.892l-.848 2.047a.75.75 0 00.98.98l2.047-.848a2.75 2.75 0 00.892-.596l4.261-4.262a1.75 1.75 0 000-2.474z" />
                <path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9A.75.75 0 0114 9v2.25A2.75 2.75 0 0111.25 14h-6.5A2.75 2.75 0 012 11.25v-6.5A2.75 2.75 0 014.75 2H7a.75.75 0 010 1.5H4.75z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-charcoal-400 dark:text-white/40 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
              title={t('property.delete')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M5 3.25V4H2.75a.75.75 0 000 1.5h.3l.815 8.15A1.5 1.5 0 005.357 15h5.285a1.5 1.5 0 001.493-1.35l.815-8.15h.3a.75.75 0 000-1.5H11v-.75A2.25 2.25 0 008.75 1h-1.5A2.25 2.25 0 005 3.25zm2.25-.75a.75.75 0 00-.75.75V4h3v-.75a.75.75 0 00-.75-.75h-1.5zM6.05 6a.75.75 0 01.787.713l.275 5.5a.75.75 0 01-1.498.075l-.275-5.5A.75.75 0 016.05 6zm3.9 0a.75.75 0 01.712.787l-.275 5.5a.75.75 0 01-1.498-.075l.275-5.5a.75.75 0 01.786-.711z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Lease management actions */}
        {propertyStatus === 'expiring' && !renewalDismissed && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="mb-3 text-sm font-medium text-amber-800">
              {t('property.expiring_prompt')}
            </p>
            {showRenewForm ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-charcoal-700">
                    {t('property.new_lease_end')}
                  </label>
                  <input
                    type="date"
                    value={renewLeaseEnd}
                    onChange={(e) => setRenewLeaseEnd(e.target.value)}
                    min={property.lease_end ?? undefined}
                    className="block w-full rounded-lg border border-warm-300 dark:border-white/15 bg-white dark:bg-charcoal-800 dark:text-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                  />
                </div>
                {renewError && <p className="text-xs text-red-600">{renewError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleRenewLease}
                    disabled={renewSaving || !renewLeaseEnd}
                    className="min-h-[36px] rounded-lg bg-saffron-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-saffron-600 disabled:opacity-50"
                  >
                    {renewSaving ? t('common.loading') : t('property.renew_save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRenewForm(false)}
                    className="min-h-[36px] rounded-lg border border-warm-300 dark:border-white/15 px-4 py-1.5 text-sm font-medium text-charcoal-700 dark:text-white/70 hover:bg-warm-50 dark:hover:bg-white/5"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowRenewForm(true)}
                  className="min-h-[36px] rounded-lg bg-saffron-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-saffron-600"
                >
                  {t('property.renew_lease')}
                </button>
                <button
                  type="button"
                  onClick={() => setRenewalDismissed(true)}
                  className="min-h-[36px] rounded-lg border border-amber-300 bg-white px-4 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50"
                >
                  {t('property.no_renewal')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* End Tenancy — visible when a tenant is paired */}
        {property.current_tenant_id && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleEndTenancy}
              disabled={endingTenancy}
              className="min-h-[36px] rounded-lg border border-red-200 bg-white px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {endingTenancy ? t('common.loading') : t('property.end_tenancy')}
            </button>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Edit form (replaces status header when editing)                    */}
      {/* ----------------------------------------------------------------- */}
      {editing && (
        <div className="mb-5 rounded-xl bg-white dark:bg-charcoal-800 p-5 shadow-sm space-y-3">
          {/* Cover image picker */}
          <div>
            <label className="mb-1 block text-xs font-medium text-charcoal-500 dark:text-white/50">
              {t('property.cover_image_label')}
            </label>
            <div className="flex items-start gap-3">
              <div className="h-[120px] w-[120px] shrink-0 overflow-hidden rounded-lg border border-warm-200 dark:border-white/10 bg-warm-50 dark:bg-charcoal-900">
                {coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverUrl}
                    alt={t('property.cover_image_label')}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-charcoal-300 dark:text-white/30">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-10 w-10"
                    >
                      <path
                        fillRule="evenodd"
                        d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="cover-image-input"
                  className={`inline-flex min-h-[36px] cursor-pointer items-center rounded-lg border border-warm-300 dark:border-white/15 px-3 py-1.5 text-sm font-medium text-charcoal-700 dark:text-white/70 hover:bg-warm-50 dark:hover:bg-white/5 ${coverUploading ? 'pointer-events-none opacity-50' : ''}`}
                >
                  {coverUploading
                    ? t('property.cover_image_uploading')
                    : t('property.cover_image_upload')}
                  <input
                    id="cover-image-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={handleCoverUpload}
                    disabled={coverUploading}
                  />
                </label>
                {coverUrl && (
                  <button
                    type="button"
                    onClick={handleCoverRemove}
                    disabled={coverUploading}
                    className="inline-flex min-h-[36px] items-center rounded-lg border border-warm-300 dark:border-white/15 px-3 py-1.5 text-sm font-medium text-charcoal-500 dark:text-white/50 hover:bg-warm-50 dark:hover:bg-white/5 disabled:opacity-50"
                  >
                    {t('property.cover_image_remove')}
                  </button>
                )}
                {coverError && <p className="text-xs text-red-600">{coverError}</p>}
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-name"
              className="mb-1 block text-xs font-medium text-charcoal-500 dark:text-white/50"
            >
              {t('property.name')}
            </label>
            <input
              id="edit-name"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="block w-full rounded-lg border border-warm-300 dark:border-white/15 bg-white dark:bg-charcoal-800 px-3 py-2 text-sm text-charcoal-900 dark:text-white focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
            />
          </div>
          <div>
            <label
              htmlFor="edit-address"
              className="mb-1 block text-xs font-medium text-charcoal-500 dark:text-white/50"
            >
              {t('property.address')}
            </label>
            <input
              id="edit-address"
              type="text"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              className="block w-full rounded-lg border border-warm-300 dark:border-white/15 bg-white dark:bg-charcoal-800 px-3 py-2 text-sm text-charcoal-900 dark:text-white focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
            />
          </div>
          <div>
            <label
              htmlFor="edit-unit"
              className="mb-1 block text-xs font-medium text-charcoal-500 dark:text-white/50"
            >
              {t('property.unit')}
            </label>
            <input
              id="edit-unit"
              type="text"
              value={editUnit}
              onChange={(e) => setEditUnit(e.target.value)}
              className="block w-full rounded-lg border border-warm-300 dark:border-white/15 bg-white dark:bg-charcoal-800 px-3 py-2 text-sm text-charcoal-900 dark:text-white focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !editName.trim()}
              className="min-h-[44px] rounded-lg bg-saffron-500 px-4 py-2 text-sm font-medium text-white hover:bg-saffron-600 disabled:opacity-50"
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setEditName(property.name);
                setEditAddress(property.address ?? '');
                setEditUnit(property.unit_number ?? '');
              }}
              className="min-h-[44px] rounded-lg border border-warm-300 dark:border-white/15 px-4 py-2 text-sm font-medium text-charcoal-700 dark:text-white/70 hover:bg-warm-50 dark:hover:bg-white/5"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* QR section — always visible                                         */}
      {/* ----------------------------------------------------------------- */}
      <PropertyQRSection
        property={property}
        pairedTenantName={pairedTenantName}
        onPropertyUpdate={handlePropertyUpdate}
      />

      {/* Previous tenants count (shown below QR section) */}
      {property.previous_tenant_count > 0 && (
        <p className="mt-2 px-1 text-xs text-charcoal-400">
          {t('pairing.previous_tenants').replace('{n}', String(property.previous_tenant_count))}
        </p>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Photo gallery                                                       */}
      {/* ----------------------------------------------------------------- */}
      <div className="mb-5 mt-5">
        <PropertyImageGallery propertyId={property.id} />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Tab bar                                                             */}
      {/* ----------------------------------------------------------------- */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {tabs.map((tb) => {
          const active = (tab ?? defaultTab) === tb.key;
          return (
            <button
              key={tb.key}
              type="button"
              onClick={() => setTab(tb.key)}
              className={`min-h-[32px] rounded-full px-3.5 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'bg-charcoal-900 dark:bg-white/10 text-white'
                  : tb.alert
                    ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 hover:bg-amber-100'
                    : 'bg-warm-100 dark:bg-white/5 text-charcoal-600 dark:text-white/60 hover:bg-warm-200 dark:hover:bg-white/10'
              }`}
            >
              {tb.alert && !active && (
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
              )}
              {tb.label}
              {tb.count != null && tb.count > 0 && (
                <span className="ml-1 text-[10px] opacity-70">({tb.count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Tab: Contracts                                                      */}
      {/* ----------------------------------------------------------------- */}
      {(tab ?? defaultTab) === 'contracts' && (
        <>
          {/* Hide contract creation buttons when an active, pending, or scheduled contract already exists */}
          {!contracts.some((c) => ['active', 'pending', 'scheduled'].includes(c.status)) && (
            <div className="mb-3 flex gap-2">
              <Link
                href={`/landlord/contracts/create?property_id=${property.id}`}
                className="min-h-[36px] flex items-center rounded-lg bg-saffron-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-saffron-600"
              >
                {t('nav.create_contract')}
              </Link>
              <Link
                href={`/landlord/contracts/upload?property_id=${property.id}`}
                className="min-h-[36px] flex items-center rounded-lg border border-warm-300 dark:border-white/15 bg-white dark:bg-charcoal-800 px-3 py-1.5 text-xs font-medium text-charcoal-700 dark:text-white/70 hover:bg-warm-50 dark:hover:bg-white/5"
              >
                {t('contract.upload_new')}
              </Link>
            </div>
          )}

          {contracts.length === 0 ? (
            <div className="rounded-lg bg-white dark:bg-charcoal-800 p-8 text-center shadow-sm">
              <p className="text-sm text-charcoal-500 dark:text-white/50">
                {t('property.no_contracts')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {contracts.map((c) => {
                const tenant = c.tenant_id ? tenants[c.tenant_id] : null;
                const canDelete = [
                  'pending',
                  'draft',
                  'expired',
                  'parse_failed',
                  'terminated',
                ].includes(c.status);
                const canTerminate = c.status === 'active' || c.status === 'scheduled';
                return (
                  <Link key={c.id} href={`/landlord/contracts/${c.id}`}>
                    <div className="group rounded-lg bg-white dark:bg-charcoal-800 p-4 shadow-sm transition-shadow hover:shadow-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={c.status} />
                          {c.monthly_rent && (
                            <span className="text-sm font-semibold text-charcoal-900 dark:text-white">
                              {c.monthly_rent.toLocaleString()}/
                              {t('contract.monthly_rent').toLowerCase().includes('month')
                                ? 'mo'
                                : '\u0E40\u0E14\u0E37\u0E2D\u0E19'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {canTerminate && (
                            <button
                              type="button"
                              onClick={(e) => handleTerminateContract(c.id, e)}
                              disabled={terminatingContractId === c.id}
                              className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all disabled:opacity-50"
                            >
                              {terminatingContractId === c.id
                                ? '...'
                                : t('contract.terminate') || 'Terminate'}
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteContract(c.id, e)}
                              disabled={deletingContractId === c.id}
                              className="h-8 w-8 flex items-center justify-center rounded-lg text-charcoal-300 dark:text-white/30 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all disabled:opacity-50"
                              title={t('contract.delete') || 'Delete'}
                            >
                              {deletingContractId === c.id ? (
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
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 16 16"
                                  fill="currentColor"
                                  className="h-4 w-4"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M5 3.25V4H2.75a.75.75 0 000 1.5h.3l.815 8.15A1.5 1.5 0 005.357 15h5.285a1.5 1.5 0 001.493-1.35l.815-8.15h.3a.75.75 0 000-1.5H11v-.75A2.25 2.25 0 008.75 1h-1.5A2.25 2.25 0 005 3.25zm2.25-.75a.75.75 0 00-.75.75V4h3v-.75a.75.75 0 00-.75-.75h-1.5zM6.05 6a.75.75 0 01.787.713l.275 5.5a.75.75 0 01-1.498.075l-.275-5.5A.75.75 0 016.05 6zm3.9 0a.75.75 0 01.712.787l-.275 5.5a.75.75 0 01-1.498-.075l.275-5.5a.75.75 0 01.786-.711z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </button>
                          )}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-4 w-4 text-charcoal-300 dark:text-white/30"
                          >
                            <path
                              fillRule="evenodd"
                              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                      {(c.lease_start || c.lease_end) && (
                        <p className="mt-1.5 text-xs text-charcoal-500 dark:text-white/50">
                          {formatDisplayDate(c.lease_start) || '\u2014'} &rarr;{' '}
                          {formatDisplayDate(c.lease_end) || '\u2014'}
                        </p>
                      )}
                      {tenant && (
                        <p className="mt-1 text-xs text-charcoal-500 dark:text-white/50">
                          {tenant.full_name ?? '\u2014'}
                          {tenant.phone ? ` \u00B7 ${formatPhone(tenant.phone)}` : ''}
                        </p>
                      )}
                      {!c.tenant_id && (
                        <p className="mt-1 text-xs italic text-charcoal-400 dark:text-white/40">
                          {t('property.no_tenant')}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Tab: Payments                                                       */}
      {/* ----------------------------------------------------------------- */}
      {(tab ?? defaultTab) === 'payments' && (
        <PropertyPaymentsTab
          contracts={contracts as unknown as ContractForPayments[]}
          payments={payments}
          propertyName={property.name}
        />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Tab: Maintenance                                                    */}
      {/* ----------------------------------------------------------------- */}
      {/* ----------------------------------------------------------------- */}
      {/* Tab: Send Notification                                              */}
      {/* ----------------------------------------------------------------- */}
      {(tab ?? defaultTab) === 'notify' && uniqueTenantIds.length > 0 && (
        <div className="rounded-lg bg-white dark:bg-charcoal-800 p-5 shadow-sm">
          <textarea
            value={notifMessage}
            onChange={(e) => setNotifMessage(e.target.value)}
            placeholder={t('property.notification_placeholder')}
            rows={3}
            className="w-full rounded-lg border border-warm-200 px-3 py-2 text-sm text-charcoal-900 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSendNotification}
              disabled={sendingNotif || !notifMessage.trim()}
              className="min-h-[44px] rounded-lg bg-saffron-500 px-4 py-2 text-sm font-medium text-white hover:bg-saffron-600 disabled:opacity-50"
            >
              {sendingNotif ? t('common.loading') : t('property.send_button')}
            </button>
            {notifSent && (
              <p className="text-sm font-medium text-green-600">
                {t('property.notification_sent')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported wrapper — wraps the inner component in Suspense so useSearchParams
// doesn't break static generation (same pattern as /pair).
// ---------------------------------------------------------------------------
export function PropertyDetailClient(props: PropertyDetailClientProps) {
  return (
    <Suspense fallback={null}>
      <PropertyDetailInner {...props} />
    </Suspense>
  );
}

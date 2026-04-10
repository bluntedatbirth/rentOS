'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PropertyImageGallery } from '@/components/landlord/PropertyImageGallery';
import { ProRibbon } from '@/components/ui/ProRibbon';

const supabase = createClient();

interface PropertyDetail {
  id: string;
  name: string;
  address: string | null;
  unit_number: string | null;
  created_at: string;
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

interface MaintenanceRequest {
  id: string;
  title: string;
  status: string;
  created_at: string;
  contract_id: string;
}

interface TenantProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
}

type Tab = 'contracts' | 'maintenance' | 'notify';

interface PropertyDetailClientProps {
  property: PropertyDetail;
  initialContracts: LinkedContract[];
  initialMaintenance: MaintenanceRequest[];
  initialTenants: Record<string, TenantProfile>;
}

export function PropertyDetailClient({
  property: initialProperty,
  initialContracts,
  initialMaintenance,
  initialTenants,
}: PropertyDetailClientProps) {
  const router = useRouter();
  const { t, formatDate, formatPhone } = useI18n();

  const [property, setProperty] = useState<PropertyDetail>(initialProperty);
  const [contracts, setContracts] = useState<LinkedContract[]>(initialContracts);
  const [maintenance] = useState<MaintenanceRequest[]>(initialMaintenance);
  const [tenants] = useState<Record<string, TenantProfile>>(initialTenants);

  const [deleting, setDeleting] = useState(false);
  const [deletingContractId, setDeletingContractId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab | null>(null);

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

  // Show maintenance first if there are open requests
  const hasOpenMaintenance = maintenance.some(
    (m) => m.status === 'open' || m.status === 'in_progress'
  );
  const defaultTab: Tab = hasOpenMaintenance ? 'maintenance' : 'contracts';

  const tabs: { key: Tab; label: string; count?: number; alert?: boolean }[] = [
    { key: 'contracts', label: t('nav.contracts'), count: contracts.length },
    {
      key: 'maintenance',
      label: t('nav.maintenance'),
      count: maintenance.length,
      alert: hasOpenMaintenance,
    },
    ...(uniqueTenantIds.length > 0
      ? [{ key: 'notify' as Tab, label: t('property.send_notification') }]
      : []),
  ];

  // Computed stats
  const activeContract = contracts.find((c) => c.status === 'active');
  const totalRent = activeContract?.monthly_rent;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Back to Properties */}
      <Link
        href="/landlord/properties"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
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
        {t('nav.properties')}
      </Link>

      {/* Property hero card */}
      <div className="mb-5 rounded-xl bg-white shadow-sm overflow-hidden">
        {editing ? (
          <div className="p-5 space-y-3">
            <div>
              <label htmlFor="edit-name" className="mb-1 block text-xs font-medium text-gray-500">
                {t('property.name')}
              </label>
              <input
                id="edit-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
              />
            </div>
            <div>
              <label
                htmlFor="edit-address"
                className="mb-1 block text-xs font-medium text-gray-500"
              >
                {t('property.address')}
              </label>
              <input
                id="edit-address"
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
              />
            </div>
            <div>
              <label htmlFor="edit-unit" className="mb-1 block text-xs font-medium text-gray-500">
                {t('property.unit')}
              </label>
              <input
                id="edit-unit"
                type="text"
                value={editUnit}
                onChange={(e) => setEditUnit(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
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
                className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-saffron-50 text-saffron-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-5 w-5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-gray-900 truncate">{property.name}</h2>
                    {property.unit_number && (
                      <p className="text-xs text-gray-500">
                        {t('property.unit')}: {property.unit_number}
                      </p>
                    )}
                  </div>
                </div>
                {property.address && (
                  <p className="mt-2 text-sm text-gray-500 pl-11">{property.address}</p>
                )}
              </div>
              {/* Action menu */}
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
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
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
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

            {/* Quick stats row */}
            {totalRent && (
              <div className="mt-3 ml-11 flex items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                  {totalRent.toLocaleString()} /
                  {t('contract.monthly_rent').toLowerCase().includes('month')
                    ? 'mo'
                    : '\u0E40\u0E14\u0E37\u0E2D\u0E19'}
                </span>
                {activeContract && (
                  <span className="text-xs text-gray-400">
                    {activeContract.lease_start} &rarr; {activeContract.lease_end}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Photo gallery */}
      <div className="mb-5">
        <PropertyImageGallery propertyId={property.id} />
      </div>

      {/* Tab bar */}
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
                  ? 'bg-gray-900 text-white'
                  : tb.alert
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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

      {/* Tab: Contracts */}
      {(tab ?? defaultTab) === 'contracts' && (
        <>
          <div className="mb-3 flex gap-2">
            <Link
              href="/landlord/contracts/create"
              className="relative overflow-hidden min-h-[36px] flex items-center rounded-lg bg-saffron-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-saffron-600"
            >
              {t('nav.create_contract')}
              <ProRibbon size="sm" />
            </Link>
            <Link
              href="/landlord/contracts/upload"
              className="min-h-[36px] flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('contract.upload_new')}
            </Link>
          </div>

          {contracts.length === 0 ? (
            <div className="rounded-lg bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-gray-500">{t('property.no_contracts')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contracts.map((c) => {
                const tenant = c.tenant_id ? tenants[c.tenant_id] : null;
                const canDelete = c.status === 'pending' || c.status === 'draft';
                return (
                  <Link key={c.id} href={`/landlord/contracts/${c.id}`}>
                    <div className="group rounded-lg bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={c.status} />
                          {c.monthly_rent && (
                            <span className="text-sm font-semibold text-gray-900">
                              {c.monthly_rent.toLocaleString()}/
                              {t('contract.monthly_rent').toLowerCase().includes('month')
                                ? 'mo'
                                : '\u0E40\u0E14\u0E37\u0E2D\u0E19'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {canDelete && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteContract(c.id, e)}
                              disabled={deletingContractId === c.id}
                              className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
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
                            className="h-4 w-4 text-gray-300"
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
                        <p className="mt-1.5 text-xs text-gray-500">
                          {c.lease_start ?? '\u2014'} &rarr; {c.lease_end ?? '\u2014'}
                        </p>
                      )}
                      {tenant && (
                        <p className="mt-1 text-xs text-gray-500">
                          {tenant.full_name ?? '\u2014'}
                          {tenant.phone ? ` \u00B7 ${formatPhone(tenant.phone)}` : ''}
                        </p>
                      )}
                      {!c.tenant_id && (
                        <p className="mt-1 text-xs italic text-gray-400">
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

      {/* Tab: Maintenance */}
      {(tab ?? defaultTab) === 'maintenance' && (
        <>
          {maintenance.length === 0 ? (
            <div className="rounded-lg bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-gray-500">{t('maintenance.no_requests')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {maintenance.map((m) => (
                <Link key={m.id} href="/landlord/maintenance">
                  <div className="rounded-lg bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{m.title}</p>
                      <StatusBadge status={m.status} />
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500">{formatDate(m.created_at)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab: Send Notification */}
      {(tab ?? defaultTab) === 'notify' && uniqueTenantIds.length > 0 && (
        <div className="rounded-lg bg-white p-5 shadow-sm">
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

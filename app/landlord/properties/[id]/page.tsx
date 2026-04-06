'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

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

interface TenantProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [contracts, setContracts] = useState<LinkedContract[]>([]);
  const [tenants, setTenants] = useState<Record<string, TenantProfile>>({});
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    if (!user || !id) return;

    const [propRes, contractsRes] = await Promise.all([
      supabase
        .from('properties')
        .select('id, name, address, unit_number, created_at')
        .eq('id', id)
        .eq('landlord_id', user.id)
        .eq('is_active', true)
        .single(),
      supabase
        .from('contracts')
        .select('id, status, lease_start, lease_end, monthly_rent, tenant_id, created_at')
        .eq('property_id', id)
        .order('created_at', { ascending: false }),
    ]);

    setProperty(propRes.data as PropertyDetail | null);
    const contractList = (contractsRes.data ?? []) as LinkedContract[];
    setContracts(contractList);

    // Load tenant profiles for contracts that have tenant_id
    const tenantIds = Array.from(
      new Set(contractList.map((c) => c.tenant_id).filter(Boolean))
    ) as string[];
    if (tenantIds.length > 0) {
      const { data: tenantData } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', tenantIds);
      const tenantMap: Record<string, TenantProfile> = {};
      (tenantData ?? []).forEach((tp) => {
        const profile = tp as unknown as TenantProfile;
        tenantMap[profile.id] = profile;
      });
      setTenants(tenantMap);
    }

    setLoading(false);
  }, [user, id, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async () => {
    if (!confirm(t('property.delete_confirm'))) return;
    setDeleting(true);
    const response = await fetch(`/api/properties/${id}`, { method: 'DELETE' });
    if (response.ok) {
      router.push('/landlord/properties');
    }
    setDeleting(false);
  };

  if (loading) return <LoadingSkeleton count={4} />;

  if (!property) {
    return <div className="py-12 text-center text-gray-500">Property not found</div>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/landlord/properties"
            className="mb-2 inline-block text-sm text-blue-600 hover:text-blue-800"
          >
            ← {t('common.back')}
          </Link>
          <h2 className="text-xl font-bold text-gray-900">{t('property.detail_title')}</h2>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="min-h-[44px] rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {t('property.delete')}
        </button>
      </div>

      {/* Property info card */}
      <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">{property.name}</h3>
        {property.unit_number && (
          <p className="mt-1 text-sm text-gray-600">
            {t('property.unit')}: {property.unit_number}
          </p>
        )}
        {property.address && <p className="mt-1 text-sm text-gray-500">{property.address}</p>}
      </div>

      {/* Linked contracts */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{t('property.linked_contracts')}</h3>
        <Link
          href="/landlord/contracts/upload"
          className="min-h-[44px] flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t('contract.upload_new')}
        </Link>
      </div>

      {contracts.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-500">
          {t('property.no_contracts')}
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => {
            const tenant = c.tenant_id ? tenants[c.tenant_id] : null;
            return (
              <Link key={c.id} href={`/landlord/contracts/${c.id}`}>
                <div className="rounded-lg bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={c.status} />
                      {c.monthly_rent && (
                        <span className="text-sm font-medium text-gray-900">
                          ฿{c.monthly_rent.toLocaleString()}/
                          {t('contract.monthly_rent').toLowerCase().includes('month')
                            ? 'mo'
                            : 'เดือน'}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{t('contract.view')} →</span>
                  </div>

                  {/* Lease period */}
                  {(c.lease_start || c.lease_end) && (
                    <p className="mt-2 text-xs text-gray-500">
                      {t('contract.lease_period')}: {c.lease_start ?? '—'} → {c.lease_end ?? '—'}
                    </p>
                  )}

                  {/* Tenant info */}
                  <div className="mt-2 text-xs text-gray-500">
                    {t('property.tenant')}:{' '}
                    {tenant ? (
                      <span className="font-medium text-gray-700">
                        {tenant.full_name ?? '—'}
                        {tenant.phone ? ` · ${tenant.phone}` : ''}
                      </span>
                    ) : (
                      <span className="italic">{t('property.no_tenant')}</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

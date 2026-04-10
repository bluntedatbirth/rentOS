'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { createClient } from '@/lib/supabase/client';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

const supabase = createClient();

interface CoTenant {
  full_name: string;
  phone?: string;
}

export default function CoTenantsPage() {
  const { user } = useAuth();
  const { t, formatPhone } = useI18n();
  const [contractId, setContractId] = useState<string | null>(null);
  const [coTenants, setCoTenants] = useState<CoTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('contracts')
        .select('id, co_tenants')
        .eq('tenant_id', user.id)
        .eq('status', 'active')
        .limit(1);

      const contract = data?.[0] as unknown as
        | { id: string; co_tenants: CoTenant[] | null }
        | undefined;
      if (contract) {
        setContractId(contract.id);
        setCoTenants(contract.co_tenants ?? []);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleAdd = async () => {
    if (!contractId || !newName.trim()) return;
    setAdding(true);
    setError('');
    try {
      const res = await fetch('/api/pairing/co-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_id: contractId,
          full_name: newName.trim(),
          phone: newPhone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add co-tenant');
      setCoTenants(data.co_tenants);
      setNewName('');
      setNewPhone('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
    setAdding(false);
  };

  const handleRemove = async (index: number) => {
    if (!contractId) return;
    const res = await fetch('/api/pairing/co-tenant', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contract_id: contractId, index }),
    });
    const data = await res.json();
    if (res.ok) setCoTenants(data.co_tenants);
  };

  if (loading) return <LoadingSkeleton count={3} />;

  if (!contractId) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center text-sm text-charcoal-500">
        {t('tenant.no_contract')}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-2 text-xl font-bold text-charcoal-900">{t('co_tenants.title')}</h2>
      <p className="mb-6 text-sm text-charcoal-500">{t('co_tenants.description')}</p>

      {/* Current co-tenants */}
      {coTenants.length > 0 ? (
        <div className="mb-6 space-y-2">
          {coTenants.map((ct, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm"
            >
              <div>
                <p className="text-sm font-medium text-charcoal-900">{ct.full_name}</p>
                {ct.phone && <p className="text-xs text-charcoal-500">{formatPhone(ct.phone)}</p>}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="min-h-[44px] min-w-[44px] rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
              >
                {t('co_tenants.remove')}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-6 rounded-lg bg-warm-50 p-6 text-center text-sm text-charcoal-500">
          {t('co_tenants.none')}
        </div>
      )}

      {/* Add co-tenant form */}
      {coTenants.length < 2 && (
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-charcoal-900">{t('co_tenants.add')}</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('co_tenants.name_placeholder')}
              className="block w-full rounded-lg border border-warm-200 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
            />
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder={t('co_tenants.phone_placeholder')}
              className="block w-full rounded-lg border border-warm-200 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="min-h-[44px] w-full rounded-lg bg-saffron-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-saffron-600 disabled:opacity-50"
            >
              {adding ? t('common.loading') : t('co_tenants.add_button')}
            </button>
          </div>
          <p className="mt-2 text-xs text-charcoal-400">
            {t('co_tenants.limit').replace('{}', `${2 - coTenants.length}`)}
          </p>
        </div>
      )}
    </div>
  );
}

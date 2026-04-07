'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

interface MaintenanceRequest {
  id: string;
  contract_id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
}

export default function TenantMaintenancePage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [contractId, setContractId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const supabase = createClient();

  const loadData = useCallback(async () => {
    if (!user) return;

    // Find tenant's active contract
    const { data: contracts } = await supabase
      .from('contracts')
      .select('id')
      .eq('tenant_id', user.id)
      .eq('status', 'active')
      .limit(1);

    const cid = (contracts?.[0] as { id: string } | undefined)?.id ?? null;
    setContractId(cid);

    if (cid) {
      const { data } = await supabase
        .from('maintenance_requests')
        .select('id, contract_id, title, description, status, created_at')
        .eq('contract_id', cid)
        .order('created_at', { ascending: false });
      setRequests((data ?? []) as MaintenanceRequest[]);
    }

    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractId) return;
    setError('');
    setSubmitting(true);

    const res = await fetch('/api/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contract_id: contractId,
        title,
        description: description || undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? t('auth.error'));
    } else {
      setTitle('');
      setDescription('');
      setShowForm(false);
      await loadData();
    }

    setSubmitting(false);
  };

  if (loading) return <LoadingSkeleton count={3} />;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('tenant.maintenance_title')}</h2>
        {contractId && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {showForm ? t('common.cancel') : t('tenant.new_request')}
          </button>
        )}
      </div>

      {!contractId && <p className="text-sm text-gray-500">{t('tenant.no_contract')}</p>}

      {/* Submit form */}
      {showForm && contractId && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="mb-4">
            <label htmlFor="maint-title" className="mb-1 block text-sm font-medium text-gray-700">
              {t('tenant.request_title')}
            </label>
            <input
              id="maint-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder={t('tenant.request_title_placeholder')}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="maint-desc" className="mb-1 block text-sm font-medium text-gray-700">
              {t('tenant.request_description')}
            </label>
            <textarea
              id="maint-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder={t('tenant.request_description_placeholder')}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[44px] w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? t('common.loading') : t('tenant.submit_request')}
          </button>
        </form>
      )}

      {/* Requests list */}
      {requests.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-500">
          {t('tenant.no_maintenance')}
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="rounded-lg bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{req.title}</h3>
                <StatusBadge status={req.status} />
              </div>
              {req.description && <p className="mt-2 text-sm text-gray-600">{req.description}</p>}
              <p className="mt-2 text-xs text-gray-400">
                {new Date(req.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

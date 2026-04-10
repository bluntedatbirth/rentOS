'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface MaintenanceRequest {
  id: string;
  contract_id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  assigned_to: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  completed_at: string | null;
  photo_urls: string[] | null;
}

interface TenantMaintenanceClientProps {
  initialRequests: MaintenanceRequest[];
  contractId: string | null;
}

export function TenantMaintenanceClient({
  initialRequests,
  contractId,
}: TenantMaintenanceClientProps) {
  const { t, formatDate } = useI18n();
  const [requests, setRequests] = useState<MaintenanceRequest[]>(initialRequests);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedRequest = selectedId ? (requests.find((r) => r.id === selectedId) ?? null) : null;

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
      const newRequest = (await res.json()) as MaintenanceRequest;
      setRequests((prev) => [newRequest, ...prev]);
      setTitle('');
      setDescription('');
      setShowForm(false);
    }

    setSubmitting(false);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-charcoal-900">{t('tenant.maintenance_title')}</h2>
        {contractId && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="min-h-[44px] rounded-lg bg-saffron-500 px-4 py-2 text-sm font-medium text-white hover:bg-saffron-600"
          >
            {showForm ? t('common.cancel') : t('tenant.new_request')}
          </button>
        )}
      </div>

      {!contractId && <p className="text-sm text-charcoal-500">{t('tenant.no_contract')}</p>}

      {/* Submit form */}
      {showForm && contractId && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="mb-4">
            <label
              htmlFor="maint-title"
              className="mb-1 block text-sm font-medium text-charcoal-700"
            >
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
              className="block w-full rounded-lg border border-warm-200 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="maint-desc"
              className="mb-1 block text-sm font-medium text-charcoal-700"
            >
              {t('tenant.request_description')}
            </label>
            <textarea
              id="maint-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder={t('tenant.request_description_placeholder')}
              className="block w-full rounded-lg border border-warm-200 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
            />
          </div>
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[44px] w-full rounded-lg bg-saffron-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-saffron-600 disabled:opacity-50"
          >
            {submitting ? t('common.loading') : t('tenant.submit_request')}
          </button>
        </form>
      )}

      {/* Requests list */}
      {requests.length === 0 ? (
        <div className="rounded-lg bg-warm-50 p-8 text-center text-sm text-charcoal-500">
          {t('tenant.no_maintenance')}
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <button
              key={req.id}
              type="button"
              onClick={() => setSelectedId(req.id)}
              className="w-full cursor-pointer rounded-lg bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-charcoal-900">{req.title}</h3>
                <StatusBadge status={req.status} />
              </div>
              {req.description && (
                <p className="mt-2 text-sm text-charcoal-700">{req.description}</p>
              )}
              <p className="mt-2 text-xs text-charcoal-400">{formatDate(req.created_at)}</p>
            </button>
          ))}
        </div>
      )}

      {/* Read-only detail modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="text-base font-bold text-charcoal-900">
                {t('tenant.maintenance_detail_title')}
              </h3>
              <StatusBadge status={selectedRequest.status} />
            </div>

            <p className="mb-1 text-sm font-semibold text-charcoal-900">{selectedRequest.title}</p>
            <p className="mb-4 text-xs text-charcoal-400">
              {formatDate(selectedRequest.created_at)}
            </p>

            {selectedRequest.description && (
              <p className="mb-4 text-sm text-charcoal-700">{selectedRequest.description}</p>
            )}

            <div className="mb-4 space-y-2 text-sm">
              {selectedRequest.assigned_to && (
                <div className="flex justify-between">
                  <span className="text-charcoal-500">{t('tenant.maintenance_assigned_to')}</span>
                  <span className="text-charcoal-700">{selectedRequest.assigned_to}</span>
                </div>
              )}

              {selectedRequest.estimated_cost !== null && (
                <div className="flex justify-between">
                  <span className="text-charcoal-500">
                    {t('tenant.maintenance_estimated_cost')}
                  </span>
                  <span className="text-charcoal-700">
                    ฿{selectedRequest.estimated_cost.toLocaleString('en-US')}
                  </span>
                </div>
              )}

              {selectedRequest.actual_cost !== null && (
                <div className="flex justify-between">
                  <span className="text-charcoal-500">{t('tenant.maintenance_actual_cost')}</span>
                  <span className="text-charcoal-700">
                    ฿{selectedRequest.actual_cost.toLocaleString('en-US')}
                  </span>
                </div>
              )}

              {selectedRequest.completed_at && (
                <div className="flex justify-between">
                  <span className="text-charcoal-500">{t('tenant.maintenance_completed_at')}</span>
                  <span className="text-charcoal-700">
                    {formatDate(selectedRequest.completed_at)}
                  </span>
                </div>
              )}
            </div>

            {selectedRequest.photo_urls && selectedRequest.photo_urls.length > 0 && (
              <div className="mb-4 grid grid-cols-3 gap-2">
                {selectedRequest.photo_urls.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt="" className="h-24 w-full rounded-lg object-cover" />
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="min-h-[44px] w-full rounded-lg border border-warm-200 text-sm font-medium text-charcoal-700 hover:bg-warm-50"
            >
              {t('tenant.maintenance_close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

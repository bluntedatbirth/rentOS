'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProBadge } from '@/components/ui/ProBadge';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface MaintenanceRequest {
  id: string;
  contract_id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  // Pro fields
  assigned_to: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  sla_deadline: string | null;
  completed_at: string | null;
  property_name?: string;
  property_id?: string;
}

const statusOrder: Record<string, number> = {
  open: 0,
  in_progress: 1,
  resolved: 2,
};

function SlaCountdown({ deadline }: { deadline: string }) {
  const { t } = useI18n();
  const now = new Date();
  const end = new Date(deadline);
  const diffMs = end.getTime() - now.getTime();
  const isOverdue = diffMs < 0;
  const absDiff = Math.abs(diffMs);
  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  let label = '';
  if (isOverdue) {
    label =
      days > 0
        ? `${t('maintenance.overdue')} ${days}d ${hours}h`
        : `${t('maintenance.overdue')} ${hours}h`;
  } else {
    label =
      days > 0
        ? `${days}d ${hours}h ${t('maintenance.remaining')}`
        : `${hours}h ${t('maintenance.remaining')}`;
  }

  return (
    <span className={`text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-yellow-700'}`}>
      {label}
    </span>
  );
}

interface MaintenanceClientProps {
  initialRequests: MaintenanceRequest[];
  initialProperties: { id: string; name: string }[];
  isPro: boolean;
}

export function MaintenanceClient({
  initialRequests,
  initialProperties,
  isPro,
}: MaintenanceClientProps) {
  const { t, formatDate } = useI18n();
  const [requests, setRequests] = useState<MaintenanceRequest[]>(initialRequests);
  const [updating, setUpdating] = useState<string | null>(null);
  const [propertyFilter, setPropertyFilter] = useState<string>('all');

  // Resolve modal state
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [actualCost, setActualCost] = useState<string>('');

  // Edit Pro fields modal state
  const [editProId, setEditProId] = useState<string | null>(null);
  const [editAssignedTo, setEditAssignedTo] = useState<string>('');
  const [editEstimatedCost, setEditEstimatedCost] = useState<string>('');
  const [editSlaDeadline, setEditSlaDeadline] = useState<string>('');

  const reloadRequests = async () => {
    // Fetch fresh data from server via Supabase client
    const [propsRes, maintenanceRes] = await Promise.all([
      supabase.from('properties').select('id, name'),
      supabase
        .from('maintenance_requests')
        .select(
          'id, contract_id, title, description, status, created_at, assigned_to, estimated_cost, actual_cost, sla_deadline, completed_at'
        )
        .order('created_at', { ascending: false }),
    ]);

    const propsData = propsRes.data ?? [];
    const maintenanceData = maintenanceRes.data ?? [];

    if (propsData.length === 0) return;

    const propertyMap = new Map<string, string>();
    for (const p of propsData) {
      propertyMap.set(p.id, p.name);
    }

    const contractIds = Array.from(new Set(maintenanceData.map((r) => r.contract_id)));
    const contractPropertyMap = new Map<string, string>();

    if (contractIds.length > 0) {
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id, property_id')
        .in('id', contractIds);

      for (const c of contracts ?? []) {
        if (c.property_id) contractPropertyMap.set(c.id, c.property_id);
      }
    }

    const enriched: MaintenanceRequest[] = (maintenanceData as MaintenanceRequest[]).map((req) => {
      const propId = contractPropertyMap.get(req.contract_id) ?? '';
      return {
        ...req,
        property_id: propId,
        property_name: propertyMap.get(propId) ?? '',
      };
    });

    enriched.sort((a, b) => {
      const statusDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setRequests(enriched);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    if (newStatus === 'resolved' && isPro) {
      setResolveId(id);
      return;
    }
    await doUpdate(id, { status: newStatus });
  };

  const doUpdate = async (id: string, payload: Record<string, unknown>) => {
    setUpdating(id);
    const res = await fetch(`/api/maintenance/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      await reloadRequests();
    }
    setUpdating(null);
  };

  const handleResolveSubmit = async () => {
    if (!resolveId) return;
    const payload: Record<string, unknown> = { status: 'resolved' };
    if (isPro && actualCost !== '') {
      const cost = parseFloat(actualCost);
      if (!isNaN(cost)) payload.actual_cost = cost;
    }
    await doUpdate(resolveId, payload);
    setResolveId(null);
    setActualCost('');
  };

  const openEditProModal = (req: MaintenanceRequest) => {
    setEditProId(req.id);
    setEditAssignedTo(req.assigned_to ?? '');
    setEditEstimatedCost(req.estimated_cost !== null ? String(req.estimated_cost) : '');
    setEditSlaDeadline(
      req.sla_deadline ? new Date(req.sla_deadline).toISOString().slice(0, 16) : ''
    );
  };

  const handleEditProSubmit = async () => {
    if (!editProId) return;
    const payload: Record<string, unknown> = {};
    payload.assigned_to = editAssignedTo || null;
    if (editEstimatedCost !== '') {
      const cost = parseFloat(editEstimatedCost);
      if (!isNaN(cost)) payload.estimated_cost = cost;
    } else {
      payload.estimated_cost = null;
    }
    payload.sla_deadline = editSlaDeadline ? new Date(editSlaDeadline).toISOString() : null;
    await doUpdate(editProId, payload);
    setEditProId(null);
  };

  const statusLabel = (status: string) => {
    if (status === 'open') return t('maintenance.status_open');
    if (status === 'in_progress') return t('maintenance.status_in_progress');
    if (status === 'resolved') return t('maintenance.status_resolved');
    return status;
  };

  const filteredRequests =
    propertyFilter === 'all' ? requests : requests.filter((r) => r.property_id === propertyFilter);

  const openCount = requests.filter((r) => r.status === 'open').length;
  const inProgressCount = requests.filter((r) => r.status === 'in_progress').length;
  const resolvedCount = requests.filter((r) => r.status === 'resolved').length;

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-6 text-xl font-bold text-gray-900">{t('maintenance.title')}</h2>

      {/* Summary stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-white p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-saffron-600">{openCount}</p>
          <p className="text-xs text-gray-500">{t('maintenance.open_count')}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-purple-600">{inProgressCount}</p>
          <p className="text-xs text-gray-500">{t('maintenance.in_progress_count')}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-green-600">{resolvedCount}</p>
          <p className="text-xs text-gray-500">{t('maintenance.resolved_count')}</p>
        </div>
      </div>

      {/* Property filter */}
      {initialProperties.length > 1 && (
        <div className="mb-4">
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 text-sm sm:w-auto sm:min-w-[220px]"
          >
            <option value="all">{t('maintenance.filter_all_properties')}</option>
            {initialProperties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Requests list */}
      {filteredRequests.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-500">
          {t('maintenance.no_requests')}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => (
            <div key={req.id} className="rounded-lg bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{req.title}</h3>
                <StatusBadge status={req.status} label={statusLabel(req.status)} />
              </div>

              {req.description && <p className="mt-2 text-sm text-gray-600">{req.description}</p>}

              {/* Pro fields display */}
              {isPro && (
                <div className="mt-3 rounded-lg bg-amber-50 p-3 space-y-1">
                  {req.assigned_to ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500 font-medium">
                        {t('maintenance.assign_technician')}:
                      </span>
                      <span className="text-gray-800">{req.assigned_to}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 italic">
                      {t('maintenance.assign_technician')}: —
                    </div>
                  )}
                  {req.sla_deadline ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500 font-medium">
                        {t('maintenance.sla_deadline')}:
                      </span>
                      <span className="text-gray-800">{formatDate(req.sla_deadline)}</span>
                      <SlaCountdown deadline={req.sla_deadline} />
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 italic">
                      {t('maintenance.sla_deadline')}: —
                    </div>
                  )}
                  {req.estimated_cost !== null || req.actual_cost !== null ? (
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      {req.estimated_cost !== null && (
                        <span>
                          <span className="text-gray-500 font-medium">
                            {t('maintenance.estimated_cost')}:
                          </span>{' '}
                          <span className="text-gray-800">
                            ฿{req.estimated_cost.toLocaleString()}
                          </span>
                        </span>
                      )}
                      {req.actual_cost !== null && (
                        <span>
                          <span className="text-gray-500 font-medium">
                            {t('maintenance.actual_cost')}:
                          </span>{' '}
                          <span className="text-gray-800">฿{req.actual_cost.toLocaleString()}</span>
                        </span>
                      )}
                      {req.estimated_cost !== null && req.actual_cost !== null && (
                        <span
                          className={`font-medium ${req.actual_cost > req.estimated_cost ? 'text-red-600' : 'text-green-600'}`}
                        >
                          {req.actual_cost > req.estimated_cost
                            ? `+฿${(req.actual_cost - req.estimated_cost).toLocaleString()} ${t('maintenance.over_budget')}`
                            : `-฿${(req.estimated_cost - req.actual_cost).toLocaleString()} ${t('maintenance.under_budget')}`}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 italic">
                      {t('maintenance.cost_tracking')}: —
                    </div>
                  )}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => openEditProModal(req)}
                      className="text-xs font-medium text-amber-700 hover:text-amber-900 underline"
                    >
                      {t('maintenance.edit_costs')}
                    </button>
                  </div>
                </div>
              )}

              {/* Pro badge hint for free users */}
              {!isPro && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
                  <ProBadge />
                  <span>{t('maintenance.pro_fields_hint')}</span>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between">
                <div>
                  {req.property_name && (
                    <p className="text-xs text-gray-500">{req.property_name}</p>
                  )}
                  <p className="text-xs text-gray-400">{formatDate(req.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  {req.status === 'open' && (
                    <button
                      type="button"
                      onClick={() => updateStatus(req.id, 'in_progress')}
                      disabled={updating === req.id}
                      className="min-h-[44px] rounded-lg bg-purple-600 px-3 py-2 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                      {updating === req.id ? t('common.loading') : t('maintenance.start_work')}
                    </button>
                  )}
                  {req.status === 'in_progress' && (
                    <button
                      type="button"
                      onClick={() => updateStatus(req.id, 'resolved')}
                      disabled={updating === req.id}
                      className="min-h-[44px] rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {updating === req.id ? t('common.loading') : t('maintenance.mark_resolved')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolve modal (Pro: capture actual cost) */}
      {resolveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-base font-bold text-gray-900">
              {t('maintenance.mark_resolved')}
            </h3>
            <p className="mb-4 text-sm text-gray-600">{t('maintenance.resolve_prompt')}</p>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('maintenance.actual_cost')} ({t('common.optional')})
              </label>
              <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden">
                <span className="bg-gray-50 px-3 py-2 text-sm text-gray-500 border-r border-gray-300">
                  ฿
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 min-h-[44px] px-3 text-sm outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setResolveId(null);
                  setActualCost('');
                }}
                className="flex-1 min-h-[44px] rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleResolveSubmit}
                disabled={updating === resolveId}
                className="flex-1 min-h-[44px] rounded-lg bg-green-600 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {updating === resolveId ? t('common.loading') : t('maintenance.confirm_resolve')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Pro Fields modal */}
      {editProId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
            <h3 className="mb-4 text-base font-bold text-gray-900">
              {t('maintenance.edit_costs')}
            </h3>
            <div className="space-y-4">
              {/* Assign Technician */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('maintenance.assign_technician')}
                </label>
                <input
                  type="text"
                  value={editAssignedTo}
                  onChange={(e) => setEditAssignedTo(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full min-h-[44px] rounded-lg border border-gray-300 px-3 text-sm text-gray-900 placeholder:text-gray-400"
                />
              </div>

              {/* Estimated Cost */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('maintenance.estimated_cost')}
                </label>
                <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden">
                  <span className="bg-gray-50 px-3 py-2 text-sm text-gray-500 border-r border-gray-300">
                    ฿
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editEstimatedCost}
                    onChange={(e) => setEditEstimatedCost(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 min-h-[44px] px-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none"
                  />
                </div>
              </div>

              {/* SLA Deadline */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('maintenance.sla_deadline')}
                </label>
                <input
                  type="datetime-local"
                  value={editSlaDeadline}
                  onChange={(e) => setEditSlaDeadline(e.target.value)}
                  className="w-full min-h-[44px] rounded-lg border border-gray-300 px-3 text-sm text-gray-900"
                />
                {editSlaDeadline && new Date(editSlaDeadline) < new Date() && (
                  <p className="mt-1 text-xs text-red-600">{t('maintenance.sla_overdue')}</p>
                )}
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setEditProId(null)}
                className="flex-1 min-h-[44px] rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleEditProSubmit}
                disabled={updating === editProId}
                className="flex-1 min-h-[44px] rounded-lg bg-amber-600 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {updating === editProId ? t('common.loading') : t('maintenance.save_changes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

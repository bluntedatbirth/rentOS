'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/lib/supabase/client';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import Link from 'next/link';

const supabase = createClient();

interface PenaltyRule {
  id: string;
  contract_id: string;
  clause_id: string | null;
  trigger_type: 'late_payment' | 'lease_violation' | 'custom';
  trigger_days: number;
  penalty_amount: number;
  penalty_description: string | null;
  auto_apply: boolean;
  is_active: boolean;
  created_at: string;
}

interface Contract {
  id: string;
  properties?: { name: string } | null;
}

export default function PenaltyRulesPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();

  const [rules, setRules] = useState<PenaltyRule[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [error, setError] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formContractId, setFormContractId] = useState('');
  const [formTriggerType, setFormTriggerType] = useState<
    'late_payment' | 'lease_violation' | 'custom'
  >('late_payment');
  const [formTriggerDays, setFormTriggerDays] = useState('1');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAutoApply, setFormAutoApply] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    // Check tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .single();

    const tierAllowed =
      profile?.tier === 'pro' || process.env.NEXT_PUBLIC_DEFER_TIER_ENFORCEMENT === 'true';
    setIsPro(tierAllowed ?? false);

    // Load contracts
    const { data: contractsData } = await supabase
      .from('contracts')
      .select('id, properties(name)')
      .eq('landlord_id', user.id);

    const contractsList = (contractsData ?? []) as unknown as Contract[];
    setContracts(contractsList);

    if (contractsList.length > 0) {
      // Load all rules for landlord's contracts
      const contractIds = contractsList.map((c) => c.id);
      const { data: rulesData } = await supabase
        .from('penalty_rules')
        .select('*')
        .in('contract_id', contractIds)
        .order('created_at', { ascending: false });
      setRules((rulesData ?? []) as PenaltyRule[]);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getContractName = (contractId: string) => {
    const c = contracts.find((x) => x.id === contractId);
    return c?.properties?.name ?? contractId.slice(0, 8);
  };

  const handleToggleActive = async (rule: PenaltyRule) => {
    const res = await fetch(`/api/penalty-rules/${rule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !rule.is_active }),
    });

    if (!res.ok) {
      toast.error(t('auth.error'));
    } else {
      toast.success(t('penalty_rules.updated'));
      await loadData();
    }
  };

  const handleDelete = async (ruleId: string) => {
    const res = await fetch(`/api/penalty-rules/${ruleId}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error(t('auth.error'));
    } else {
      toast.success(t('penalty_rules.deleted'));
      await loadData();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amount = Number(formAmount);
    const days = Number(formTriggerDays);
    if (isNaN(amount) || amount <= 0) {
      setError(t('penalties.invalid_amount'));
      return;
    }
    if (isNaN(days) || days < 1) {
      setError(t('penalty_rules.invalid_days'));
      return;
    }
    if (!formContractId) {
      setError(t('penalty_rules.select_contract_required'));
      return;
    }

    setSaving(true);
    const res = await fetch('/api/penalty-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contract_id: formContractId,
        trigger_type: formTriggerType,
        trigger_days: days,
        penalty_amount: amount,
        penalty_description: formDescription || undefined,
        auto_apply: formAutoApply,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.reason ?? data.error ?? t('auth.error'));
    } else {
      toast.success(t('penalty_rules.created'));
      setShowForm(false);
      setFormContractId('');
      setFormTriggerType('late_payment');
      setFormTriggerDays('1');
      setFormAmount('');
      setFormDescription('');
      setFormAutoApply(false);
      await loadData();
    }

    setSaving(false);
  };

  if (loading) return <LoadingSkeleton count={3} />;

  // Gate: non-pro users
  if (isPro === false) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/landlord/penalties"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
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
            {t('nav.penalties')}
          </Link>
          <h2 className="text-xl font-bold text-gray-900">{t('penalty_rules.title')}</h2>
        </div>
        <div className="rounded-xl border border-saffron-200 bg-saffron-50 p-6 text-center">
          <p className="mb-1 text-sm font-semibold text-saffron-800">{t('upgrade_prompt.title')}</p>
          <p className="mb-4 text-sm text-saffron-700">{t('penalty_rules.pro_required_desc')}</p>
          <Link
            href="/landlord/billing/upgrade"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-saffron-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-saffron-600"
          >
            {t('upgrade_prompt.cta')}
          </Link>
        </div>
      </div>
    );
  }

  const triggerTypeLabel = (type: string) => {
    if (type === 'late_payment') return t('penalty_rules.trigger_late_payment');
    if (type === 'lease_violation') return t('penalty_rules.trigger_lease_violation');
    return t('penalty_rules.trigger_custom');
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/landlord/penalties"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
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
            {t('nav.penalties')}
          </Link>
          <h2 className="text-xl font-bold text-gray-900">{t('penalty_rules.title')}</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="min-h-[44px] rounded-lg bg-saffron-500 px-4 py-2 text-sm font-medium text-white hover:bg-saffron-600"
        >
          {t('penalty_rules.add_rule')}
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {/* Add Rule Form */}
      {showForm && (
        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            {t('penalty_rules.add_rule')}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Contract */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('payments.select_contract')}
              </label>
              <select
                value={formContractId}
                onChange={(e) => setFormContractId(e.target.value)}
                required
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
              >
                <option value="">{t('payments.select_contract')}</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.properties?.name ?? c.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>

            {/* Trigger type */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('penalty_rules.trigger_type')}
              </label>
              <select
                value={formTriggerType}
                onChange={(e) =>
                  setFormTriggerType(
                    e.target.value as 'late_payment' | 'lease_violation' | 'custom'
                  )
                }
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
              >
                <option value="late_payment">{t('penalty_rules.trigger_late_payment')}</option>
                <option value="lease_violation">
                  {t('penalty_rules.trigger_lease_violation')}
                </option>
                <option value="custom">{t('penalty_rules.trigger_custom')}</option>
              </select>
            </div>

            {/* Trigger days */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('penalty_rules.trigger_days')}
              </label>
              <input
                type="number"
                min="1"
                value={formTriggerDays}
                onChange={(e) => setFormTriggerDays(e.target.value)}
                required
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
              />
            </div>

            {/* Penalty amount */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('penalties.amount')} (&#3647;)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                required
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('penalty_rules.description')}
              </label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                maxLength={500}
                placeholder={t('penalty_rules.description_placeholder')}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
              />
            </div>

            {/* Auto-apply toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={formAutoApply}
                onClick={() => setFormAutoApply(!formAutoApply)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formAutoApply ? 'bg-saffron-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    formAutoApply ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm font-medium text-gray-700">
                {t('penalty_rules.auto_apply')}
              </span>
            </div>

            {formAutoApply && (
              <p className="rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                {t('penalty_rules.auto_apply_note')}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="min-h-[44px] rounded-lg bg-saffron-500 px-5 py-2 text-sm font-medium text-white hover:bg-saffron-600 disabled:opacity-50"
              >
                {saving ? t('common.loading') : t('penalty_rules.save_rule')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError('');
                }}
                className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rules list */}
      {rules.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-500">
          {t('penalty_rules.no_rules')}
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className="rounded-lg bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-saffron-100 px-2.5 py-0.5 text-xs font-medium text-saffron-800">
                      {triggerTypeLabel(rule.trigger_type)}
                    </span>
                    {rule.auto_apply && (
                      <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                        {t('penalty_rules.auto_label')}
                      </span>
                    )}
                    {!rule.is_active && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                        {t('penalty_rules.inactive')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">
                    {t('penalty_rules.after_days').replace('{days}', String(rule.trigger_days))}{' '}
                    &mdash;{' '}
                    <span className="font-semibold text-red-600">
                      &#3647;{Number(rule.penalty_amount).toLocaleString()}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {getContractName(rule.contract_id)}
                  </p>
                  {rule.penalty_description && (
                    <p className="mt-1 text-xs text-gray-500">{rule.penalty_description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Active toggle */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rule.is_active}
                    onClick={() => handleToggleActive(rule)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      rule.is_active ? 'bg-saffron-500' : 'bg-gray-200'
                    }`}
                    aria-label={
                      rule.is_active ? t('penalty_rules.deactivate') : t('penalty_rules.activate')
                    }
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        rule.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => handleDelete(rule.id)}
                    aria-label={t('penalty_rules.delete_rule')}
                    className="min-h-[44px] min-w-[44px] rounded-lg text-gray-400 hover:text-red-600"
                  >
                    &#10005;
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

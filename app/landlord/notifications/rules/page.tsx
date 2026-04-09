'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

interface NotificationRule {
  id: string;
  name: string;
  trigger_type: 'payment_due' | 'payment_overdue' | 'lease_expiry' | 'custom';
  days_offset: number;
  message_template: string;
  is_active: boolean;
  created_at: string;
}

type TriggerType = 'payment_due' | 'payment_overdue' | 'lease_expiry' | 'custom';

interface RuleFormData {
  name: string;
  trigger_type: TriggerType;
  days_offset: number;
  message_template: string;
  is_active: boolean;
}

const DEFAULT_FORM: RuleFormData = {
  name: '',
  trigger_type: 'payment_due',
  days_offset: 3,
  message_template: '',
  is_active: true,
};

const PRESET_CHAINS: { name: string; rules: Omit<RuleFormData, 'is_active'>[] }[] = [
  {
    name: 'Standard Payment Reminders',
    rules: [
      {
        name: 'Payment Due — 7 days',
        trigger_type: 'payment_due',
        days_offset: 7,
        message_template:
          'Hi {tenant_name}, a friendly reminder: your rent of {amount} THB for {property_name} is due in 7 days on {due_date}.',
      },
      {
        name: 'Payment Due — 3 days',
        trigger_type: 'payment_due',
        days_offset: 3,
        message_template:
          'Reminder: your rent payment of {amount} THB for {property_name} is due in 3 days on {due_date}.',
      },
      {
        name: 'Payment Due — 1 day',
        trigger_type: 'payment_due',
        days_offset: 1,
        message_template:
          'Your rent of {amount} THB for {property_name} is due TOMORROW ({due_date}). Please make your payment on time.',
      },
      {
        name: 'Payment Overdue — 1 day',
        trigger_type: 'payment_overdue',
        days_offset: 1,
        message_template:
          'Your rent payment of {amount} THB for {property_name} was due on {due_date} and is now 1 day overdue. Please pay as soon as possible.',
      },
      {
        name: 'Payment Overdue — 3 days',
        trigger_type: 'payment_overdue',
        days_offset: 3,
        message_template:
          'URGENT: Your rent payment of {amount} THB for {property_name} is now 3 days overdue. Late fees may apply.',
      },
    ],
  },
];

function TriggerBadge({ type, t }: { type: TriggerType; t: (k: string) => string }) {
  const colors: Record<TriggerType, string> = {
    payment_due: 'bg-blue-100 text-blue-800',
    payment_overdue: 'bg-red-100 text-red-800',
    lease_expiry: 'bg-amber-100 text-amber-800',
    custom: 'bg-gray-100 text-gray-700',
  };
  const labels: Record<TriggerType, string> = {
    payment_due: t('notification_rules.trigger_payment_due'),
    payment_overdue: t('notification_rules.trigger_payment_overdue'),
    lease_expiry: t('notification_rules.trigger_lease_expiry'),
    custom: t('notification_rules.trigger_custom'),
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[type]}`}
    >
      {labels[type]}
    </span>
  );
}

function timingLabel(rule: NotificationRule, t: (k: string) => string): string {
  const direction =
    rule.trigger_type === 'payment_overdue'
      ? t('notification_rules.days_after')
      : t('notification_rules.days_before');
  return `${rule.days_offset} ${direction}`;
}

interface RuleModalProps {
  initial?: NotificationRule | null;
  onSave: (data: RuleFormData) => Promise<void>;
  onClose: () => void;
  t: (k: string) => string;
}

function RuleModal({ initial, onSave, onClose, t }: RuleModalProps) {
  const [form, setForm] = useState<RuleFormData>(
    initial
      ? {
          name: initial.name,
          trigger_type: initial.trigger_type,
          days_offset: initial.days_offset,
          message_template: initial.message_template,
          is_active: initial.is_active,
        }
      : DEFAULT_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isAfterType = form.trigger_type === 'payment_overdue';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError(t('notification_rules.error_name_required'));
      return;
    }
    if (!form.message_template.trim()) {
      setError(t('notification_rules.error_template_required'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('notification_rules.error_save_failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          {initial ? t('notification_rules.edit_rule') : t('notification_rules.add_rule')}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('notification_rules.field_name')}
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={t('notification_rules.field_name_placeholder')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Trigger type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('notification_rules.field_trigger')}
            </label>
            <select
              value={form.trigger_type}
              onChange={(e) =>
                setForm((f) => ({ ...f, trigger_type: e.target.value as TriggerType }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="payment_due">{t('notification_rules.trigger_payment_due')}</option>
              <option value="payment_overdue">
                {t('notification_rules.trigger_payment_overdue')}
              </option>
              <option value="lease_expiry">{t('notification_rules.trigger_lease_expiry')}</option>
            </select>
          </div>

          {/* Days offset */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('notification_rules.field_days_offset')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={365}
                value={form.days_offset}
                onChange={(e) => setForm((f) => ({ ...f, days_offset: Number(e.target.value) }))}
                className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <span className="text-sm text-gray-600">
                {isAfterType
                  ? t('notification_rules.days_after')
                  : t('notification_rules.days_before')}
              </span>
            </div>
          </div>

          {/* Message template */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('notification_rules.field_template')}
            </label>
            <textarea
              value={form.message_template}
              onChange={(e) => setForm((f) => ({ ...f, message_template: e.target.value }))}
              placeholder={t('notification_rules.field_template_placeholder')}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              {t('notification_rules.template_variables_hint')}:{' '}
              <code className="rounded bg-gray-100 px-1">{'{tenant_name}'}</code>{' '}
              <code className="rounded bg-gray-100 px-1">{'{amount}'}</code>{' '}
              <code className="rounded bg-gray-100 px-1">{'{property_name}'}</code>{' '}
              <code className="rounded bg-gray-100 px-1">{'{due_date}'}</code>
            </p>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {t('notification_rules.field_active')}
            </span>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors ${
                form.is_active ? 'bg-blue-600' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={form.is_active}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                  form.is_active ? 'translate-x-5' : 'translate-x-0.5'
                } mt-0.5`}
              />
            </button>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NotificationRulesPage() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [applyingPreset, setApplyingPreset] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const isPro =
    !profile?.tier ||
    profile.tier === 'pro' ||
    process.env.NEXT_PUBLIC_DEFER_TIER_ENFORCEMENT === 'true';

  const fetchRules = useCallback(async () => {
    const res = await fetch('/api/notification-rules');
    if (res.ok) {
      const data = await res.json();
      setRules(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchRules();
  }, [user, fetchRules]);

  const handleSave = async (data: RuleFormData) => {
    if (editingRule) {
      const res = await fetch(`/api/notification-rules/${editingRule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? t('notification_rules.error_save_failed'));
      }
      const updated = await res.json();
      setRules((prev) => prev.map((r) => (r.id === editingRule.id ? updated : r)));
    } else {
      const res = await fetch('/api/notification-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? t('notification_rules.error_save_failed'));
      }
      const created = await res.json();
      setRules((prev) => [...prev, created]);
    }
  };

  const handleToggleActive = async (rule: NotificationRule) => {
    const res = await fetch(`/api/notification-rules/${rule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !rule.is_active }),
    });
    if (res.ok) {
      const updated = await res.json();
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/notification-rules/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setRules((prev) => prev.filter((r) => r.id !== id));
    }
    setDeleteConfirm(null);
  };

  const handleApplyPreset = async (preset: (typeof PRESET_CHAINS)[0]) => {
    setApplyingPreset(true);
    try {
      for (const rule of preset.rules) {
        const res = await fetch('/api/notification-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...rule, is_active: true }),
        });
        if (res.ok) {
          const created = await res.json();
          setRules((prev) => [...prev, created]);
        }
      }
    } finally {
      setApplyingPreset(false);
    }
  };

  if (loading) return <LoadingSkeleton count={4} />;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div>
          <Link
            href="/landlord/notifications"
            className="mb-1 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
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
            {t('nav.notifications')}
          </Link>
          <h2 className="text-xl font-bold text-gray-900">{t('notification_rules.title')}</h2>
          <p className="mt-1 text-sm text-gray-500">{t('notification_rules.subtitle')}</p>
        </div>
        {isPro ? (
          <button
            type="button"
            onClick={() => {
              setEditingRule(null);
              setShowModal(true);
            }}
            className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            {t('notification_rules.add_rule')}
          </button>
        ) : (
          <Link
            href="/landlord/billing"
            className="min-h-[44px] inline-flex items-center rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            {t('notification_rules.upgrade_to_add')}
          </Link>
        )}
      </div>

      {/* Pro gate banner for free users */}
      {!isPro && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">
            {t('notification_rules.pro_feature_title')}
          </p>
          <p className="mt-1 text-sm text-amber-700">{t('notification_rules.pro_feature_desc')}</p>
          <Link
            href="/landlord/billing"
            className="mt-3 inline-block min-h-[44px] rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-600"
          >
            {t('settings.upgrade')}
          </Link>
        </div>
      )}

      {/* Preset chain button */}
      {isPro && rules.length === 0 && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-800">
            {t('notification_rules.presets_title')}
          </p>
          <p className="mt-1 text-sm text-blue-600">{t('notification_rules.presets_desc')}</p>
          <button
            type="button"
            onClick={() => handleApplyPreset(PRESET_CHAINS[0])}
            disabled={applyingPreset}
            className="mt-3 min-h-[44px] rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {applyingPreset ? t('common.loading') : t('notification_rules.apply_preset')}
          </button>
        </div>
      )}

      {/* Preset button when rules already exist */}
      {isPro && rules.length > 0 && (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => handleApplyPreset(PRESET_CHAINS[0])}
            disabled={applyingPreset}
            className="min-h-[44px] rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          >
            {applyingPreset ? t('common.loading') : t('notification_rules.common_presets')}
          </button>
        </div>
      )}

      {/* Rules list */}
      {rules.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500">{t('notification_rules.empty_state')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`rounded-xl bg-white p-4 shadow-sm transition-opacity ${!rule.is_active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-3">
                {/* Main info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-gray-900">{rule.name}</p>
                    <TriggerBadge type={rule.trigger_type} t={t} />
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                      {timingLabel(rule, t)}
                    </span>
                    {!rule.is_active && (
                      <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-xs text-gray-500">
                        {t('notification_rules.inactive')}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">{rule.message_template}</p>
                </div>

                {/* Actions */}
                <div className="flex flex-shrink-0 items-center gap-2">
                  {/* Active toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(rule)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors ${
                      rule.is_active ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                    role="switch"
                    aria-checked={rule.is_active}
                    aria-label={t('notification_rules.field_active')}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                        rule.is_active ? 'translate-x-5' : 'translate-x-0.5'
                      } mt-0.5`}
                    />
                  </button>

                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRule(rule);
                      setShowModal(true);
                    }}
                    className="min-h-[44px] rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {t('property.edit')}
                  </button>

                  {/* Delete */}
                  {deleteConfirm === rule.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDelete(rule.id)}
                        className="min-h-[44px] rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700"
                      >
                        {t('notification_rules.confirm_delete')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(null)}
                        className="min-h-[44px] rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(rule.id)}
                      className="min-h-[44px] rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      {t('notification_rules.delete_rule')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <RuleModal
          initial={editingRule}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditingRule(null);
          }}
          t={t}
        />
      )}
    </div>
  );
}

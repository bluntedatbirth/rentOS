'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/lib/supabase/client';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import type { Json } from '@/lib/supabase/types';

const supabase = createClient();

// Simplified per PO 2026-04-11: tenants only configure payment reminders.
// Other prefs (penalty_*, maintenance_*, lease_expiry, tenant_paired) may still
// exist in profiles.notification_preferences JSONB from prior builds — we just
// ignore unknown keys on load and preserve them on save is not needed since we
// overwrite with only the 2 known fields.
interface NotificationPrefs {
  payment_due: boolean;
  payment_overdue: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  payment_due: true,
  payment_overdue: true,
};

interface NotificationGroup {
  label: string;
  items: { key: keyof NotificationPrefs; label: string; description: string }[];
}

export default function TenantNotificationSettingsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', user.id)
        .single();

      if (data?.notification_preferences) {
        const stored = data.notification_preferences as Record<string, unknown>;
        // Only pull the 2 known keys; ignore legacy fields.
        setPrefs({
          payment_due:
            typeof stored.payment_due === 'boolean'
              ? stored.payment_due
              : DEFAULT_PREFS.payment_due,
          payment_overdue:
            typeof stored.payment_overdue === 'boolean'
              ? stored.payment_overdue
              : DEFAULT_PREFS.payment_overdue,
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleToggle = (key: keyof NotificationPrefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ notification_preferences: prefs as unknown as Json })
      .eq('id', user.id);
    setSaving(false);
    setSaved(true);
    toast.success(t('notifications.saved'));
    setTimeout(() => setSaved(false), 2000);
  };

  const groups: NotificationGroup[] = [
    {
      label: t('notifications.group_payments'),
      items: [
        {
          key: 'payment_due',
          label: t('notifications.payment_due'),
          description: t('notifications.payment_due_desc'),
        },
        {
          key: 'payment_overdue',
          label: t('notifications.payment_overdue'),
          description: t('notifications.payment_overdue_desc'),
        },
      ],
    },
  ];

  if (loading) return <LoadingSkeleton count={6} />;

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-1 text-xl font-bold text-charcoal-900">
        {t('notifications.settings_title')}
      </h2>
      <p className="mb-6 text-sm text-charcoal-500">{t('notifications.settings_description')}</p>

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.label} className="rounded-lg bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-charcoal-900">{group.label}</h3>
            <div className="space-y-3">
              {group.items.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-charcoal-900">{item.label}</p>
                    <p className="text-xs text-charcoal-500">{item.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle(item.key)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors ${
                      prefs[item.key] ? 'bg-saffron-500' : 'bg-charcoal-200'
                    }`}
                    role="switch"
                    aria-checked={prefs[item.key]}
                    aria-label={item.label}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                        prefs[item.key] ? 'translate-x-5' : 'translate-x-0.5'
                      } mt-0.5`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="min-h-[44px] rounded-lg bg-saffron-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-saffron-600 disabled:opacity-50"
        >
          {saving ? t('common.loading') : t('common.save')}
        </button>
        {saved && (
          <span className="text-sm font-medium text-green-600">{t('notifications.saved')}</span>
        )}
      </div>
    </div>
  );
}

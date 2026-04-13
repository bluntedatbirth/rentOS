'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/lib/supabase/client';
import ProfileForm from '@/components/profile/ProfileForm';
import SecuritySettings from '@/components/security/SecuritySettings';
import type { Json } from '@/lib/supabase/types';

const supabase = createClient();

interface NotificationPrefs {
  payment_due: boolean;
  payment_overdue: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  payment_due: true,
  payment_overdue: true,
};

export default function TenantSettingsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [notifLoading, setNotifLoading] = useState(true);
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
      setNotifLoading(false);
    };
    load();
  }, [user]);

  const handleToggle = (key: keyof NotificationPrefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSaveNotifications = async () => {
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

  const notifItems: { key: keyof NotificationPrefs; label: string; description: string }[] = [
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
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-charcoal-900 dark:text-white">
        {t('settings.title')}
      </h1>

      {/* Section 1: Profile */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-charcoal-900 dark:text-white">
          {t('settings.profile_section')}
        </h2>
        <ProfileForm showTitle={false} />
      </section>

      <hr className="border-t border-warm-200 dark:border-white/10" />

      {/* Section 2: Notification Preferences */}
      <section>
        <h2 className="mb-1 text-lg font-semibold text-charcoal-900 dark:text-white">
          {t('notifications.settings_title')}
        </h2>
        <p className="mb-4 text-sm text-charcoal-500 dark:text-white/50">
          {t('notifications.settings_description')}
        </p>

        <div className="bg-white dark:bg-charcoal-800 rounded-xl p-6 border border-warm-200 dark:border-white/10 shadow-sm dark:shadow-black/20">
          {notifLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-saffron-500 border-t-transparent" />
            </div>
          ) : (
            <>
              <h3 className="mb-4 text-sm font-semibold text-charcoal-900 dark:text-white">
                {t('notifications.group_payments')}
              </h3>
              <div className="space-y-4">
                {notifItems.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-charcoal-900 dark:text-white">
                        {item.label}
                      </p>
                      <p className="text-xs text-charcoal-500 dark:text-white/50">
                        {item.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggle(item.key)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors ${
                        prefs[item.key] ? 'bg-saffron-500' : 'bg-warm-200 dark:bg-charcoal-700'
                      }`}
                      role="switch"
                      aria-checked={prefs[item.key]}
                      aria-label={item.label}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-charcoal-200 shadow ring-0 transition-transform mt-0.5 ${
                          prefs[item.key] ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveNotifications}
                  disabled={saving}
                  className="min-h-[44px] rounded-lg bg-saffron-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-saffron-600 disabled:opacity-50"
                >
                  {saving ? t('common.loading') : t('common.save')}
                </button>
                {saved && (
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {t('notifications.saved')}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <hr className="border-t border-warm-200 dark:border-white/10" />

      {/* Section 3: Security */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-charcoal-900 dark:text-white">
          {t('security.title')}
        </h2>
        <SecuritySettings />
      </section>

      <hr className="border-t border-warm-200 dark:border-white/10" />

      {/* Section 4: About RentOS */}
      <section className="bg-white dark:bg-charcoal-800 rounded-xl p-6 border border-warm-200 dark:border-white/10 shadow-sm dark:shadow-black/20">
        <h2 className="text-lg font-semibold text-charcoal-900 dark:text-white">
          {t('settings.about_title')}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-charcoal-700 dark:text-white/70">
          {t('settings.about_disclaimer')}
        </p>
        <div className="mt-4 flex flex-wrap gap-4">
          <Link
            href="/legal#privacy"
            className="text-sm text-saffron-600 underline hover:text-saffron-700"
          >
            {t('settings.about_privacy_link')}
          </Link>
          <Link
            href="/legal#terms"
            className="text-sm text-saffron-600 underline hover:text-saffron-700"
          >
            {t('settings.about_terms_link')}
          </Link>
          <Link href="/#faq" className="text-sm text-saffron-600 underline hover:text-saffron-700">
            {t('settings.about_faq_link')}
          </Link>
        </div>
      </section>
    </div>
  );
}

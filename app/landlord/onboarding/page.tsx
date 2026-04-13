'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

type OnboardingStep = 'welcome' | 'property' | 'contract' | 'tenant' | 'done';
const STEPS: OnboardingStep[] = ['welcome', 'property', 'contract', 'tenant', 'done'];

export default function OnboardingPage() {
  const { user, profile: _profile } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();

  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [loading, setLoading] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // Property form state
  const [propertyName, setPropertyName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyUnits, setPropertyUnits] = useState('1');
  const [_createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);

  // Check if user has already completed onboarding (has at least 1 property)
  useEffect(() => {
    if (!user) return;
    const checkOnboarding = async () => {
      const { count } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('landlord_id', user.id)
        .eq('is_active', true);

      if (count && count > 0) {
        // Already onboarded, redirect to dashboard
        router.replace('/landlord/dashboard');
      } else {
        setCheckingOnboarding(false);
      }
    };
    checkOnboarding();
  }, [user, router]);

  const stepIndex = STEPS.indexOf(step);

  const goNext = useCallback(() => {
    const nextIndex = stepIndex + 1;
    const nextStep = STEPS[nextIndex];
    if (nextStep) {
      setStep(nextStep);
    }
  }, [stepIndex]);

  const goBack = useCallback(() => {
    const prevIndex = stepIndex - 1;
    const prevStep = STEPS[prevIndex];
    if (prevStep) {
      setStep(prevStep);
    }
  }, [stepIndex]);

  const handleAddProperty = async () => {
    if (!propertyName.trim()) return;
    setLoading(true);

    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: propertyName.trim(),
          address: propertyAddress.trim() || undefined,
          unit_number: propertyUnits.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'Failed to create property');
      }

      const data = await res.json();
      setCreatedPropertyId(data.id);
      toast.success(t('onboarding.add_property') + ' - ' + t('toast.success'));
      goNext();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('toast.error'));
    } finally {
      setLoading(false);
    }
  };

  if (checkingOnboarding) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-saffron-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-4">
      {/* Step indicator */}
      {step !== 'welcome' && step !== 'done' && (
        <div className="mb-6">
          <p className="mb-2 text-center text-xs text-charcoal-500 dark:text-white/50">
            {t('onboarding.step_of')
              .replace('{}', String(stepIndex))
              .replace('{}', String(STEPS.length - 2))}
          </p>
          <div className="flex gap-1">
            {STEPS.slice(1, -1).map((s, i) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < stepIndex
                    ? 'bg-saffron-500'
                    : i === stepIndex - 1
                      ? 'bg-saffron-500'
                      : 'bg-warm-200 dark:bg-charcoal-700'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Step: Welcome */}
      {step === 'welcome' && (
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-saffron-100 text-4xl text-saffron-600 dark:bg-saffron-500/15">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-10 w-10"
              >
                <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
                <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.432z" />
              </svg>
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-charcoal-900 dark:text-white">
            {t('onboarding.welcome_title')}
          </h1>
          <p className="mb-8 text-sm text-charcoal-500 dark:text-white/50">
            {t('onboarding.welcome_subtitle')}
          </p>
          <ul className="mb-8 space-y-3 text-left">
            {[
              t('onboarding.welcome_feature_1'),
              t('onboarding.welcome_feature_2'),
              t('onboarding.welcome_feature_3'),
            ].map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-3 text-sm text-charcoal-700 dark:text-white/70"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-saffron-100 text-xs text-saffron-600 dark:bg-saffron-500/15">
                  &#10003;
                </span>
                {feature}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={goNext}
            className="min-h-[44px] w-full rounded-lg bg-saffron-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-400 focus:ring-offset-2"
          >
            {t('onboarding.get_started')}
          </button>
        </div>
      )}

      {/* Step: Add Property */}
      {step === 'property' && (
        <div>
          <h2 className="mb-1 text-xl font-bold text-charcoal-900 dark:text-white">
            {t('onboarding.step_property_title')}
          </h2>
          <p className="mb-6 text-sm text-charcoal-500 dark:text-white/50">
            {t('onboarding.step_property_subtitle')}
          </p>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="prop-name"
                className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-white/70"
              >
                {t('onboarding.property_name')} *
              </label>
              <input
                id="prop-name"
                type="text"
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                placeholder={t('onboarding.property_name_placeholder')}
                className="block w-full rounded-lg border border-warm-300 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-400 focus:outline-none focus:ring-1 focus:ring-saffron-400 dark:border-white/15 dark:bg-charcoal-800 dark:text-white dark:placeholder:text-white/40"
              />
            </div>

            <div>
              <label
                htmlFor="prop-address"
                className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-white/70"
              >
                {t('onboarding.property_address')}
              </label>
              <input
                id="prop-address"
                type="text"
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                placeholder={t('onboarding.property_address_placeholder')}
                className="block w-full rounded-lg border border-warm-300 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-400 focus:outline-none focus:ring-1 focus:ring-saffron-400 dark:border-white/15 dark:bg-charcoal-800 dark:text-white dark:placeholder:text-white/40"
              />
            </div>

            <div>
              <label
                htmlFor="prop-units"
                className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-white/70"
              >
                {t('onboarding.property_units')}
              </label>
              <input
                id="prop-units"
                type="text"
                value={propertyUnits}
                onChange={(e) => setPropertyUnits(e.target.value)}
                placeholder={t('onboarding.property_units_placeholder')}
                className="block w-full rounded-lg border border-warm-300 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-400 focus:outline-none focus:ring-1 focus:ring-saffron-400 dark:border-white/15 dark:bg-charcoal-800 dark:text-white dark:placeholder:text-white/40"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={goBack}
              className="min-h-[44px] flex-1 rounded-lg border border-warm-300 px-4 py-2.5 text-sm font-medium text-charcoal-700 hover:bg-warm-50 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/5"
            >
              {t('onboarding.back')}
            </button>
            <button
              type="button"
              onClick={handleAddProperty}
              disabled={!propertyName.trim() || loading}
              className="min-h-[44px] flex-1 rounded-lg bg-saffron-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-saffron-600 disabled:opacity-50"
            >
              {loading ? t('onboarding.adding') : t('onboarding.add_property')}
            </button>
          </div>
        </div>
      )}

      {/* Step: Upload Contract */}
      {step === 'contract' && (
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-saffron-100 text-saffron-600 dark:bg-saffron-500/15">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-8 w-8"
              >
                <path
                  fillRule="evenodd"
                  d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z"
                  clipRule="evenodd"
                />
                <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
              </svg>
            </div>
          </div>
          <h2 className="mb-1 text-xl font-bold text-charcoal-900 dark:text-white">
            {t('onboarding.step_contract_title')}
          </h2>
          <p className="mb-8 text-sm text-charcoal-500 dark:text-white/50">
            {t('onboarding.step_contract_subtitle')}
          </p>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => router.push('/landlord/contracts/upload')}
              className="min-h-[44px] w-full rounded-lg bg-saffron-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-saffron-600"
            >
              {t('onboarding.upload_contract')}
            </button>
            <button
              type="button"
              onClick={goNext}
              className="min-h-[44px] w-full rounded-lg border border-warm-300 px-4 py-2.5 text-sm font-medium text-charcoal-700 hover:bg-warm-50 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/5"
            >
              {t('onboarding.skip_step')}
            </button>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={goBack}
              className="text-sm text-charcoal-500 hover:text-charcoal-700 dark:text-white/50 dark:hover:text-white/70"
            >
              {t('onboarding.back')}
            </button>
          </div>
        </div>
      )}

      {/* Step: Invite Tenant */}
      {step === 'tenant' && (
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-saffron-100 text-saffron-600 dark:bg-saffron-500/15">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-8 w-8"
              >
                <path d="M6.25 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM3.25 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM19.75 7.5a.75.75 0 00-1.5 0v2.25H16a.75.75 0 000 1.5h2.25v2.25a.75.75 0 001.5 0v-2.25H22a.75.75 0 000-1.5h-2.25V7.5z" />
              </svg>
            </div>
          </div>
          <h2 className="mb-1 text-xl font-bold text-charcoal-900 dark:text-white">
            {t('onboarding.step_tenant_title')}
          </h2>
          <p className="mb-8 text-sm text-charcoal-500 dark:text-white/50">
            {t('onboarding.step_tenant_subtitle')}
          </p>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                // If we have a contract associated with the property, go to pairing
                // Otherwise just show instructions
                router.push('/landlord/properties');
              }}
              className="min-h-[44px] w-full rounded-lg bg-saffron-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-saffron-600"
            >
              {t('onboarding.invite_tenant')}
            </button>
            <button
              type="button"
              onClick={goNext}
              className="min-h-[44px] w-full rounded-lg border border-warm-300 px-4 py-2.5 text-sm font-medium text-charcoal-700 hover:bg-warm-50 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/5"
            >
              {t('onboarding.skip_step')}
            </button>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={goBack}
              className="text-sm text-charcoal-500 hover:text-charcoal-700 dark:text-white/50 dark:hover:text-white/70"
            >
              {t('onboarding.back')}
            </button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && (
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-success-100 text-success-600 dark:bg-green-500/15 dark:text-green-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-10 w-10"
              >
                <path
                  fillRule="evenodd"
                  d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-charcoal-900 dark:text-white">
            {t('onboarding.done_title')}
          </h2>
          <p className="mb-8 text-sm text-charcoal-500 dark:text-white/50">
            {t('onboarding.done_subtitle')}
          </p>
          <button
            type="button"
            onClick={() => router.push('/landlord/dashboard')}
            className="min-h-[44px] w-full rounded-lg bg-saffron-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-400 focus:ring-offset-2"
          >
            {t('onboarding.go_to_dashboard')}
          </button>
        </div>
      )}
    </div>
  );
}

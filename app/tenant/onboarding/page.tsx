'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/lib/supabase/client';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

const supabase = createClient();

type OnboardingStep = 'welcome' | 'pair' | 'review' | 'done';
const STEPS: OnboardingStep[] = ['welcome', 'pair', 'review', 'done'];

interface ContractSummary {
  id: string;
  status: string;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  security_deposit: number | null;
  properties: { name: string; address: string | null } | null;
}

export default function TenantOnboardingPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();

  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [checking, setChecking] = useState(true);
  const [code, setCode] = useState('');
  const [pairing, setPairing] = useState(false);
  const [error, setError] = useState('');
  const [contract, setContract] = useState<ContractSummary | null>(null);

  // Auto-redirect if tenant already has a paired contract
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data: contracts } = await supabase
        .from('contracts')
        .select(
          'id, status, lease_start, lease_end, monthly_rent, security_deposit, properties(name, address)'
        )
        .eq('tenant_id', user.id)
        .eq('status', 'active')
        .limit(1);

      if (contracts && contracts.length > 0) {
        router.replace('/tenant/dashboard');
      } else {
        setChecking(false);
      }
    };
    check();
  }, [user, router]);

  const stepIndex = STEPS.indexOf(step);

  const handlePair = async () => {
    if (!code || code.length !== 6) {
      setError(t('pairing.invalid_code'));
      return;
    }

    setPairing(true);
    setError('');

    try {
      const res = await fetch('/api/pairing/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('auth.error'));

      toast.success(t('pairing.success'));

      // Load the contract that was just paired
      const { data: contracts } = await supabase
        .from('contracts')
        .select(
          'id, status, lease_start, lease_end, monthly_rent, security_deposit, properties(name, address)'
        )
        .eq('tenant_id', user!.id)
        .eq('status', 'active')
        .limit(1);

      if (contracts && contracts.length > 0) {
        setContract(contracts[0] as unknown as ContractSummary);
      }

      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.error'));
    } finally {
      setPairing(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-4">
      {/* Step indicator */}
      {step !== 'welcome' && step !== 'done' && (
        <div className="mb-6">
          <p className="mb-2 text-center text-xs text-gray-500">
            {t('onboarding.step_of')
              .replace('{}', String(stepIndex))
              .replace('{}', String(STEPS.length - 2))}
          </p>
          <div className="flex gap-1">
            {STEPS.slice(1, -1).map((s, i) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < stepIndex ? 'bg-primary-600' : 'bg-gray-200'
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
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-100 text-4xl text-primary-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-10 w-10"
              >
                <path
                  fillRule="evenodd"
                  d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {t('tenant_onboarding.welcome_title')}
          </h1>
          <p className="mb-8 text-sm text-gray-500">{t('tenant_onboarding.welcome_subtitle')}</p>
          <ul className="mb-8 space-y-3 text-left">
            {[
              t('tenant_onboarding.feature_view_contract'),
              t('tenant_onboarding.feature_track_payments'),
              t('tenant_onboarding.feature_submit_maintenance'),
            ].map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm text-gray-700">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs text-primary-600">
                  &#10003;
                </span>
                {feature}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setStep('pair')}
            className="min-h-[44px] w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            {t('onboarding.get_started')}
          </button>
        </div>
      )}

      {/* Step: Enter Pairing Code */}
      {step === 'pair' && (
        <div>
          <h2 className="mb-1 text-xl font-bold text-gray-900">
            {t('tenant_onboarding.pair_title')}
          </h2>
          <p className="mb-6 text-sm text-gray-500">{t('tenant_onboarding.pair_subtitle')}</p>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <label htmlFor="pairing-code" className="mb-2 block text-sm font-medium text-gray-700">
              {t('pairing.enter_code')}
            </label>
            <input
              id="pairing-code"
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase().slice(0, 6));
                setError('');
              }}
              maxLength={6}
              placeholder="ABC123"
              className="mb-4 block w-full rounded-lg border border-gray-300 px-4 py-3 text-center font-mono text-2xl font-bold tracking-widest text-gray-900 placeholder:text-gray-300 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />

            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            <button
              type="button"
              onClick={handlePair}
              disabled={pairing || code.length !== 6}
              className="min-h-[44px] w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {pairing ? t('common.loading') : t('pairing.pair_button')}
            </button>
          </div>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setStep('welcome')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {t('onboarding.back')}
            </button>
          </div>
        </div>
      )}

      {/* Step: Review Contract */}
      {step === 'review' && (
        <div>
          <h2 className="mb-1 text-xl font-bold text-gray-900">
            {t('tenant_onboarding.review_title')}
          </h2>
          <p className="mb-6 text-sm text-gray-500">{t('tenant_onboarding.review_subtitle')}</p>

          {contract ? (
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500">{t('property.name')}</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {contract.properties?.name ?? '-'}
                  </p>
                </div>
                {contract.properties?.address && (
                  <div>
                    <p className="text-xs text-gray-500">{t('property.address')}</p>
                    <p className="text-sm text-gray-900">{contract.properties.address}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">{t('contract.lease_period')}</p>
                    <p className="text-sm text-gray-900">
                      {contract.lease_start ?? '-'} &rarr; {contract.lease_end ?? '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('contract.monthly_rent')}</p>
                    <p className="text-sm font-medium text-gray-900">
                      {contract.monthly_rent ? `฿${contract.monthly_rent.toLocaleString()}` : '-'}
                    </p>
                  </div>
                </div>
                {contract.security_deposit != null && contract.security_deposit > 0 && (
                  <div>
                    <p className="text-xs text-gray-500">{t('contract.security_deposit')}</p>
                    <p className="text-sm text-gray-900">
                      ฿{contract.security_deposit.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <LoadingSkeleton count={3} />
          )}

          <div className="mt-6">
            <button
              type="button"
              onClick={() => setStep('done')}
              className="min-h-[44px] w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
            >
              {t('tenant_onboarding.confirm_continue')}
            </button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && (
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-success-100 text-success-600">
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
          <h2 className="mb-2 text-2xl font-bold text-gray-900">
            {t('tenant_onboarding.done_title')}
          </h2>
          <p className="mb-8 text-sm text-gray-500">{t('tenant_onboarding.done_subtitle')}</p>
          <button
            type="button"
            onClick={() => router.push('/tenant/dashboard')}
            className="min-h-[44px] w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            {t('onboarding.go_to_dashboard')}
          </button>
        </div>
      )}
    </div>
  );
}

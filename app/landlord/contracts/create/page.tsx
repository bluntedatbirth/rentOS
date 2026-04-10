'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/ToastProvider';
import { TopDownNotification } from '@/components/ui/TopDownNotification';

import { useProGate } from '@/lib/hooks/useProGate';
import { TemplateStartStep } from '@/components/landlord/TemplateStartStep';

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface WizardData {
  // Step 1
  property_name: string;
  property_address: string;
  property_unit: string;
  property_type: 'condo' | 'house' | 'apartment';
  landlord_name: string;
  landlord_id_number: string;
  tenant_nationality: 'thai' | 'foreign';
  tenant_passport_number: string;
  tenant_visa_type: string;
  // Step 2
  monthly_rent: number;
  security_deposit_months: number;
  payment_due_day: number;
  late_penalty_percent: number;
  utilities_included: boolean;
  utility_details: string;
  // Step 3
  pets_allowed: 'yes' | 'no' | 'with_deposit';
  pet_deposit: number;
  subletting_allowed: boolean;
  smoking_allowed: 'yes' | 'no' | 'outdoor_only';
  overnight_guests: 'allowed' | 'notify_landlord' | 'max_days';
  max_guest_days: number;
  quiet_hours_start: string;
  quiet_hours_end: string;
  // Step 4
  landlord_responsibilities: string[];
  tenant_responsibilities: string[];
  maintenance_response_days: number;
  emergency_contact: string;
  // Step 5
  lease_duration_months: number;
  lease_start_date: string;
  early_termination_notice_days: number;
  early_termination_penalty_months: number;
  auto_renewal: boolean;
  renewal_notice_days: number;
  dispute_resolution: 'negotiation' | 'mediation' | 'arbitration' | 'court';
  // Step 6
  output_language: 'thai' | 'english' | 'bilingual';
}

const DEFAULT_LANDLORD_RESPONSIBILITIES = [
  'structural_repairs',
  'plumbing_electrical',
  'common_areas',
  'pest_control',
];

const DEFAULT_TENANT_RESPONSIBILITIES = [
  'daily_cleaning',
  'minor_repairs',
  'appliance_care',
  'report_damage',
];

const DRAFT_KEY = 'rentos_contract_draft';

function getDefaultData(): WizardData {
  return {
    property_name: '',
    property_address: '',
    property_unit: '',
    property_type: 'condo',
    landlord_name: '',
    landlord_id_number: '',
    tenant_nationality: 'thai',
    tenant_passport_number: '',
    tenant_visa_type: '',
    monthly_rent: 15000,
    security_deposit_months: 2,
    payment_due_day: 1,
    late_penalty_percent: 1,
    utilities_included: false,
    utility_details: '',
    pets_allowed: 'no',
    pet_deposit: 5000,
    subletting_allowed: false,
    smoking_allowed: 'no',
    overnight_guests: 'notify_landlord',
    max_guest_days: 7,
    quiet_hours_start: '22:00',
    quiet_hours_end: '06:00',
    landlord_responsibilities: [...DEFAULT_LANDLORD_RESPONSIBILITIES],
    tenant_responsibilities: [...DEFAULT_TENANT_RESPONSIBILITIES],
    maintenance_response_days: 3,
    emergency_contact: '',
    lease_duration_months: 12,
    lease_start_date: new Date().toISOString().split('T')[0] ?? '',
    early_termination_notice_days: 30,
    early_termination_penalty_months: 2,
    auto_renewal: true,
    renewal_notice_days: 30,
    dispute_resolution: 'negotiation',
    output_language: 'bilingual',
  };
}

interface ValidationErrors {
  [key: string]: string;
}

function calculateLeaseEnd(startDate: string, months: number): string {
  const date = new Date(startDate);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0] ?? '';
}

export default function ContractCreatePage() {
  const { user: _user, profile } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { allowed, PromptModal } = useProGate('contract_generation');

  const [step, setStep] = useState<Step>(1);
  const [generating, setGenerating] = useState(false);
  const [generatedContract, setGeneratedContract] = useState<string | null>(null);
  const [generatedContractId, setGeneratedContractId] = useState<string | null>(null);
  const [showGenerationNotification, setShowGenerationNotification] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [draftLoaded, setDraftLoaded] = useState(false);
  // Template integration
  const [showTemplateStep, setShowTemplateStep] = useState(true);
  const [templateText, setTemplateText] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState<string | null>(null);

  const [data, setData] = useState<WizardData>(getDefaultData());

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<WizardData>;
        setData((d) => ({ ...d, ...parsed }));
      }
    } catch {
      // ignore
    }
    setDraftLoaded(true);
  }, []);

  // If arriving from properties page with ?property_id=, prefill property fields
  useEffect(() => {
    const pid = searchParams.get('property_id');
    if (!pid || !draftLoaded) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/properties/${pid}`);
        if (!res.ok) return;
        const prop = (await res.json()) as {
          name?: string;
          address?: string;
          unit_number?: string;
        };
        setData((d) => ({
          ...d,
          property_name: prop.name ?? d.property_name,
          property_address: prop.address ?? d.property_address,
          property_unit: prop.unit_number ?? d.property_unit,
        }));
      } catch {
        // non-fatal — form still works without prefill
      }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, draftLoaded]);

  // If arriving from template library with ?template_id=, fetch and pre-load the template
  useEffect(() => {
    const tid = searchParams.get('template_id');
    if (!tid) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/contract-templates/${tid}`);
        if (!res.ok) return;
        const body = (await res.json()) as {
          template: { template_text: string; name_en: string; name_th: string };
        };
        setTemplateText(body.template.template_text);
        setTemplateName(body.template.name_en);
      } catch {
        // non-fatal
      }
    };
    void load();
  }, [searchParams]);

  // Set landlord name from profile
  useEffect(() => {
    if (profile?.full_name && !data.landlord_name) {
      setData((d) => ({ ...d, landlord_name: profile.full_name ?? '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const update = <K extends keyof WizardData>(key: K, value: WizardData[K]) => {
    setData((d) => ({ ...d, [key]: value }));
    // Clear validation error for this field
    if (errors[key]) {
      setErrors((e) => {
        const next = { ...e };
        delete next[key];
        return next;
      });
    }
  };

  const toggleResponsibility = (
    field: 'landlord_responsibilities' | 'tenant_responsibilities',
    value: string
  ) => {
    setData((d) => ({
      ...d,
      [field]: d[field].includes(value)
        ? d[field].filter((v) => v !== value)
        : [...d[field], value],
    }));
  };

  const handleSaveDraft = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      toast.success(t('create_contract.draft_saved'));
    } catch {
      toast.error(t('auth.error'));
    }
  };

  const handleClearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setData(getDefaultData());
    setStep(1);
    toast.info(t('create_contract.draft_cleared'));
  };

  const validateStep = (s: Step): ValidationErrors => {
    const errs: ValidationErrors = {};
    switch (s) {
      case 1:
        if (!data.property_name.trim())
          errs.property_name = t('create_contract.validation_property_name');
        if (!data.landlord_name.trim())
          errs.landlord_name = t('create_contract.validation_landlord_name');
        break;
      case 2:
        if (data.monthly_rent <= 0) errs.monthly_rent = t('create_contract.validation_rent');
        if (data.security_deposit_months > 3)
          errs.security_deposit_months = t('create_contract.validation_deposit_cap');
        break;
      case 5:
        if (!data.lease_start_date)
          errs.lease_start_date = t('create_contract.validation_lease_start');
        break;
    }
    return errs;
  };

  const handleNext = () => {
    const stepErrors = validateStep(step);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStep((s) => (s + 1) as Step);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');

    try {
      const res = await fetch('/api/contracts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, template_base: templateText ?? undefined }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? t('create_contract.error'));
      }

      const result = await res.json();
      setGeneratedContract(result.contract_text);
      // Create property + contract in DB
      try {
        const propRes = await fetch('/api/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.property_name,
            address: data.property_address || undefined,
            unit_number: data.property_unit || undefined,
          }),
        });
        if (propRes.ok) {
          const prop = await propRes.json();
          const contractText = result.contract_text as string;
          const contractRes = await fetch('/api/contracts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              property_id: prop.id,
              monthly_rent: data.monthly_rent,
              security_deposit: data.monthly_rent * data.security_deposit_months,
              lease_start: data.lease_start_date,
              lease_end: calculateLeaseEnd(data.lease_start_date, data.lease_duration_months),
              raw_text_th: data.output_language !== 'english' ? contractText : undefined,
              translated_text_en: data.output_language !== 'thai' ? contractText : undefined,
            }),
          });
          if (contractRes.ok) {
            const savedContract = (await contractRes.json()) as { id?: string };
            if (savedContract.id) {
              setGeneratedContractId(savedContract.id);
            }
          }

          // TM.30 reminder is sent server-side from the generate API
        }
      } catch {
        // Non-blocking — contract is displayed even if save fails
      }
      // Clear draft after successful generation
      localStorage.removeItem(DRAFT_KEY);
      // Show slide-in notification
      setShowGenerationNotification(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('create_contract.error'));
      toast.error(t('create_contract.error'));
    } finally {
      setGenerating(false);
    }
  };

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadAndStore = async () => {
    if (!generatedContract) return;
    setDownloadingPdf(true);
    try {
      const { generateContractPdf, downloadPdf } = await import('@/lib/pdf/generateContractPdf');
      const pdfBytes = await generateContractPdf(generatedContract);
      const filename =
        `${data.property_name || 'contract'}-${data.lease_start_date || 'lease'}.pdf`
          .replace(/\s+/g, '-')
          .replace(/[^\w\-.ก-๙]/g, '') || 'contract.pdf';

      // 1. Trigger browser download
      downloadPdf(pdfBytes, filename);

      // 2. In parallel, upload to Documents vault
      try {
        const pdfFile = new File([pdfBytes.buffer as ArrayBuffer], filename, {
          type: 'application/pdf',
        });
        const formData = new FormData();
        formData.append('file', pdfFile);
        formData.append('category', 'contract');
        if (generatedContractId) formData.append('contract_id', generatedContractId);

        // Check if a document row already exists for this contract (idempotency)
        const existingCheck = generatedContractId
          ? await fetch(`/api/documents?contract_id=${generatedContractId}&category=contract`)
          : null;
        const existingDocs = existingCheck?.ok
          ? ((await existingCheck.json()) as Array<{ id: string }>)
          : [];

        if (existingDocs.length === 0) {
          await fetch('/api/documents', { method: 'POST', body: formData });
        }
        toast.success(t('contracts.download_and_store_success'));
      } catch {
        // Non-fatal: download already succeeded
        toast.success(t('contracts.download_and_store_success'));
      }
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error(t('create_contract.pdf_error'));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleCopy = () => {
    if (generatedContract) {
      navigator.clipboard.writeText(generatedContract);
      toast.success(t('create_contract.copied'));
    }
  };

  const inputClass =
    'block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500';
  const inputErrorClass =
    'block w-full rounded-lg border border-red-300 px-3 py-2.5 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500';
  const labelClass = 'mb-1 block text-sm font-medium text-gray-700';
  const cardClass = 'rounded-lg border border-gray-200 bg-white p-4 mb-4';
  const chipClass = (active: boolean) =>
    `min-h-[44px] rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
      active
        ? 'border-saffron-500 bg-saffron-50 text-saffron-700'
        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
    }`;

  const fieldError = (key: string) =>
    errors[key] ? <p className="mt-1 text-xs text-red-600">{errors[key]}</p> : null;

  if (!draftLoaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-saffron-500 border-t-transparent" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-lg">
        {PromptModal}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm font-semibold text-amber-800">{t('upgrade_prompt.title')}</p>
          <p className="mt-0.5 text-sm text-amber-700">{t('upgrade_prompt.contract_gen')}</p>
          <Link
            href="/landlord/billing/upgrade"
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-saffron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-600"
          >
            {t('upgrade_prompt.cta')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      {PromptModal}

      {/* Top-down notification when generation completes */}
      {showGenerationNotification && (
        <TopDownNotification
          message={t('contracts.generation_complete')}
          onClick={() => {
            if (generatedContractId) {
              router.push(`/landlord/contracts/${generatedContractId}`);
            }
          }}
          onDismiss={() => setShowGenerationNotification(false)}
        />
      )}

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('create_contract.title')}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            {t('create_contract.save_draft')}
          </button>
          <button
            type="button"
            onClick={handleClearDraft}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-50"
          >
            {t('create_contract.clear_draft')}
          </button>
        </div>
      </div>
      <p className="mb-6 text-sm text-gray-500">{t('create_contract.description')}</p>

      {/* Template selection intro — shown before the wizard steps */}
      {showTemplateStep && (
        <TemplateStartStep
          preloadedTemplateName={templateName}
          onUseTemplate={(text, name) => {
            setTemplateText(text);
            setTemplateName(name);
            setShowTemplateStep(false);
          }}
          onSkip={() => {
            setTemplateText(null);
            setTemplateName(null);
            setShowTemplateStep(false);
          }}
        />
      )}

      {/* Main wizard — shown after template step is dismissed */}
      {!showTemplateStep && (
        <>
          {/* Step indicator */}
          <div className="mb-6 flex items-center gap-1">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div key={s} className="flex flex-1 flex-col items-center">
                <div
                  className={`h-2 w-full rounded-full ${s <= step ? 'bg-saffron-500' : 'bg-gray-200'}`}
                />
                <span className="mt-1 hidden text-xs text-gray-500 sm:block">
                  {s === 1
                    ? t('create_contract.step_property')
                    : s === 2
                      ? t('create_contract.step_financial')
                      : s === 3
                        ? t('create_contract.step_rules')
                        : s === 4
                          ? t('create_contract.step_maintenance')
                          : s === 5
                            ? t('create_contract.step_termination')
                            : t('create_contract.step_generate')}
                </span>
                <span className="mt-1 text-xs text-gray-400 sm:hidden">{s}</span>
              </div>
            ))}
          </div>

          {/* Step 1: Property & Parties */}
          {step === 1 && (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                {t('create_contract.step1_title')}
              </h3>

              <div className={cardClass}>
                <div className="mb-3">
                  <label htmlFor="property_name" className={labelClass}>
                    {t('property.name')} *
                  </label>
                  <input
                    id="property_name"
                    type="text"
                    value={data.property_name}
                    onChange={(e) => update('property_name', e.target.value)}
                    className={errors.property_name ? inputErrorClass : inputClass}
                    placeholder={t('property.name_placeholder')}
                  />
                  {fieldError('property_name')}
                </div>
                <div className="mb-3">
                  <label htmlFor="property_address" className={labelClass}>
                    {t('property.address')}
                  </label>
                  <input
                    id="property_address"
                    type="text"
                    value={data.property_address}
                    onChange={(e) => update('property_address', e.target.value)}
                    className={inputClass}
                    placeholder={t('property.address_placeholder')}
                  />
                </div>
                <div>
                  <label htmlFor="property_unit" className={labelClass}>
                    {t('property.unit')}
                  </label>
                  <input
                    id="property_unit"
                    type="text"
                    value={data.property_unit}
                    onChange={(e) => update('property_unit', e.target.value)}
                    className={inputClass}
                    placeholder={t('property.unit_placeholder')}
                  />
                </div>
                <div className="mt-3">
                  <label className={labelClass}>{t('create_contract.property_type')} *</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(['condo', 'house', 'apartment'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => update('property_type', opt)}
                        className={chipClass(data.property_type === opt)}
                      >
                        {t(`create_contract.property_type_${opt}`)}
                      </button>
                    ))}
                  </div>
                  {data.property_type === 'condo' && (
                    <p className="mt-1 text-xs text-saffron-600">
                      {t('create_contract.condo_act_note')}
                    </p>
                  )}
                </div>
              </div>

              <div className={cardClass}>
                <p className="mb-3 text-sm font-medium text-gray-900">
                  {t('create_contract.landlord_info')}
                </p>
                <div className="mb-3">
                  <label htmlFor="landlord_name" className={labelClass}>
                    {t('auth.full_name')} *
                  </label>
                  <input
                    id="landlord_name"
                    type="text"
                    value={data.landlord_name}
                    onChange={(e) => update('landlord_name', e.target.value)}
                    className={errors.landlord_name ? inputErrorClass : inputClass}
                  />
                  {fieldError('landlord_name')}
                </div>
                <div>
                  <label htmlFor="landlord_id" className={labelClass}>
                    {t('create_contract.id_number')}
                  </label>
                  <input
                    id="landlord_id"
                    type="text"
                    value={data.landlord_id_number}
                    onChange={(e) => update('landlord_id_number', e.target.value)}
                    className={inputClass}
                    placeholder="X-XXXX-XXXXX-XX-X"
                  />
                </div>
              </div>

              <div className={cardClass}>
                <p className="mb-3 text-sm font-medium text-gray-900">
                  {t('create_contract.tenant_info')}
                </p>
                <p className="mb-3 text-xs text-gray-500">
                  {t('create_contract.tenant_blank_note')}
                </p>

                <div className="mb-3">
                  <label className={labelClass}>{t('create_contract.tenant_nationality')} *</label>
                  <div className="flex gap-2 mt-1">
                    {(['thai', 'foreign'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => update('tenant_nationality', opt)}
                        className={chipClass(data.tenant_nationality === opt)}
                      >
                        {t(`create_contract.nationality_${opt}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {data.tenant_nationality === 'foreign' && (
                  <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="flex items-start gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div>
                        <p className="text-xs font-semibold text-amber-800">
                          {t('create_contract.tm30_title')}
                        </p>
                        <p className="mt-0.5 text-xs text-amber-700">
                          {t('create_contract.tm30_description')}
                        </p>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="tenant_visa_type" className={labelClass}>
                        {t('create_contract.visa_type')}
                      </label>
                      <select
                        id="tenant_visa_type"
                        value={data.tenant_visa_type}
                        onChange={(e) => update('tenant_visa_type', e.target.value)}
                        className={inputClass}
                      >
                        <option value="">{t('create_contract.visa_select')}</option>
                        <option value="tourist">{t('create_contract.visa_tourist')}</option>
                        <option value="non_b">{t('create_contract.visa_non_b')}</option>
                        <option value="non_o">{t('create_contract.visa_non_o')}</option>
                        <option value="non_oa">{t('create_contract.visa_non_oa')}</option>
                        <option value="education">{t('create_contract.visa_education')}</option>
                        <option value="retirement">{t('create_contract.visa_retirement')}</option>
                        <option value="elite">{t('create_contract.visa_elite')}</option>
                        <option value="dtv">{t('create_contract.visa_dtv')}</option>
                        <option value="other">{t('create_contract.visa_other')}</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Financial Terms */}
          {step === 2 && (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                {t('create_contract.step2_title')}
              </h3>

              <div className={cardClass}>
                <div className="mb-3">
                  <label htmlFor="monthly_rent" className={labelClass}>
                    {t('contract.monthly_rent')} (THB) *
                  </label>
                  <input
                    id="monthly_rent"
                    type="number"
                    value={data.monthly_rent}
                    onChange={(e) => update('monthly_rent', Number(e.target.value))}
                    className={errors.monthly_rent ? inputErrorClass : inputClass}
                    min={0}
                  />
                  {fieldError('monthly_rent')}
                </div>

                <div className="mb-3">
                  <label htmlFor="deposit_months" className={labelClass}>
                    {t('contract.security_deposit')} ({t('create_contract.months')})
                  </label>
                  <select
                    id="deposit_months"
                    value={data.security_deposit_months}
                    onChange={(e) => update('security_deposit_months', Number(e.target.value))}
                    className={inputClass}
                  >
                    {[1, 2, 3].map((m) => (
                      <option key={m} value={m}>
                        {m} {t('create_contract.months')} (
                        {(data.monthly_rent * m).toLocaleString()} THB)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="payment_day" className={labelClass}>
                    {t('create_contract.payment_due_day')}
                  </label>
                  <select
                    id="payment_day"
                    value={data.payment_due_day}
                    onChange={(e) => update('payment_due_day', Number(e.target.value))}
                    className={inputClass}
                  >
                    {[1, 5, 10, 15, 25, 28].map((d) => (
                      <option key={d} value={d}>
                        {t('create_contract.day_of_month').replace('{}', String(d))}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="late_penalty" className={labelClass}>
                    {t('create_contract.late_penalty')} (% {t('create_contract.per_day')})
                  </label>
                  <select
                    id="late_penalty"
                    value={data.late_penalty_percent}
                    onChange={(e) => update('late_penalty_percent', Number(e.target.value))}
                    className={inputClass}
                  >
                    {[0.5, 1, 1.5, 2].map((p) => (
                      <option key={p} value={p}>
                        {p}%
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={cardClass}>
                <p className="mb-3 text-sm font-medium text-gray-900">
                  {t('create_contract.utilities')}
                </p>
                <div className="mb-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => update('utilities_included', false)}
                    className={chipClass(!data.utilities_included)}
                  >
                    {t('create_contract.utilities_separate')}
                  </button>
                  <button
                    type="button"
                    onClick={() => update('utilities_included', true)}
                    className={chipClass(data.utilities_included)}
                  >
                    {t('create_contract.utilities_included')}
                  </button>
                </div>
                <input
                  type="text"
                  value={data.utility_details}
                  onChange={(e) => update('utility_details', e.target.value)}
                  className={inputClass}
                  placeholder={t('create_contract.utility_details_placeholder')}
                />
              </div>
            </div>
          )}

          {/* Step 3: Property Rules */}
          {step === 3 && (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                {t('create_contract.step3_title')}
              </h3>

              <div className={cardClass}>
                <p className="mb-2 text-sm font-medium text-gray-900">
                  {t('create_contract.pets')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(['no', 'yes', 'with_deposit'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => update('pets_allowed', opt)}
                      className={chipClass(data.pets_allowed === opt)}
                    >
                      {t(`create_contract.pets_${opt}`)}
                    </button>
                  ))}
                </div>
                {data.pets_allowed === 'with_deposit' && (
                  <div className="mt-3">
                    <label htmlFor="pet_deposit" className={labelClass}>
                      {t('create_contract.pet_deposit')} (THB)
                    </label>
                    <input
                      id="pet_deposit"
                      type="number"
                      value={data.pet_deposit}
                      onChange={(e) => update('pet_deposit', Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                )}
              </div>

              <div className={cardClass}>
                <p className="mb-2 text-sm font-medium text-gray-900">
                  {t('create_contract.subletting')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => update('subletting_allowed', false)}
                    className={chipClass(!data.subletting_allowed)}
                  >
                    {t('create_contract.not_allowed')}
                  </button>
                  <button
                    type="button"
                    onClick={() => update('subletting_allowed', true)}
                    className={chipClass(data.subletting_allowed)}
                  >
                    {t('create_contract.with_consent')}
                  </button>
                </div>
              </div>

              <div className={cardClass}>
                <p className="mb-2 text-sm font-medium text-gray-900">
                  {t('create_contract.smoking')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(['no', 'outdoor_only', 'yes'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => update('smoking_allowed', opt)}
                      className={chipClass(data.smoking_allowed === opt)}
                    >
                      {t(`create_contract.smoking_${opt}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className={cardClass}>
                <p className="mb-2 text-sm font-medium text-gray-900">
                  {t('create_contract.guests')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(['allowed', 'notify_landlord', 'max_days'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => update('overnight_guests', opt)}
                      className={chipClass(data.overnight_guests === opt)}
                    >
                      {t(`create_contract.guests_${opt}`)}
                    </button>
                  ))}
                </div>
                {data.overnight_guests === 'max_days' && (
                  <div className="mt-3">
                    <label htmlFor="max_guest_days" className={labelClass}>
                      {t('create_contract.max_days')}
                    </label>
                    <input
                      id="max_guest_days"
                      type="number"
                      value={data.max_guest_days}
                      onChange={(e) => update('max_guest_days', Number(e.target.value))}
                      className={inputClass}
                      min={1}
                      max={30}
                    />
                  </div>
                )}
              </div>

              <div className={cardClass}>
                <p className="mb-2 text-sm font-medium text-gray-900">
                  {t('create_contract.quiet_hours')}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={data.quiet_hours_start}
                    onChange={(e) => update('quiet_hours_start', e.target.value)}
                    className={inputClass}
                  />
                  <span className="text-sm text-gray-500">&mdash;</span>
                  <input
                    type="time"
                    value={data.quiet_hours_end}
                    onChange={(e) => update('quiet_hours_end', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Non-waivable tenant rights (OCPB 2025) */}
              <div className={`${cardClass} border-saffron-200 bg-saffron-50`}>
                <p className="mb-2 text-sm font-semibold text-saffron-900">
                  {t('create_contract.legal_rights_title')}
                </p>
                <p className="mb-2 text-xs text-saffron-700">
                  {t('create_contract.legal_rights_note')}
                </p>
                <ul className="space-y-1 text-xs text-saffron-800">
                  <li>• {t('create_contract.right_early_termination')}</li>
                  <li>• {t('create_contract.right_utility_tariff')}</li>
                  <li>• {t('create_contract.right_deposit_return')}</li>
                  <li>• {t('create_contract.right_quiet_enjoyment')}</li>
                  <li>• {t('create_contract.right_no_lockout')}</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 4: Maintenance & Responsibilities */}
          {step === 4 && (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                {t('create_contract.step4_title')}
              </h3>

              <div className={cardClass}>
                <p className="mb-2 text-sm font-medium text-gray-900">
                  {t('create_contract.landlord_duties')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'structural_repairs',
                    'plumbing_electrical',
                    'common_areas',
                    'pest_control',
                    'appliance_replacement',
                    'exterior_maintenance',
                  ].map((duty) => (
                    <button
                      key={duty}
                      type="button"
                      onClick={() => toggleResponsibility('landlord_responsibilities', duty)}
                      className={chipClass(data.landlord_responsibilities.includes(duty))}
                    >
                      {t(`create_contract.duty_${duty}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className={cardClass}>
                <p className="mb-2 text-sm font-medium text-gray-900">
                  {t('create_contract.tenant_duties')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'daily_cleaning',
                    'minor_repairs',
                    'appliance_care',
                    'report_damage',
                    'garden_maintenance',
                    'waste_disposal',
                  ].map((duty) => (
                    <button
                      key={duty}
                      type="button"
                      onClick={() => toggleResponsibility('tenant_responsibilities', duty)}
                      className={chipClass(data.tenant_responsibilities.includes(duty))}
                    >
                      {t(`create_contract.duty_${duty}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className={cardClass}>
                <div className="mb-3">
                  <label htmlFor="response_days" className={labelClass}>
                    {t('create_contract.response_time')}
                  </label>
                  <select
                    id="response_days"
                    value={data.maintenance_response_days}
                    onChange={(e) => update('maintenance_response_days', Number(e.target.value))}
                    className={inputClass}
                  >
                    {[1, 2, 3, 5, 7].map((d) => (
                      <option key={d} value={d}>
                        {d} {t('create_contract.business_days')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="emergency_contact" className={labelClass}>
                    {t('create_contract.emergency_contact')}
                  </label>
                  <input
                    id="emergency_contact"
                    type="text"
                    value={data.emergency_contact}
                    onChange={(e) => update('emergency_contact', e.target.value)}
                    className={inputClass}
                    placeholder={t('auth.phone_placeholder')}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Termination & Safeguards */}
          {step === 5 && (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                {t('create_contract.step5_title')}
              </h3>

              <div className={cardClass}>
                <div className="mb-3">
                  <label htmlFor="lease_duration" className={labelClass}>
                    {t('create_contract.lease_duration')}
                  </label>
                  <select
                    id="lease_duration"
                    value={data.lease_duration_months}
                    onChange={(e) => update('lease_duration_months', Number(e.target.value))}
                    className={inputClass}
                  >
                    {[3, 6, 12, 18, 24, 36].map((m) => (
                      <option key={m} value={m}>
                        {m} {t('create_contract.months')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="lease_start" className={labelClass}>
                    {t('create_contract.lease_start')} *
                  </label>
                  <input
                    id="lease_start"
                    type="date"
                    value={data.lease_start_date}
                    onChange={(e) => update('lease_start_date', e.target.value)}
                    className={errors.lease_start_date ? inputErrorClass : inputClass}
                  />
                  {fieldError('lease_start_date')}
                </div>
              </div>

              <div className={cardClass}>
                <div className="mb-3">
                  <label htmlFor="termination_notice" className={labelClass}>
                    {t('create_contract.early_termination_notice')}
                  </label>
                  <select
                    id="termination_notice"
                    value={data.early_termination_notice_days}
                    onChange={(e) =>
                      update('early_termination_notice_days', Number(e.target.value))
                    }
                    className={inputClass}
                  >
                    {[15, 30, 60, 90].map((d) => (
                      <option key={d} value={d}>
                        {d} {t('create_contract.days')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="termination_penalty" className={labelClass}>
                    {t('create_contract.early_termination_penalty')}
                  </label>
                  <select
                    id="termination_penalty"
                    value={data.early_termination_penalty_months}
                    onChange={(e) =>
                      update('early_termination_penalty_months', Number(e.target.value))
                    }
                    className={inputClass}
                  >
                    {[0, 1, 2, 3].map((m) => (
                      <option key={m} value={m}>
                        {m} {t('create_contract.months_rent')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-3 rounded-lg border border-saffron-200 bg-saffron-50 p-3">
                  <p className="text-xs text-saffron-800">
                    {t('create_contract.ocpb_termination_note')}
                  </p>
                </div>
              </div>

              <div className={cardClass}>
                <div className="mb-3">
                  <p className="mb-2 text-sm font-medium text-gray-900">
                    {t('create_contract.auto_renewal')}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => update('auto_renewal', true)}
                      className={chipClass(data.auto_renewal)}
                    >
                      {t('create_contract.yes')}
                    </button>
                    <button
                      type="button"
                      onClick={() => update('auto_renewal', false)}
                      className={chipClass(!data.auto_renewal)}
                    >
                      {t('create_contract.no')}
                    </button>
                  </div>
                </div>

                {data.auto_renewal && (
                  <div className="mb-3">
                    <label htmlFor="renewal_notice" className={labelClass}>
                      {t('create_contract.renewal_notice')}
                    </label>
                    <select
                      id="renewal_notice"
                      value={data.renewal_notice_days}
                      onChange={(e) => update('renewal_notice_days', Number(e.target.value))}
                      className={inputClass}
                    >
                      {[15, 30, 60].map((d) => (
                        <option key={d} value={d}>
                          {d} {t('create_contract.days')}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className={cardClass}>
                <p className="mb-2 text-sm font-medium text-gray-900">
                  {t('create_contract.dispute_resolution')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(['negotiation', 'mediation', 'arbitration', 'court'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => update('dispute_resolution', opt)}
                      className={chipClass(data.dispute_resolution === opt)}
                    >
                      {t(`create_contract.dispute_${opt}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Review & Generate */}
          {step === 6 && (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                {t('create_contract.step6_title')}
              </h3>

              {!generatedContract ? (
                <>
                  {/* Contract Preview Summary */}
                  {!showPreview ? (
                    <>
                      <div className={cardClass}>
                        <h4 className="mb-2 text-sm font-semibold text-gray-900">
                          {t('create_contract.summary')}
                        </h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>
                            {t('property.name')}: {data.property_name}
                          </p>
                          {data.property_address && (
                            <p>
                              {t('property.address')}: {data.property_address}
                            </p>
                          )}
                          <p>
                            {t('create_contract.property_type')}:{' '}
                            {t(`create_contract.property_type_${data.property_type}`)}
                          </p>
                          <p>
                            {t('create_contract.landlord_info')}: {data.landlord_name}
                          </p>
                          <p>
                            {t('contract.monthly_rent')}: {data.monthly_rent.toLocaleString()} THB
                          </p>
                          <p>
                            {t('contract.security_deposit')}:{' '}
                            {(data.monthly_rent * data.security_deposit_months).toLocaleString()}{' '}
                            THB
                          </p>
                          <p>
                            {t('contract.lease_period')}: {data.lease_duration_months}{' '}
                            {t('create_contract.months')}
                          </p>
                          <p>
                            {t('create_contract.lease_start')}: {data.lease_start_date}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowPreview(true)}
                        className="mb-4 w-full rounded-lg border border-saffron-300 bg-saffron-50 px-4 py-2.5 text-sm font-medium text-saffron-700 hover:bg-saffron-100"
                      >
                        {t('create_contract.show_full_preview')}
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Full preview of all settings */}
                      <div className={`${cardClass} max-h-80 overflow-y-auto`}>
                        <h4 className="mb-3 text-sm font-semibold text-gray-900">
                          {t('create_contract.full_preview')}
                        </h4>

                        <div className="space-y-4 text-sm">
                          {/* Property */}
                          <div>
                            <p className="font-medium text-gray-900">
                              {t('create_contract.step1_title')}
                            </p>
                            <div className="mt-1 space-y-0.5 text-gray-600">
                              <p>
                                {t('property.name')}: {data.property_name}
                              </p>
                              {data.property_address && (
                                <p>
                                  {t('property.address')}: {data.property_address}
                                </p>
                              )}
                              {data.property_unit && (
                                <p>
                                  {t('property.unit')}: {data.property_unit}
                                </p>
                              )}
                              <p>
                                {t('create_contract.property_type')}:{' '}
                                {t(`create_contract.property_type_${data.property_type}`)}
                              </p>
                              <p>
                                {t('create_contract.landlord_info')}: {data.landlord_name}
                              </p>
                            </div>
                          </div>

                          {/* Financial */}
                          <div>
                            <p className="font-medium text-gray-900">
                              {t('create_contract.step2_title')}
                            </p>
                            <div className="mt-1 space-y-0.5 text-gray-600">
                              <p>
                                {t('contract.monthly_rent')}: ฿{data.monthly_rent.toLocaleString()}
                              </p>
                              <p>
                                {t('contract.security_deposit')}: ฿
                                {(
                                  data.monthly_rent * data.security_deposit_months
                                ).toLocaleString()}
                              </p>
                              <p>
                                {t('create_contract.payment_due_day')}:{' '}
                                {t('create_contract.day_of_month').replace(
                                  '{}',
                                  String(data.payment_due_day)
                                )}
                              </p>
                              <p>
                                {t('create_contract.late_penalty')}: {data.late_penalty_percent}%
                              </p>
                              <p>
                                {t('create_contract.utilities')}:{' '}
                                {data.utilities_included
                                  ? t('create_contract.utilities_included')
                                  : t('create_contract.utilities_separate')}
                              </p>
                            </div>
                          </div>

                          {/* Rules */}
                          <div>
                            <p className="font-medium text-gray-900">
                              {t('create_contract.step3_title')}
                            </p>
                            <div className="mt-1 space-y-0.5 text-gray-600">
                              <p>
                                {t('create_contract.pets')}:{' '}
                                {t(`create_contract.pets_${data.pets_allowed}`)}
                              </p>
                              <p>
                                {t('create_contract.smoking')}:{' '}
                                {t(`create_contract.smoking_${data.smoking_allowed}`)}
                              </p>
                              <p>
                                {t('create_contract.subletting')}:{' '}
                                {data.subletting_allowed
                                  ? t('create_contract.with_consent')
                                  : t('create_contract.not_allowed')}
                              </p>
                              <p>
                                {t('create_contract.quiet_hours')}: {data.quiet_hours_start} -{' '}
                                {data.quiet_hours_end}
                              </p>
                            </div>
                          </div>

                          {/* Termination */}
                          <div>
                            <p className="font-medium text-gray-900">
                              {t('create_contract.step5_title')}
                            </p>
                            <div className="mt-1 space-y-0.5 text-gray-600">
                              <p>
                                {t('create_contract.lease_duration')}: {data.lease_duration_months}{' '}
                                {t('create_contract.months')}
                              </p>
                              <p>
                                {t('create_contract.lease_start')}: {data.lease_start_date}
                              </p>
                              <p>
                                {t('create_contract.auto_renewal')}:{' '}
                                {data.auto_renewal
                                  ? t('create_contract.yes')
                                  : t('create_contract.no')}
                              </p>
                              <p>
                                {t('create_contract.dispute_resolution')}:{' '}
                                {t(`create_contract.dispute_${data.dispute_resolution}`)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowPreview(false)}
                        className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                      >
                        {t('create_contract.hide_preview')}
                      </button>
                    </>
                  )}

                  {/* Active template indicator */}
                  {templateName && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2">
                      <span className="text-xs text-purple-700">
                        {t('contract_templates.using_template')}: <strong>{templateName}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setTemplateText(null);
                          setTemplateName(null);
                        }}
                        className="ml-auto text-xs text-purple-500 hover:text-purple-700"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Language selector */}
                  <div className={cardClass}>
                    <p className="mb-2 text-sm font-medium text-gray-900">
                      {t('create_contract.output_language')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(['thai', 'english', 'bilingual'] as const).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => update('output_language', lang)}
                          className={chipClass(data.output_language === lang)}
                        >
                          {t(`create_contract.lang_${lang}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={generating}
                    onClick={handleGenerate}
                    className="min-h-[44px] w-full rounded-lg bg-saffron-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {generating
                      ? t('create_contract.generating')
                      : t('create_contract.generate_button')}
                  </button>

                  {generating && (
                    <div className="mt-4 flex flex-col items-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-saffron-500 border-t-transparent" />
                      <p className="mt-2 text-sm text-saffron-700">
                        {t('create_contract.generating_desc')}
                      </p>
                      <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-saffron-100">
                        <div
                          className="h-full animate-pulse rounded-full bg-saffron-500"
                          style={{ width: '60%' }}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Generated contract — editable document */}
                  <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3">
                    <p className="text-sm font-medium text-green-900">
                      {t('create_contract.generated_success')}
                    </p>
                    <p className="mt-1 text-xs text-green-700">{t('create_contract.edit_hint')}</p>
                  </div>

                  <div className="mb-4 rounded-lg border border-gray-300 bg-white shadow-sm">
                    <textarea
                      value={generatedContract}
                      onChange={(e) => setGeneratedContract(e.target.value)}
                      className="block w-full resize-y rounded-lg border-0 bg-white px-6 py-5 font-serif text-sm leading-relaxed text-gray-800 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                      style={{ minHeight: '500px' }}
                      spellCheck={false}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleDownloadAndStore()}
                      disabled={downloadingPdf}
                      className="min-h-[44px] flex-1 rounded-lg bg-saffron-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-saffron-600 disabled:opacity-50"
                    >
                      {downloadingPdf
                        ? t('create_contract.generating_pdf')
                        : t('contracts.download_and_store')}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="min-h-[44px] flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {t('create_contract.copy')}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          {!generatedContract && (
            <div className="mt-6 flex gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s - 1) as Step)}
                  className="min-h-[44px] flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t('common.back')}
                </button>
              )}
              {step < 6 && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="min-h-[44px] flex-1 rounded-lg bg-saffron-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-saffron-600 disabled:opacity-50"
                >
                  {t('create_contract.next')}
                </button>
              )}
            </div>
          )}
        </> /* end !showTemplateStep */
      )}
    </div>
  );
}

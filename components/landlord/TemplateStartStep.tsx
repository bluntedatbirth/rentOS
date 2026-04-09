'use client';

import { useEffect, useState } from 'react';

import { useI18n } from '@/lib/i18n/context';

interface ContractTemplate {
  id: string;
  name_en: string;
  name_th: string;
  description_en: string | null;
  description_th: string | null;
  category: string;
  is_system: boolean;
  template_text: string;
}

interface TemplateStartStepProps {
  /** If arriving from the template library, this name is already known */
  preloadedTemplateName: string | null;
  onUseTemplate: (templateText: string, templateName: string) => void;
  onSkip: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  residential: 'bg-blue-100 text-blue-800',
  condo: 'bg-purple-100 text-purple-800',
  furnished: 'bg-amber-100 text-amber-800',
  short_term: 'bg-pink-100 text-pink-800',
  commercial: 'bg-green-100 text-green-800',
};

export function TemplateStartStep({
  preloadedTemplateName,
  onUseTemplate,
  onSkip,
}: TemplateStartStepProps) {
  const { t, locale } = useI18n();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch('/api/contract-templates');
        if (!res.ok) return;
        const body = (await res.json()) as { templates: ContractTemplate[] };
        setTemplates(body.templates);
      } catch {
        // non-fatal
      } finally {
        setLoading(false);
      }
    };
    void fetch_();
  }, []);

  const handleSelect = async (tmpl: ContractTemplate) => {
    // If template_text already present (list endpoint may not include it for brevity),
    // fetch the full template
    setLoadingId(tmpl.id);
    try {
      const res = await fetch(`/api/contract-templates/${tmpl.id}`);
      if (!res.ok) throw new Error('Failed to load template');
      const body = (await res.json()) as { template: ContractTemplate };
      const name = locale === 'th' ? body.template.name_th : body.template.name_en;
      onUseTemplate(body.template.template_text, name);
    } catch {
      // fall back to what we have
      const name = locale === 'th' ? tmpl.name_th : tmpl.name_en;
      onUseTemplate(tmpl.template_text ?? '', name);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <div className="mb-3">
        <h3 className="font-semibold text-gray-900">{t('contract_templates.start_title')}</h3>
        <p className="mt-0.5 text-sm text-gray-500">{t('contract_templates.start_subtitle')}</p>
      </div>

      {preloadedTemplateName && (
        <div className="mb-3 rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-purple-800">
          {t('contract_templates.preloaded')}: <strong>{preloadedTemplateName}</strong>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
        </div>
      ) : (
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          {templates.slice(0, 4).map((tmpl) => {
            const name = locale === 'th' ? tmpl.name_th : tmpl.name_en;
            const catColor = CATEGORY_COLORS[tmpl.category] ?? 'bg-gray-100 text-gray-600';
            return (
              <button
                key={tmpl.id}
                type="button"
                disabled={loadingId !== null}
                onClick={() => handleSelect(tmpl)}
                className="flex min-h-[44px] items-center justify-between gap-2 rounded-lg border border-white bg-white px-3 py-2 text-left shadow-sm hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
              >
                <span className="text-sm font-medium text-gray-800">{name}</span>
                <div className="flex shrink-0 items-center gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${catColor}`}>
                    {tmpl.category}
                  </span>
                  {loadingId === tmpl.id && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={onSkip}
        className="min-h-[44px] w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        {t('contract_templates.start_scratch')}
      </button>
    </div>
  );
}

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
  residential: 'bg-saffron-100 text-saffron-800 dark:bg-saffron-500/15 dark:text-saffron-300',
  condo: 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300',
  furnished: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400',
  short_term: 'bg-pink-100 text-pink-800 dark:bg-pink-500/15 dark:text-pink-300',
  commercial: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400',
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
    <div className="mb-6 rounded-xl border border-saffron-200 bg-saffron-50 p-4 dark:border-saffron-500/20 dark:bg-saffron-500/10">
      <div className="mb-3">
        <h3 className="font-semibold text-charcoal-900 dark:text-white">
          {t('contract_templates.start_title')}
        </h3>
        <p className="mt-0.5 text-sm text-charcoal-500 dark:text-white/50">
          {t('contract_templates.start_subtitle')}
        </p>
      </div>

      {preloadedTemplateName && (
        <div className="mb-3 rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-purple-800 dark:border-purple-500/20 dark:bg-charcoal-800 dark:text-purple-300">
          {t('contract_templates.preloaded')}: <strong>{preloadedTemplateName}</strong>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-saffron-300 border-t-saffron-600 dark:border-saffron-500/40 dark:border-t-saffron-400" />
        </div>
      ) : (
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          {templates.slice(0, 4).map((tmpl) => {
            const name = locale === 'th' ? tmpl.name_th : tmpl.name_en;
            const catColor =
              CATEGORY_COLORS[tmpl.category] ??
              'bg-warm-200 text-charcoal-600 dark:bg-white/5 dark:text-white/60';
            return (
              <button
                key={tmpl.id}
                type="button"
                disabled={loadingId !== null}
                onClick={() => handleSelect(tmpl)}
                className="flex min-h-[44px] items-center justify-between gap-2 rounded-lg border border-warm-200 bg-white px-3 py-2 text-left shadow-sm hover:border-saffron-300 hover:bg-saffron-50 disabled:opacity-50 dark:border-white/10 dark:bg-charcoal-800 dark:hover:border-saffron-400 dark:hover:bg-saffron-500/10 dark:shadow-black/20"
              >
                <span className="text-sm font-medium text-charcoal-800 dark:text-white/90">
                  {name}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${catColor}`}>
                    {tmpl.category}
                  </span>
                  {loadingId === tmpl.id && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-saffron-300 border-t-saffron-600 dark:border-saffron-500/40 dark:border-t-saffron-400" />
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
        className="min-h-[44px] w-full rounded-lg border border-warm-300 bg-white px-4 py-2 text-sm font-medium text-charcoal-600 hover:bg-warm-50 dark:border-white/15 dark:bg-charcoal-800 dark:text-white/60 dark:hover:bg-white/5"
      >
        {t('contract_templates.start_scratch')}
      </button>
    </div>
  );
}

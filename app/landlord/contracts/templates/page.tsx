'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/ToastProvider';

interface ContractTemplate {
  id: string;
  name_en: string;
  name_th: string;
  description_en: string | null;
  description_th: string | null;
  category: string;
  is_system: boolean;
  landlord_id: string | null;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, { en: string; th: string; color: string }> = {
  residential: { en: 'Residential', th: 'ที่พักอาศัย', color: 'bg-saffron-100 text-saffron-800' },
  condo: { en: 'Condo', th: 'คอนโดมิเนียม', color: 'bg-purple-100 text-purple-800' },
  furnished: { en: 'Furnished', th: 'พร้อมเฟอร์นิเจอร์', color: 'bg-amber-100 text-amber-800' },
  short_term: { en: 'Short-Term', th: 'ระยะสั้น', color: 'bg-pink-100 text-pink-800' },
  commercial: { en: 'Commercial', th: 'พาณิชย์', color: 'bg-green-100 text-green-800' },
};

export default function ContractTemplatesPage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const router = useRouter();

  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/contract-templates');
      if (!res.ok) throw new Error('Failed to fetch');
      const body = (await res.json()) as { templates: ContractTemplate[] };
      setTemplates(body.templates);
    } catch {
      toast.error(t('contract_templates.load_error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUseTemplate = (template: ContractTemplate) => {
    router.push(`/landlord/contracts/create?template_id=${template.id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('contract_templates.delete_confirm'))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/contract-templates/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? 'Delete failed');
      }
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success(t('contract_templates.deleted'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('contract_templates.delete_error'));
    } finally {
      setDeletingId(null);
    }
  };

  const systemTemplates = templates.filter((tmpl) => tmpl.is_system);
  const customTemplates = templates.filter((tmpl) => !tmpl.is_system);

  const TemplateName = (tmpl: ContractTemplate) => (locale === 'th' ? tmpl.name_th : tmpl.name_en);
  const TemplateDesc = (tmpl: ContractTemplate) =>
    (locale === 'th' ? tmpl.description_th : tmpl.description_en) ?? '';

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/landlord/contracts/create"
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
            {t('nav.contracts')}
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{t('contract_templates.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('contract_templates.subtitle')}</p>
        </div>
        <Link
          href="/landlord/contracts/templates/new"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
        >
          <span>+</span>
          <span>{t('contract_templates.create_custom')}</span>
          <span className="rounded-full bg-purple-800 px-1.5 py-0.5 text-xs font-bold">PRO</span>
        </Link>
      </div>

      {loading && (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
        </div>
      )}

      {!loading && (
        <>
          {/* System templates */}
          <section className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-800">
                {t('contract_templates.system_section')}
              </h2>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                {systemTemplates.length}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {systemTemplates.map((tmpl) => {
                const cat = CATEGORY_LABELS[tmpl.category];
                return (
                  <div
                    key={tmpl.id}
                    className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                      <h3 className="font-medium text-gray-900">{TemplateName(tmpl)}</h3>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${cat?.color ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {locale === 'th' ? cat?.th : cat?.en}
                        </span>
                        <span className="rounded-full bg-saffron-50 px-2 py-0.5 text-xs font-medium text-saffron-700">
                          {t('contract_templates.built_in_badge')}
                        </span>
                      </div>
                    </div>
                    {TemplateDesc(tmpl) && (
                      <p className="mb-4 flex-1 text-sm text-gray-500">{TemplateDesc(tmpl)}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => handleUseTemplate(tmpl)}
                      className="min-h-[44px] w-full rounded-lg bg-saffron-500 py-2 text-sm font-medium text-white hover:bg-saffron-600"
                    >
                      {t('contract_templates.use_template')}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Custom templates */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-800">
                {t('contract_templates.custom_section')}
              </h2>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                {customTemplates.length}
              </span>
            </div>
            {customTemplates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-10 text-center">
                <p className="mb-4 text-sm text-gray-500">{t('contract_templates.no_custom')}</p>
                <Link
                  href="/landlord/contracts/templates/new"
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-purple-300 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50"
                >
                  {t('contract_templates.create_first')}
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {customTemplates.map((tmpl) => {
                  const cat = CATEGORY_LABELS[tmpl.category];
                  return (
                    <div
                      key={tmpl.id}
                      className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                        <h3 className="font-medium text-gray-900">{TemplateName(tmpl)}</h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${cat?.color ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {locale === 'th' ? cat?.th : cat?.en}
                        </span>
                      </div>
                      {TemplateDesc(tmpl) && (
                        <p className="mb-4 flex-1 text-sm text-gray-500">{TemplateDesc(tmpl)}</p>
                      )}
                      <div className="mt-auto flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleUseTemplate(tmpl)}
                          className="min-h-[44px] flex-1 rounded-lg bg-saffron-500 py-2 text-sm font-medium text-white hover:bg-saffron-600"
                        >
                          {t('contract_templates.use_template')}
                        </button>
                        <Link
                          href={`/landlord/contracts/templates/${tmpl.id}/edit`}
                          className="flex min-h-[44px] items-center rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                        >
                          {t('property.edit')}
                        </Link>
                        <button
                          type="button"
                          disabled={deletingId === tmpl.id}
                          onClick={() => handleDelete(tmpl.id)}
                          className="flex min-h-[44px] items-center rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === tmpl.id ? '...' : t('contract_templates.delete')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

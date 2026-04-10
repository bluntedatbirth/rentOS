'use client';

import { useI18n } from '@/lib/i18n/context';

interface Document {
  id: string;
  category: string;
  public_url: string;
  file_name: string;
  file_size: number | null;
  version: number;
  notes: string | null;
  created_at: string;
  properties?: { name: string } | null;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface TenantDocumentsClientProps {
  documents: Document[];
  activeContractId: string | null;
}

export function TenantDocumentsClient({ documents, activeContractId: _activeContractId }: TenantDocumentsClientProps) {
  const { t, formatDate } = useI18n();

  const categoryLabel = (cat: string): string => {
    switch (cat) {
      case 'contract':
        return t('documents.category_contract');
      case 'tenant_id':
        return t('documents.category_tenant_id');
      case 'inspection':
        return t('documents.category_inspection');
      case 'receipt':
        return t('documents.category_receipt');
      case 'other':
        return t('documents.category_other');
      default:
        return cat;
    }
  };

  const categoryBadgeColor = (cat: string): string => {
    switch (cat) {
      case 'contract':
        return 'bg-saffron-100 text-saffron-800';
      case 'tenant_id':
        return 'bg-purple-100 text-purple-800';
      case 'inspection':
        return 'bg-yellow-100 text-yellow-800';
      case 'receipt':
        return 'bg-green-100 text-green-800';
      case 'other':
        return 'bg-charcoal-100 text-charcoal-700';
      default:
        return 'bg-charcoal-100 text-charcoal-700';
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-6 text-xl font-bold text-charcoal-900">{t('documents.title')}</h2>

      {documents.length === 0 ? (
        <div className="rounded-lg bg-warm-50 p-8 text-center text-sm text-charcoal-500">
          {t('documents.empty_tenant')}
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="rounded-lg bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="truncate text-sm font-semibold text-charcoal-900">
                      {doc.file_name}
                    </p>
                    {doc.version > 1 && (
                      <span className="rounded bg-warm-100 px-1.5 py-0.5 text-xs text-charcoal-500">
                        v{doc.version}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoryBadgeColor(doc.category)}`}
                    >
                      {categoryLabel(doc.category)}
                    </span>
                    {doc.properties?.name && (
                      <span className="text-xs text-charcoal-500">{doc.properties.name}</span>
                    )}
                    {doc.file_size && (
                      <span className="text-xs text-charcoal-400">
                        {formatFileSize(doc.file_size)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-charcoal-400">{formatDate(doc.created_at)}</p>
                  {doc.notes && (
                    <p className="mt-1 text-xs text-charcoal-500 italic">{doc.notes}</p>
                  )}
                </div>
                <a
                  href={doc.public_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] shrink-0 inline-flex items-center rounded-lg bg-saffron-50 px-3 py-2 text-xs font-medium text-saffron-700 hover:bg-saffron-100"
                >
                  {t('documents.view')}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

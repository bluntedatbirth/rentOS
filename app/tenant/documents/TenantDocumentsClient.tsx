'use client';

import { useState, useRef } from 'react';
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

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

interface TenantDocumentsClientProps {
  documents: Document[];
  activeContractId?: string | null;
}

export function TenantDocumentsClient({ documents, activeContractId }: TenantDocumentsClientProps) {
  const { t, formatDate } = useI18n();

  const [showForm, setShowForm] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<'tenant_id' | 'receipt' | 'other'>(
    'tenant_id'
  );
  const [uploadNotes, setUploadNotes] = useState('');
  const [fileSizeError, setFileSizeError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [docList, setDocList] = useState<Document[]>(documents);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = () => {
    const file = fileRef.current?.files?.[0];
    setFileSizeError(!!file && file.size > MAX_UPLOAD_BYTES);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !activeContractId) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      setFileSizeError(true);
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', uploadCategory);
      fd.append('contract_id', activeContractId);
      if (uploadNotes.trim()) fd.append('notes', uploadNotes.trim());

      const res = await fetch('/api/documents', { method: 'POST', body: fd });
      if (res.ok) {
        const newDoc = (await res.json()) as Document;
        setDocList((prev) => [newDoc, ...prev]);
        setShowForm(false);
        setUploadCategory('tenant_id');
        setUploadNotes('');
        setFileSizeError(false);
        if (fileRef.current) fileRef.current.value = '';
        setSuccessToast(true);
        setTimeout(() => setSuccessToast(false), 3000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      {successToast && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {t('tenant.documents_upload_success')}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-charcoal-900 dark:text-white">
          {t('documents.title')}
        </h2>
        {activeContractId && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-saffron-400 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-saffron-500"
          >
            <span aria-hidden="true">+</span>
            {t('tenant.documents_upload_button')}
          </button>
        )}
      </div>

      {!activeContractId && (
        <div className="mb-6 rounded-lg border border-saffron-200 bg-saffron-50 px-4 py-3 text-sm text-saffron-800">
          {t('tenant.documents_upload_no_contract')}
        </div>
      )}

      {activeContractId && showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 space-y-4 rounded-xl border border-charcoal-200 bg-white dark:bg-charcoal-800 p-5 shadow-sm"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-charcoal-700 dark:text-white/70">
              {t('tenant.documents_upload_category')}
            </label>
            <select
              value={uploadCategory}
              onChange={(e) =>
                setUploadCategory(e.target.value as 'tenant_id' | 'receipt' | 'other')
              }
              className="w-full rounded-lg border border-charcoal-300 bg-white dark:bg-charcoal-800 px-3 py-2 text-sm text-charcoal-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-saffron-400"
            >
              <option value="tenant_id">{t('tenant.documents_upload_category_tenant_id')}</option>
              <option value="receipt">{t('tenant.documents_upload_category_receipt')}</option>
              <option value="other">{t('tenant.documents_upload_category_other')}</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-charcoal-700 dark:text-white/70">
              {t('tenant.documents_upload_file')}
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              required
              onChange={handleFileChange}
              className="block w-full text-sm text-charcoal-700 dark:text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-saffron-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-saffron-700 hover:file:bg-saffron-100"
            />
            {fileSizeError && (
              <p className="mt-1 text-xs text-red-600">{t('tenant.documents_upload_too_large')}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-charcoal-700 dark:text-white/70">
              {t('tenant.documents_upload_notes')}
            </label>
            <textarea
              value={uploadNotes}
              onChange={(e) => setUploadNotes(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-charcoal-300 bg-white dark:bg-charcoal-800 px-3 py-2 text-sm text-charcoal-900 dark:text-white placeholder-charcoal-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-saffron-400"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-charcoal-300 dark:border-white/10 px-4 py-2 text-sm text-charcoal-700 dark:text-white/70 transition-colors hover:bg-charcoal-50 dark:hover:bg-white/5"
            >
              {t('common.cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting || fileSizeError}
              className="rounded-lg bg-saffron-400 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-saffron-500 disabled:opacity-50"
            >
              {t('tenant.documents_upload_submit')}
            </button>
          </div>
        </form>
      )}

      {docList.length === 0 ? (
        <div className="rounded-lg bg-warm-50 dark:bg-charcoal-900 p-8 text-center text-sm text-charcoal-500 dark:text-white/50">
          {t('documents.empty_tenant')}
        </div>
      ) : (
        <div className="space-y-3">
          {docList.map((doc) => (
            <div key={doc.id} className="rounded-lg bg-white dark:bg-charcoal-800 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-charcoal-900 dark:text-white">
                      {doc.file_name}
                    </p>
                    {doc.version > 1 && (
                      <span className="rounded bg-warm-100 dark:bg-white/5 px-1.5 py-0.5 text-xs text-charcoal-500 dark:text-white/50">
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
                      <span className="text-xs text-charcoal-500 dark:text-white/50">
                        {doc.properties.name}
                      </span>
                    )}
                    {doc.file_size && (
                      <span className="text-xs text-charcoal-400 dark:text-white/40">
                        {formatFileSize(doc.file_size)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-charcoal-400 dark:text-white/40">
                    {formatDate(doc.created_at)}
                  </p>
                  {doc.notes && (
                    <p className="mt-1 text-xs italic text-charcoal-500 dark:text-white/50">
                      {doc.notes}
                    </p>
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

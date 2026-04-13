'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';
import { ProBadge } from '@/components/ui/ProBadge';
import { UpgradePrompt } from '@/components/ui/UpgradePrompt';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

interface Document {
  id: string;
  landlord_id: string;
  property_id: string | null;
  contract_id: string | null;
  category: string;
  public_url: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  version: number;
  notes: string | null;
  created_at: string;
  properties?: { name: string } | null;
}

interface Property {
  id: string;
  name: string;
}

type Category = 'all' | 'contract' | 'tenant_id' | 'inspection' | 'receipt' | 'other';

const PRO_CATEGORIES: Category[] = ['tenant_id', 'inspection', 'receipt', 'other'];

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocumentsClientProps {
  initialDocuments: Document[];
  initialProperties: Property[];
  isPro: boolean;
}

export function DocumentsClient({
  initialDocuments,
  initialProperties,
  isPro,
}: DocumentsClientProps) {
  const { t, formatDate } = useI18n();

  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [properties] = useState<Property[]>(initialProperties);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<string>('contract');
  const [uploadPropertyId, setUploadPropertyId] = useState<string>('');
  const [uploadNotes, setUploadNotes] = useState<string>('');

  const loadDocuments = useCallback(async (category: Category) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      const res = await fetch(`/api/documents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCategoryClick = (cat: Category) => {
    if (PRO_CATEGORIES.includes(cat) && !isPro) {
      setShowUpgradePrompt(true);
      return;
    }
    setActiveCategory(cat);
    void loadDocuments(cat);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    }
    setDeleteConfirmId(null);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('category', uploadCategory);
    if (uploadPropertyId) formData.append('property_id', uploadPropertyId);
    if (uploadNotes) formData.append('notes', uploadNotes);

    const res = await fetch('/api/documents', { method: 'POST', body: formData });
    setUploading(false);

    if (res.ok) {
      setShowUploadForm(false);
      setUploadFile(null);
      setUploadCategory('contract');
      setUploadPropertyId('');
      setUploadNotes('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadDocuments(activeCategory);
    } else {
      const err = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setUploadError(null);
        setShowUploadForm(false);
        setShowUpgradePrompt(true);
      } else {
        setUploadError(err.error ?? t('documents.upload_error'));
      }
    }
  };

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
        return 'bg-saffron-100 text-saffron-800 dark:bg-saffron-500/15 dark:text-saffron-300';
      case 'tenant_id':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300';
      case 'inspection':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300';
      case 'receipt':
        return 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400';
      case 'other':
        return 'bg-warm-200 text-charcoal-700 dark:bg-white/5 dark:text-white/70';
      default:
        return 'bg-warm-200 text-charcoal-700 dark:bg-white/5 dark:text-white/70';
    }
  };

  const tabs: { key: Category; label: string; isPro: boolean }[] = [
    { key: 'all', label: t('documents.tab_all'), isPro: false },
    { key: 'contract', label: t('documents.category_contract'), isPro: false },
    { key: 'tenant_id', label: t('documents.category_tenant_id'), isPro: true },
    { key: 'inspection', label: t('documents.category_inspection'), isPro: true },
    { key: 'receipt', label: t('documents.category_receipt'), isPro: true },
    { key: 'other', label: t('documents.category_other'), isPro: true },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-charcoal-900 dark:text-white">
          {t('documents.title')}
        </h2>
        <div className="flex gap-2">
          <Link
            href="/landlord/documents/tm30"
            className="min-h-[44px] inline-flex items-center rounded-lg bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:hover:bg-amber-500/20 dark:border-amber-500/20"
          >
            📋 {t('tm30.generate_button')}
          </Link>
          <button
            type="button"
            onClick={() => setShowUploadForm(true)}
            className="min-h-[44px] rounded-lg bg-saffron-500 px-4 py-2 text-sm font-medium text-white hover:bg-saffron-600"
          >
            + {t('documents.upload')}
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleCategoryClick(tab.key)}
            className={`flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              activeCategory === tab.key
                ? 'bg-saffron-500 text-white'
                : 'bg-warm-200 text-charcoal-700 hover:bg-warm-200/80 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10'
            }`}
          >
            {tab.label}
            {tab.isPro && !isPro && <ProBadge className="ml-0.5" />}
          </button>
        ))}
      </div>

      {/* Documents list */}
      {loading ? (
        <LoadingSkeleton count={4} />
      ) : documents.length === 0 ? (
        <div className="rounded-lg bg-warm-50 p-8 text-center text-sm text-charcoal-500 dark:bg-charcoal-900 dark:text-white/50">
          {t('documents.empty')}
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="rounded-lg bg-white p-4 shadow-sm dark:bg-charcoal-800 dark:shadow-black/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="truncate text-sm font-semibold text-charcoal-900 dark:text-white">
                      {doc.file_name}
                    </p>
                    {doc.version > 1 && (
                      <span className="rounded bg-warm-200 px-1.5 py-0.5 text-xs text-charcoal-500 dark:bg-white/5 dark:text-white/50">
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
                    <p className="mt-1 text-xs text-charcoal-500 italic dark:text-white/50">
                      {doc.notes}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <a
                    href={doc.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] inline-flex items-center rounded-lg bg-saffron-50 px-3 py-2 text-xs font-medium text-saffron-700 hover:bg-saffron-100 dark:bg-saffron-500/10 dark:text-saffron-400 dark:hover:bg-saffron-500/15"
                  >
                    {t('documents.view')}
                  </a>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(doc.id)}
                    className="min-h-[44px] rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-500/15 dark:text-red-400 dark:hover:bg-red-500/20"
                  >
                    {t('documents.delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-charcoal-800">
            <h3 className="mb-2 text-base font-bold text-charcoal-900 dark:text-white">
              {t('documents.delete_confirm_title')}
            </h3>
            <p className="mb-5 text-sm text-charcoal-600 dark:text-white/60">
              {t('documents.delete_confirm_body')}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 min-h-[44px] rounded-lg border border-warm-200 text-sm font-medium text-charcoal-700 hover:bg-warm-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 min-h-[44px] rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700"
              >
                {t('documents.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload form modal */}
      {showUploadForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl dark:bg-charcoal-800">
            <h3 className="mb-4 text-base font-bold text-charcoal-900 dark:text-white">
              {t('documents.upload')}
            </h3>
            <form onSubmit={handleUpload} className="space-y-4">
              {/* File picker */}
              <div>
                <label className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-white/70">
                  {t('documents.file')}
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  required
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-lg border border-warm-200 p-2 text-sm dark:border-white/10 dark:bg-charcoal-800 dark:text-white"
                />
                <p className="mt-1 text-xs text-charcoal-400 dark:text-white/40">
                  {t('documents.file_hint')}
                </p>
              </div>

              {/* Category */}
              <div>
                <label className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-white/70">
                  {t('documents.category')}
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full min-h-[44px] rounded-lg border border-warm-200 px-3 text-sm text-charcoal-900 dark:border-white/10 dark:bg-charcoal-800 dark:text-white"
                >
                  <option value="contract">{t('documents.category_contract')}</option>
                  <option value="tenant_id" disabled={!isPro}>
                    {t('documents.category_tenant_id')}
                    {!isPro ? ' (Pro)' : ''}
                  </option>
                  <option value="inspection" disabled={!isPro}>
                    {t('documents.category_inspection')}
                    {!isPro ? ' (Pro)' : ''}
                  </option>
                  <option value="receipt" disabled={!isPro}>
                    {t('documents.category_receipt')}
                    {!isPro ? ' (Pro)' : ''}
                  </option>
                  <option value="other" disabled={!isPro}>
                    {t('documents.category_other')}
                    {!isPro ? ' (Pro)' : ''}
                  </option>
                </select>
              </div>

              {/* Property selector */}
              <div>
                <label className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-white/70">
                  {t('documents.property_optional')}
                </label>
                <select
                  value={uploadPropertyId}
                  onChange={(e) => setUploadPropertyId(e.target.value)}
                  className="w-full min-h-[44px] rounded-lg border border-warm-200 px-3 text-sm text-charcoal-900 dark:border-white/10 dark:bg-charcoal-800 dark:text-white"
                >
                  <option value="">{t('documents.no_property')}</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-white/70">
                  {t('documents.notes_optional')}
                </label>
                <textarea
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  rows={2}
                  placeholder={t('documents.notes_placeholder')}
                  className="w-full rounded-lg border border-warm-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-charcoal-800 dark:text-white"
                />
              </div>

              {uploadError && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
                  {uploadError}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="flex-1 min-h-[44px] rounded-lg border border-warm-200 text-sm font-medium text-charcoal-700 hover:bg-warm-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="flex-1 min-h-[44px] rounded-lg bg-saffron-500 text-sm font-medium text-white hover:bg-saffron-600 disabled:opacity-50"
                >
                  {uploading ? t('common.loading') : t('documents.upload_submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upgrade prompt */}
      {showUpgradePrompt && (
        <UpgradePrompt
          feature={t('documents.upgrade_feature')}
          onDismiss={() => setShowUpgradePrompt(false)}
        />
      )}
    </div>
  );
}

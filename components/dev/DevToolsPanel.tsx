'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/ToastProvider';

export function DevToolsPanel() {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canConfirm = confirmText === 'RESET';

  function openModal() {
    setConfirmText('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setConfirmText('');
  }

  async function handleReset() {
    if (!canConfirm || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/dev/reset-my-data', { method: 'POST' });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        deleted?: Record<string, number>;
      };
      if (!res.ok) throw new Error(data.error ?? 'Reset failed');

      const counts = Object.entries(data.deleted ?? {})
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${v} ${k}`)
        .join(', ');

      toast.success(t('dev.reset_success').replace('{counts}', counts || '0 rows'));
      closeModal();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('dev.reset_error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <details className="mt-12 rounded-lg border border-gray-300 bg-gray-50">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-gray-600">
          {t('dev.tools_title')}
        </summary>
        <div className="border-t border-gray-200 p-4">
          <p className="mb-3 text-xs text-gray-500">{t('dev.reset_confirm_body')}</p>
          <button
            type="button"
            onClick={openModal}
            className="min-h-[44px] rounded-lg border-2 border-red-500 bg-white px-4 py-2 font-semibold text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            {t('dev.reset_button')}
          </button>
        </div>
      </details>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dev-reset-title"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 id="dev-reset-title" className="text-lg font-bold text-charcoal-900">
              {t('dev.reset_confirm_title')}
            </h3>
            <p className="mt-2 text-sm text-charcoal-700">{t('dev.reset_confirm_body')}</p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canConfirm) void handleReset();
                if (e.key === 'Escape') closeModal();
              }}
              placeholder={t('dev.reset_type_to_confirm')}
              className="mt-4 w-full rounded border border-warm-200 px-3 py-2 text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-red-400"
              autoFocus
              disabled={submitting}
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="rounded px-4 py-2 text-charcoal-700 hover:bg-warm-100 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void handleReset()}
                disabled={!canConfirm || submitting}
                className="rounded bg-red-600 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? t('common.loading') : t('dev.reset_button')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

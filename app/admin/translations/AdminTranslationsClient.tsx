'use client';

import { useState } from 'react';

type ReportStatus = 'pending' | 'accepted' | 'rejected' | 'applied';

interface TranslationReport {
  id: string;
  locale: string;
  key: string;
  current_value: string;
  suggestion: string | null;
  user_id: string;
  status: ReportStatus;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

type FilterTab = ReportStatus | 'all';

const TABS: { key: FilterTab; labelKey: string }[] = [
  { key: 'pending', labelKey: 'admin.translations.tab_pending' },
  { key: 'accepted', labelKey: 'admin.translations.tab_accepted' },
  { key: 'rejected', labelKey: 'admin.translations.tab_rejected' },
  { key: 'applied', labelKey: 'admin.translations.tab_applied' },
  { key: 'all', labelKey: 'admin.translations.tab_all' },
];

// Simple label map since we can't use useI18n in a static-looking server-passed client component
const EN_LABELS: Record<string, string> = {
  'admin.translations.tab_pending': 'Pending',
  'admin.translations.tab_accepted': 'Accepted',
  'admin.translations.tab_rejected': 'Rejected',
  'admin.translations.tab_applied': 'Applied',
  'admin.translations.tab_all': 'All',
  'admin.translations.accept': 'Accept',
  'admin.translations.reject': 'Reject',
  'admin.translations.apply_to_file': 'Apply to file',
  'admin.translations.empty_pending': 'No reports in this tab.',
};

function label(key: string): string {
  return EN_LABELS[key] ?? key;
}

export function AdminTranslationsClient({
  initialReports,
}: {
  initialReports: TranslationReport[];
}) {
  const [reports, setReports] = useState<TranslationReport[]>(initialReports);
  const [tab, setTab] = useState<FilterTab>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const filtered = tab === 'all' ? reports : reports.filter((r) => r.status === tab);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function doAction(id: string, action: 'accept' | 'reject' | 'apply') {
    setActionLoading(`${id}-${action}`);
    try {
      const res = await fetch(`/api/translation-reports/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'Action failed');
      }
      const newStatus: ReportStatus =
        action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'applied';
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
      showToast(`Report ${newStatus}.`, true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', false);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-charcoal-50 p-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
            toast.ok ? 'bg-charcoal-800' : 'bg-error-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-2xl font-bold text-charcoal-900">Translation Reports</h1>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 border-b border-charcoal-200">
          {TABS.map((t) => {
            const count =
              t.key === 'all' ? reports.length : reports.filter((r) => r.status === t.key).length;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.key
                    ? 'border-charcoal-800 text-charcoal-900'
                    : 'border-transparent text-charcoal-500 hover:text-charcoal-700'
                }`}
              >
                {label(t.labelKey)}
                <span className="ml-1.5 rounded-full bg-charcoal-100 px-1.5 py-0.5 text-xs text-charcoal-600">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-charcoal-400">
            {label('admin.translations.empty_pending')}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-charcoal-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-charcoal-100 bg-charcoal-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-charcoal-500 uppercase tracking-wide">
                    Locale
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-charcoal-500 uppercase tracking-wide">
                    Key
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-charcoal-500 uppercase tracking-wide">
                    Current
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-charcoal-500 uppercase tracking-wide">
                    Suggestion
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-charcoal-500 uppercase tracking-wide">
                    Submitted
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-charcoal-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-charcoal-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((report) => (
                  <tr
                    key={report.id}
                    className="border-b border-charcoal-50 last:border-0 hover:bg-warm-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-charcoal-700 uppercase">
                      {report.locale}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-charcoal-800 max-w-[200px] break-all">
                      {report.key}
                    </td>
                    <td
                      className="px-4 py-3 text-charcoal-500 max-w-[160px] truncate"
                      title={report.current_value}
                    >
                      {report.current_value}
                    </td>
                    <td className="px-4 py-3 text-charcoal-800 max-w-[200px]">
                      {report.suggestion ?? <span className="italic text-charcoal-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-charcoal-400">
                      {new Date(report.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          report.status === 'pending'
                            ? 'bg-warm-100 text-warm-800'
                            : report.status === 'accepted'
                              ? 'bg-sage-100 text-sage-700'
                              : report.status === 'applied'
                                ? 'bg-saffron-100 text-saffron-800'
                                : 'bg-charcoal-100 text-charcoal-500'
                        }`}
                      >
                        {report.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {report.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              disabled={actionLoading === `${report.id}-accept`}
                              onClick={() => doAction(report.id, 'accept')}
                              className="min-h-[32px] rounded-lg bg-saffron-500 px-3 py-1 text-xs font-medium text-white hover:bg-saffron-600 disabled:opacity-50"
                            >
                              {label('admin.translations.accept')}
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading === `${report.id}-reject`}
                              onClick={() => doAction(report.id, 'reject')}
                              className="min-h-[32px] rounded-lg border border-sage-500 px-3 py-1 text-xs font-medium text-sage-700 hover:bg-sage-50 disabled:opacity-50"
                            >
                              {label('admin.translations.reject')}
                            </button>
                          </>
                        )}
                        {report.status === 'accepted' && report.suggestion && (
                          <button
                            type="button"
                            disabled={actionLoading === `${report.id}-apply`}
                            onClick={() => doAction(report.id, 'apply')}
                            className="min-h-[32px] rounded-lg border border-charcoal-300 px-3 py-1 text-xs font-medium text-charcoal-700 hover:bg-charcoal-50 disabled:opacity-50"
                          >
                            {label('admin.translations.apply_to_file')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

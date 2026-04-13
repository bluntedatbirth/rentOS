'use client';

import { useCallback, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { UpgradePrompt } from '@/components/ui/UpgradePrompt';

// ── Types ──────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  revenue: {
    this_month: number;
    last_month: number;
    mom_change: number;
    total_outstanding: number;
  };
  properties: {
    total: number;
    vacancy_rate: number;
    avg_rent: number;
  };
  payments: {
    late_payment_rate: number;
    on_time_rate: number;
    total_overdue_amount: number;
  };
  monthly_trend: { month: string; revenue: number; expected: number }[];
  property_performance: {
    property_id: string;
    property_name: string;
    monthly_rent: number;
    total_collected: number;
    total_overdue: number;
    occupancy_months: number;
    is_occupied: boolean;
  }[];
}

type SortKey = 'property_name' | 'monthly_rent' | 'total_collected' | 'total_overdue';
type SortDir = 'asc' | 'desc';

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `฿${Math.round(n).toLocaleString()}`;
}

function fmtPct(n: number) {
  return `${n}%`;
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  badge,
  badgeColor,
  valueColor,
  sub,
}: {
  label: string;
  value: string;
  badge?: string;
  badgeColor?: string;
  valueColor?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-charcoal-800 dark:shadow-black/20">
      <p className="text-xs font-medium text-charcoal-500 dark:text-white/50">{label}</p>
      <div className="mt-1 flex items-end gap-2">
        <p className={`text-xl font-bold ${valueColor ?? 'text-charcoal-900 dark:text-white'}`}>
          {value}
        </p>
        {badge && (
          <span
            className={`mb-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${badgeColor ?? 'bg-warm-200 text-charcoal-600 dark:bg-white/5 dark:text-white/60'}`}
          >
            {badge}
          </span>
        )}
      </div>
      {sub && <p className="mt-1 text-xs text-charcoal-400 dark:text-white/40">{sub}</p>}
    </div>
  );
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────

function BarChart({ data }: { data: { month: string; revenue: number; expected: number }[] }) {
  const { t } = useI18n();
  const maxVal = Math.max(...data.flatMap((d) => [d.revenue, d.expected]), 1);

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-charcoal-800 dark:shadow-black/20">
      <h3 className="mb-4 text-sm font-semibold text-charcoal-700 dark:text-white/70">
        {t('analytics.revenue_trend')}
      </h3>
      {/* Legend */}
      <div className="mb-4 flex gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-saffron-500" />
          {t('analytics.collected')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-warm-200 dark:bg-charcoal-700" />
          {t('analytics.expected')}
        </span>
      </div>
      {/* Chart area */}
      <div className="overflow-x-auto">
        <div className="flex min-w-[560px] items-end gap-1 px-2" style={{ height: '160px' }}>
          {data.map((d) => {
            const revPct = (d.revenue / maxVal) * 100;
            const expPct = (d.expected / maxVal) * 100;
            const shortMonth = d.month.slice(5); // "MM"
            return (
              <div
                key={d.month}
                className="group relative flex flex-1 flex-col items-center gap-0.5"
              >
                {/* Bars */}
                <div className="flex w-full items-end gap-0.5" style={{ height: '140px' }}>
                  {/* Expected (warm behind) */}
                  <div
                    className="flex-1 rounded-t bg-warm-200 transition-all dark:bg-charcoal-700"
                    style={{ height: `${expPct}%`, minHeight: d.expected > 0 ? '2px' : '0' }}
                    title={`${t('analytics.expected')}: ${fmt(d.expected)}`}
                  />
                  {/* Collected (saffron in front) */}
                  <div
                    className="flex-1 rounded-t bg-saffron-500 transition-all"
                    style={{ height: `${revPct}%`, minHeight: d.revenue > 0 ? '2px' : '0' }}
                    title={`${t('analytics.collected')}: ${fmt(d.revenue)}`}
                  />
                </div>
                {/* Month label */}
                <span className="text-[10px] text-charcoal-400 dark:text-white/40">
                  {shortMonth}
                </span>
                {/* Tooltip */}
                <div className="pointer-events-none absolute bottom-full mb-2 hidden w-28 rounded-lg bg-charcoal-900 p-2 text-center text-xs text-white shadow-lg group-hover:block dark:bg-charcoal-700">
                  <p className="font-semibold">{d.month}</p>
                  <p>
                    {t('analytics.collected')}: {fmt(d.revenue)}
                  </p>
                  <p>
                    {t('analytics.expected')}: {fmt(d.expected)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Property Table ─────────────────────────────────────────────────────────────

function PropertyTable({ data }: { data: AnalyticsData['property_performance'] }) {
  const { t } = useI18n();
  const [sortKey, setSortKey] = useState<SortKey>('property_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = [...data].sort((a, b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    const cmp =
      typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col)
      return <span className="ml-1 text-charcoal-300 dark:text-white/40">↕</span>;
    return <span className="ml-1 text-saffron-500">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const thCls =
    'min-h-[44px] cursor-pointer select-none px-3 py-3 text-left text-xs font-semibold text-charcoal-500 uppercase tracking-wide hover:text-charcoal-700 dark:text-white/50 dark:hover:text-white/70';

  return (
    <div className="rounded-lg bg-white shadow-sm dark:bg-charcoal-800 dark:shadow-black/20">
      <h3 className="border-b border-warm-200 px-4 py-3 text-sm font-semibold text-charcoal-700 dark:border-white/10 dark:text-white/70">
        {t('analytics.property_performance')}
      </h3>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-warm-200 dark:border-white/10">
            <tr>
              <th className={thCls} onClick={() => toggleSort('property_name')}>
                {t('analytics.property_name')}
                <SortIcon col="property_name" />
              </th>
              <th className={thCls} onClick={() => toggleSort('monthly_rent')}>
                {t('analytics.monthly_rent')}
                <SortIcon col="monthly_rent" />
              </th>
              <th className={thCls} onClick={() => toggleSort('total_collected')}>
                {t('analytics.collected')}
                <SortIcon col="total_collected" />
              </th>
              <th className={thCls} onClick={() => toggleSort('total_overdue')}>
                {t('analytics.overdue')}
                <SortIcon col="total_overdue" />
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-charcoal-500 dark:text-white/50">
                {t('analytics.status')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-50 dark:divide-white/5">
            {sorted.map((row) => (
              <tr key={row.property_id} className="hover:bg-warm-50 dark:hover:bg-white/5">
                <td className="px-3 py-3 text-sm font-medium text-charcoal-900 dark:text-white">
                  {row.property_name}
                </td>
                <td className="px-3 py-3 text-sm text-charcoal-700 dark:text-white/70">
                  {row.monthly_rent > 0 ? fmt(row.monthly_rent) : '—'}
                </td>
                <td className="px-3 py-3 text-sm text-charcoal-700 dark:text-white/70">
                  {fmt(row.total_collected)}
                </td>
                <td
                  className={`px-3 py-3 text-sm font-medium ${
                    row.total_overdue > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-charcoal-500 dark:text-white/50'
                  }`}
                >
                  {row.total_overdue > 0 ? fmt(row.total_overdue) : '—'}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      row.is_occupied
                        ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400'
                        : 'bg-warm-200 text-charcoal-500 dark:bg-white/5 dark:text-white/50'
                    }`}
                  >
                    {row.is_occupied ? t('analytics.occupied') : t('analytics.vacant')}
                  </span>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-sm text-charcoal-400 dark:text-white/40"
                >
                  {t('analytics.no_properties')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-warm-200 md:hidden dark:divide-white/10">
        {sorted.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-charcoal-400 dark:text-white/40">
            {t('analytics.no_properties')}
          </p>
        ) : (
          sorted.map((row) => (
            <div key={row.property_id} className="px-4 py-4">
              <div className="flex items-start justify-between">
                <p className="font-medium text-charcoal-900 dark:text-white">{row.property_name}</p>
                <span
                  className={`ml-2 shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    row.is_occupied
                      ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400'
                      : 'bg-warm-200 text-charcoal-500 dark:bg-white/5 dark:text-white/50'
                  }`}
                >
                  {row.is_occupied ? t('analytics.occupied') : t('analytics.vacant')}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-charcoal-400 dark:text-white/40">
                    {t('analytics.monthly_rent')}
                  </p>
                  <p className="font-medium text-charcoal-700 dark:text-white/70">
                    {row.monthly_rent > 0 ? fmt(row.monthly_rent) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-charcoal-400 dark:text-white/40">
                    {t('analytics.collected')}
                  </p>
                  <p className="font-medium text-charcoal-700 dark:text-white/70">
                    {fmt(row.total_collected)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-charcoal-400 dark:text-white/40">
                    {t('analytics.overdue')}
                  </p>
                  <p
                    className={`font-medium ${
                      row.total_overdue > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-charcoal-500 dark:text-white/50'
                    }`}
                  >
                    {row.total_overdue > 0 ? fmt(row.total_overdue) : '—'}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Main Client ─────────────────────────────────────────────────────────────

interface AnalyticsClientProps {
  initialData: AnalyticsData | null;
  initialBlocked: boolean;
  initialError: string | null;
  isPro: boolean;
}

export function AnalyticsClient({
  initialData,
  initialBlocked,
  initialError,
  isPro,
}: AnalyticsClientProps) {
  const { t } = useI18n();

  const [data, setData] = useState<AnalyticsData | null>(initialData);
  const [blocked, setBlocked] = useState(initialBlocked);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics');
      if (res.status === 403) {
        setBlocked(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError(t('analytics.load_error'));
        setLoading(false);
        return;
      }
      const json = (await res.json()) as AnalyticsData;
      setData(json);
      setBlocked(false);
    } catch {
      setError(t('analytics.load_error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Pro gate
  if (!blocked && !isPro && process.env.NEXT_PUBLIC_DEFER_TIER_ENFORCEMENT !== 'true') {
    return <UpgradePrompt feature={t('analytics.pro_feature_desc')} />;
  }

  if (blocked && process.env.NEXT_PUBLIC_DEFER_TIER_ENFORCEMENT !== 'true') {
    return <UpgradePrompt feature={t('analytics.pro_feature_desc')} />;
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-6 text-xl font-bold text-charcoal-900 dark:text-white">
          {t('analytics.title')}
        </h2>
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-warm-200 dark:bg-charcoal-700"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 text-center shadow-sm dark:bg-charcoal-800 dark:shadow-black/20">
        <p className="text-sm text-red-500">{error ?? t('analytics.load_error')}</p>
        <button
          type="button"
          onClick={load}
          className="mt-4 min-h-[44px] rounded-lg bg-saffron-500 px-4 py-2 text-sm font-medium text-white hover:bg-saffron-600"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  const momBadge =
    data.revenue.mom_change > 0
      ? `+${data.revenue.mom_change}%`
      : data.revenue.mom_change < 0
        ? `${data.revenue.mom_change}%`
        : '0%';
  const momColor =
    data.revenue.mom_change > 0
      ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400'
      : data.revenue.mom_change < 0
        ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
        : 'bg-warm-200 text-charcoal-600 dark:bg-white/5 dark:text-white/60';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-xl font-bold text-charcoal-900 dark:text-white">
        {t('analytics.title')}
      </h2>

      {/* ── Top Stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label={t('analytics.revenue_this_month')}
          value={fmt(data.revenue.this_month)}
          badge={momBadge}
          badgeColor={momColor}
          sub={`${t('analytics.last_month')}: ${fmt(data.revenue.last_month)}`}
        />
        <StatCard
          label={t('analytics.outstanding')}
          value={fmt(data.revenue.total_outstanding)}
          valueColor={
            data.revenue.total_outstanding > 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-charcoal-900 dark:text-white'
          }
        />
        <StatCard
          label={t('analytics.vacancy_rate')}
          value={fmtPct(data.properties.vacancy_rate)}
          sub={`${t('analytics.total_properties')}: ${data.properties.total}`}
        />
        <StatCard
          label={t('analytics.late_payment_rate')}
          value={fmtPct(data.payments.late_payment_rate)}
          sub={`${t('analytics.on_time_rate')}: ${fmtPct(data.payments.on_time_rate)}`}
          valueColor={
            data.payments.late_payment_rate > 20
              ? 'text-red-600 dark:text-red-400'
              : 'text-charcoal-900 dark:text-white'
          }
        />
      </div>

      {/* ── Revenue Trend Chart ── */}
      <BarChart data={data.monthly_trend} />

      {/* ── Property Performance ── */}
      <PropertyTable data={data.property_performance} />
    </div>
  );
}

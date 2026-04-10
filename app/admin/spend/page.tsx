'use client';

import { useEffect, useState } from 'react';

interface DayEntry {
  day: string;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
}

interface TopEndpoint {
  endpoint: string;
  cost_usd: number;
}

interface SpendData {
  total_this_month_usd: number;
  total_last_30_days_usd: number;
  top_endpoints: TopEndpoint[];
  daily_breakdown: DayEntry[];
  budget: {
    limit_usd: number;
    used_usd: number;
    percent_used: number;
    threshold_breached: boolean;
  };
}

function fmt(n: number) {
  return n.toFixed(4);
}

export default function AdminSpendPage() {
  const [data, setData] = useState<SpendData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/spend')
      .then(async (res) => {
        if (res.status === 403) {
          setError('Not authorized');
          return;
        }
        if (!res.ok) {
          setError('Failed to load spend data');
          return;
        }
        const json = await res.json();
        setData(json as SpendData);
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg bg-white p-8 shadow text-center">
          <p className="text-lg font-semibold text-red-600">{error}</p>
          <p className="mt-2 text-sm text-gray-500">
            This page is restricted to authorized admins.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { budget, daily_breakdown, top_endpoints } = data;
  const pct = Math.min(budget.percent_used * 100, 100);
  const barColor = pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-green-500';

  // SVG bar chart
  const chartWidth = 600;
  const chartHeight = 40;
  const maxCost = Math.max(...daily_breakdown.map((d) => d.cost_usd), 0.0001);
  const barCount = daily_breakdown.length;
  const barWidth = barCount > 0 ? Math.floor(chartWidth / barCount) - 1 : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Anthropic Spend Monitor</h1>
          <p className="mt-1 text-sm text-gray-500">Founder-only view — production AI API costs</p>
        </div>

        {/* Big number + progress bar */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">This Month</p>
          <p className="mt-2 text-4xl font-bold text-gray-900">
            ${fmt(budget.used_usd)}{' '}
            <span className="text-xl font-normal text-gray-400">of ${budget.limit_usd}.00</span>
          </p>
          <div className="mt-4 h-3 w-full rounded-full bg-gray-200">
            <div
              className={`h-3 rounded-full transition-all ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">{pct.toFixed(1)}% of monthly cap</p>
          {budget.threshold_breached && (
            <p className="mt-2 text-sm font-medium text-red-600">Warning: 80% threshold breached</p>
          )}
          <p className="mt-4 text-sm text-gray-500">
            Last 30 days total:{' '}
            <span className="font-medium">${fmt(data.total_last_30_days_usd)}</span>
          </p>
        </div>

        {/* 30-day bar chart */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Daily Spend — Last 30 Days
          </h2>
          {daily_breakdown.length === 0 ? (
            <p className="text-sm text-gray-400">No data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <svg
                width={chartWidth}
                height={chartHeight + 20}
                className="block"
                aria-label="Daily spend bar chart"
              >
                {daily_breakdown.map((d, i) => {
                  const barH = Math.max((d.cost_usd / maxCost) * chartHeight, 1);
                  const x = i * (barWidth + 1);
                  const y = chartHeight - barH;
                  return (
                    <g key={d.day}>
                      <rect x={x} y={y} width={barWidth} height={barH} fill="#3b82f6" opacity={0.8}>
                        <title>{`${d.day}: $${fmt(d.cost_usd)}`}</title>
                      </rect>
                    </g>
                  );
                })}
                {/* First and last day labels */}
                {daily_breakdown.length > 0 && (
                  <>
                    <text x={0} y={chartHeight + 16} fontSize={9} fill="#9ca3af">
                      {daily_breakdown[0]!.day.slice(5)}
                    </text>
                    <text
                      x={chartWidth}
                      y={chartHeight + 16}
                      fontSize={9}
                      fill="#9ca3af"
                      textAnchor="end"
                    >
                      {daily_breakdown[daily_breakdown.length - 1]!.day.slice(5)}
                    </text>
                  </>
                )}
              </svg>
            </div>
          )}
        </div>

        {/* Top 5 endpoints */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Top Endpoints by Spend (Last 30 Days)
          </h2>
          {top_endpoints.length === 0 ? (
            <p className="text-sm text-gray-400">No data yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500">
                  <th className="pb-2 font-medium">Endpoint</th>
                  <th className="pb-2 font-medium text-right">Cost (USD)</th>
                </tr>
              </thead>
              <tbody>
                {top_endpoints.map((ep) => (
                  <tr key={ep.endpoint} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs text-gray-700">{ep.endpoint}</td>
                    <td className="py-2 text-right text-gray-900">${fmt(ep.cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

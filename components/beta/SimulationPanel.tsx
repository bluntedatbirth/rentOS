'use client';

/**
 * Beta simulation floating panel.
 *
 * BETA-ONLY: only renders when NEXT_PUBLIC_BETA_SIMULATIONS === 'true'.
 * On launch: unset the env var (the panel vanishes and the API returns 404),
 * or delete components/beta/, lib/beta/, app/api/beta/ for permanent removal.
 */

import { useEffect, useState } from 'react';

type SimulationCategory = 'contract' | 'tenant_action' | 'landlord_action' | 'billing';

type Simulation = {
  id: string;
  category: SimulationCategory;
  label: string;
  description: string;
  allowedRole: 'landlord' | 'tenant' | 'both';
};

type RunResult = { success: true; message: string } | { success: false; message: string };

const BETA_ENABLED = process.env.NEXT_PUBLIC_BETA_SIMULATIONS === 'true';

const CATEGORY_LABELS: Record<SimulationCategory, string> = {
  contract: 'Contracts',
  tenant_action: 'Tenant actions',
  landlord_action: 'Landlord actions',
  billing: 'Billing / tier',
};

export function SimulationPanel({ role }: { role: 'landlord' | 'tenant' }) {
  const [open, setOpen] = useState(false);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ id: string; result: RunResult } | null>(null);
  const [reloading, setReloading] = useState(false);

  // Lazy-load the registry once the panel is opened
  useEffect(() => {
    if (!open || simulations.length > 0) return;
    setLoadingList(true);
    fetch('/api/beta/simulate')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load'))))
      .then((data: { simulations: Simulation[] }) => setSimulations(data.simulations))
      .catch(() => setSimulations([]))
      .finally(() => setLoadingList(false));
  }, [open, simulations.length]);

  if (!BETA_ENABLED) return null;

  const runAction = async (id: string) => {
    setRunningId(id);
    setLastResult(null);
    try {
      const res = await fetch('/api/beta/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: id }),
      });
      const data = (await res.json()) as RunResult;
      setLastResult({ id, result: data });
      // On success, auto-reload the page so client-side useEffect fetches rerun
      // and the user sees the new state (new contract, overdue payment, etc.)
      // without having to hit F5. Brief delay so the success message is visible.
      if (data.success) {
        setReloading(true);
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setLastResult({ id, result: { success: false, message: msg } });
    } finally {
      setRunningId(null);
    }
  };

  // Filter to only simulations allowed for this role
  const visible = simulations.filter((s) => s.allowedRole === 'both' || s.allowedRole === role);

  // Group by category
  const grouped = visible.reduce<Record<SimulationCategory, Simulation[]>>(
    (acc, s) => {
      if (!acc[s.category]) acc[s.category] = [];
      acc[s.category].push(s);
      return acc;
    },
    { contract: [], tenant_action: [], landlord_action: [], billing: [] }
  );

  return (
    <>
      {/* Floating launcher button — left side to avoid the BugReportButton (right) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-600 bg-amber-100 text-amber-900 shadow-lg hover:bg-amber-200 md:bottom-6"
        aria-label="Open beta simulations"
        title="Beta simulations"
      >
        <span className="text-xl" aria-hidden="true">
          {'\u{1F9EA}'}
        </span>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sim-panel-title"
        >
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-xl bg-white shadow-2xl sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-4 py-3">
              <div>
                <h2 id="sim-panel-title" className="text-base font-bold text-amber-900">
                  Beta simulations
                </h2>
                <p className="text-xs text-amber-700">
                  Only affects your own account. Beta-only feature.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-[36px] rounded-lg px-3 py-1 text-sm font-medium text-amber-900 hover:bg-amber-100"
                aria-label="Close"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {loadingList && <p className="py-8 text-center text-sm text-gray-500">Loading...</p>}

              {!loadingList && visible.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-500">
                  No simulations available for this role.
                </p>
              )}

              {!loadingList &&
                (Object.keys(grouped) as SimulationCategory[]).map((cat) => {
                  const items = grouped[cat];
                  if (items.length === 0) return null;
                  return (
                    <section key={cat} className="mb-5">
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                        {CATEGORY_LABELS[cat]}
                      </h3>
                      <div className="space-y-2">
                        {items.map((sim) => {
                          const isRunning = runningId === sim.id;
                          const result = lastResult?.id === sim.id ? lastResult.result : null;
                          return (
                            <div
                              key={sim.id}
                              className="rounded-lg border border-gray-200 bg-white p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900">{sim.label}</p>
                                  <p className="mt-0.5 text-xs text-gray-500">{sim.description}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => runAction(sim.id)}
                                  disabled={isRunning || runningId !== null || reloading}
                                  className="min-h-[36px] shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                                >
                                  {isRunning ? 'Running...' : 'Run'}
                                </button>
                              </div>
                              {result && (
                                <p
                                  className={`mt-2 text-xs ${result.success ? 'text-green-700' : 'text-red-600'}`}
                                >
                                  {result.success ? '[ok] ' : '[fail] '}
                                  {result.message}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
            </div>

            <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 text-center text-[11px] text-gray-500">
              {reloading
                ? 'Reloading page to show updated state...'
                : 'Page auto-reloads after a successful simulation.'}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Static skeleton shown while the dashboard data fetches.
 * Matches the approximate card layout of TenantDashboardClient.
 * Uses animate-pulse via Tailwind — no shimmer libraries.
 */
export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-2xl">
      {/* Greeting placeholder */}
      <div className="mb-1 h-7 w-48 animate-pulse rounded-md bg-warm-200 dark:bg-charcoal-700" />
      <div className="mb-6 h-4 w-64 animate-pulse rounded-md bg-warm-100 dark:bg-charcoal-800" />

      {/* Banner slot placeholder */}
      <div className="mb-4 h-[72px] animate-pulse rounded-lg bg-warm-100 dark:bg-charcoal-800" />

      {/* Contract card placeholder */}
      <div className="mb-4 rounded-lg border border-warm-100 dark:border-white/10 bg-white dark:bg-charcoal-800 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-1.5 h-3 w-24 animate-pulse rounded bg-warm-200 dark:bg-charcoal-700" />
            <div className="h-4 w-36 animate-pulse rounded bg-warm-200 dark:bg-charcoal-700" />
          </div>
          <div className="h-5 w-16 animate-pulse rounded-full bg-warm-200 dark:bg-charcoal-700" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1 h-3 w-20 animate-pulse rounded bg-warm-100 dark:bg-charcoal-800" />
            <div className="h-4 w-32 animate-pulse rounded bg-warm-200 dark:bg-charcoal-700" />
          </div>
          <div>
            <div className="mb-1 h-3 w-20 animate-pulse rounded bg-warm-100 dark:bg-charcoal-800" />
            <div className="h-4 w-24 animate-pulse rounded bg-warm-200 dark:bg-charcoal-700" />
          </div>
        </div>
      </div>

      {/* Payment card placeholder */}
      <div className="mb-6 rounded-lg border border-warm-100 dark:border-white/10 bg-white dark:bg-charcoal-800 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-1.5 h-3 w-28 animate-pulse rounded bg-warm-200 dark:bg-charcoal-700" />
            <div className="h-4 w-24 animate-pulse rounded bg-warm-200 dark:bg-charcoal-700" />
          </div>
          <div className="h-5 w-20 animate-pulse rounded bg-warm-200 dark:bg-charcoal-700" />
        </div>
      </div>

      {/* Quick actions placeholder */}
      <div className="grid grid-cols-2 gap-3">
        <div className="h-11 animate-pulse rounded-lg bg-warm-100 dark:bg-charcoal-800" />
        <div className="h-11 animate-pulse rounded-lg bg-warm-100 dark:bg-charcoal-800" />
      </div>
    </div>
  );
}

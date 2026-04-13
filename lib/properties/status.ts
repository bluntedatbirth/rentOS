export type PropertyStatus = 'active' | 'expiring' | 'vacant' | 'upcoming';

/**
 * Parse an ISO date string (YYYY-MM-DD) into a UTC midnight Date.
 * Supabase DATE columns return strings in this format.
 */
function parseDate(iso: string): Date {
  const parts = iso.split('-').map(Number);
  const year = parts[0]!;
  const month = parts[1]!;
  const day = parts[2]!;
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Returns the number of whole days remaining from today until leaseEnd.
 * Negative if leaseEnd is in the past.
 */
export function getDaysRemaining(leaseEnd: string, today?: Date): number {
  const end = parseDate(leaseEnd);
  const now = today ?? new Date();
  // Normalise today to UTC midnight so we compare day boundaries, not times.
  const todayUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((end.getTime() - todayUtc.getTime()) / msPerDay);
}

/**
 * Compute the display status of a property from its lease dates.
 *
 * Rules (evaluated in order):
 *   1. No leaseStart AND no leaseEnd  → 'vacant'
 *   2. leaseStart is in the future    → 'upcoming'
 *   3. leaseEnd is in the past        → 'vacant'
 *   4. Within last 15% of duration   → 'expiring'
 *   5. Otherwise                      → 'active'
 */
export function computePropertyStatus(
  leaseStart: string | null,
  leaseEnd: string | null,
  today?: Date,
  shortTerm?: boolean
): PropertyStatus {
  // Rule 1 — no dates at all
  if (!leaseStart && !leaseEnd) {
    return 'vacant';
  }

  const now = today ?? new Date();
  const todayUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  // Rule 2 — lease hasn't started yet
  if (leaseStart) {
    const start = parseDate(leaseStart);
    if (start.getTime() > todayUtc.getTime()) {
      return 'upcoming';
    }
  }

  // Rules 3–4 require leaseEnd; treat missing leaseEnd as active
  if (!leaseEnd) {
    return 'active';
  }

  const daysRemaining = getDaysRemaining(leaseEnd, now);

  // Rule 3 — lease has expired
  if (daysRemaining < 0) {
    return 'vacant';
  }

  // Rule 4 — within the expiring threshold
  if (leaseStart) {
    const start = parseDate(leaseStart);
    const end = parseDate(leaseEnd);
    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDays = Math.round((end.getTime() - start.getTime()) / msPerDay);
    const threshold = shortTerm ? 3 : Math.floor(totalDays * 0.15);
    if (daysRemaining <= threshold) {
      return 'expiring';
    }
  }

  return 'active';
}

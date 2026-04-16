// AI usage limits scaled by a landlord's property slot count.
//
// Rule (per PO, 2026-04-16):
//   - A basic 2-slot landlord gets 4 successful OCR parses and 4 successful
//     AI analyses per day.
//   - Limits scale linearly with slots: 2x the slot count.
//   - Only SUCCESSFUL operations count against the limit.
//   - When the limit is hit, tell the user to try again in 24 hours.
//
// Formula: dailyLimit = max(2, slots) * 2
// We floor at 2 slots so even a brand-new account (who may have 0 properties
// on record at the moment of first upload) gets the basic-tier daily budget.

export interface AILimits {
  dailyOcr: number;
  dailyAnalyze: number;
  /** Generous hourly ceiling — day-level is the binding constraint */
  hourlyOcr: number;
  hourlyAnalyze: number;
}

/**
 * Compute a user's daily AI limits given their current property count
 * (NOT slot count — pre-beta, every landlord is effectively unlimited-slot,
 * so we key the budget off actual properties. Once paid slot packs ship,
 * switch this to `purchasedSlots + 2`).
 */
export function getAILimits(propertyCount: number): AILimits {
  const slots = Math.max(2, propertyCount);
  const dailyOcr = slots * 2;
  const dailyAnalyze = slots * 2;
  return {
    dailyOcr,
    dailyAnalyze,
    // Hourly = same as daily — we don't want an extra hourly cap on top
    // of the daily budget. The daily one is what the user is told about.
    hourlyOcr: dailyOcr,
    hourlyAnalyze: dailyAnalyze,
  };
}

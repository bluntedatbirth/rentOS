export type TierCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string; upgradeUrl: string | null };

export const PRO_FEATURES = [
  'contract_generation',
  'contract_qa',
  'contract_comparison',
  'clause_suggestions',
  'contract_analysis',
  'contract_templates',
  'penalty_automation',
  'bulk_actions',
  'notification_rules',
  'analytics',
  'document_vault_full',
  'maintenance_advanced',
] as const;

export type ProFeature = (typeof PRO_FEATURES)[number];

export function requirePro(
  userTier: string,
  feature: string,
  tierExpiresAt?: string | null
): TierCheckResult {
  // During Alpha: always allow (DEFER_TIER_ENFORCEMENT)
  if (
    process.env.DEFER_TIER_ENFORCEMENT === 'true' ||
    process.env.NEXT_PUBLIC_DEFER_TIER_ENFORCEMENT === 'true'
  ) {
    return { allowed: true };
  }
  if (userTier === 'pro') {
    // Check if expired but within 3-day grace period
    if (tierExpiresAt) {
      const expiry = new Date(tierExpiresAt);
      const now = new Date();
      const gracePeriodEnd = new Date(expiry.getTime() + 3 * 24 * 60 * 60 * 1000);
      if (now > gracePeriodEnd) {
        return { allowed: false, reason: feature, upgradeUrl: null };
      }
    }
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: feature,
    upgradeUrl: null,
  };
}

export function getPropertyLimit(tier: string, purchasedSlots: number = 0): number {
  if (
    process.env.DEFER_TIER_ENFORCEMENT === 'true' ||
    process.env.NEXT_PUBLIC_DEFER_TIER_ENFORCEMENT === 'true'
  ) {
    return Infinity;
  }
  // Pro unlocks features, NOT unlimited slots. Slots are always
  // one-time purchases independent of subscription tier.
  return 2 + purchasedSlots;
}

export const SLOT_UNLOCK_PACKS = [
  { packIndex: 0, slots: 1, thb: 149 },
  { packIndex: 1, slots: 5, thb: 599 },
  { packIndex: 2, slots: 10, thb: 999 },
] as const;

export const PRO_MONTHLY_THB = 199;

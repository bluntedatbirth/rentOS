export type TierCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string; upgradeUrl: string };

export const PRO_FEATURES = [
  'unlimited_properties',
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
  if (process.env.DEFER_TIER_ENFORCEMENT === 'true') {
    return { allowed: true };
  }
  if (userTier === 'pro') {
    // Check if expired but within 3-day grace period
    if (tierExpiresAt) {
      const expiry = new Date(tierExpiresAt);
      const now = new Date();
      const gracePeriodEnd = new Date(expiry.getTime() + 3 * 24 * 60 * 60 * 1000);
      if (now > gracePeriodEnd) {
        return { allowed: false, reason: feature, upgradeUrl: '/landlord/billing/upgrade' };
      }
    }
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: feature,
    upgradeUrl: '/landlord/billing/upgrade',
  };
}

export function getPropertyLimit(tier: string): number {
  if (process.env.DEFER_TIER_ENFORCEMENT === 'true') return Infinity;
  return tier === 'pro' ? Infinity : 3;
}

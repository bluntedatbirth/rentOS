type Role = 'tenant' | 'landlord';

interface RouteEntry {
  tenant: ((id?: string) => string) | null;
  landlord: ((id?: string) => string) | null;
  /** When false, resolveRoute returns null regardless of role */
  enabled?: boolean;
}

/**
 * Registry mapping route-key strings to per-role URL resolvers.
 *
 * Rules:
 * - A resolver returning `null` means the role has no valid destination for
 *   that key (e.g. tenants don't have a payments detail page).
 * - `enabled` gates the entire entry on a feature flag. When the flag is off
 *   `resolveRoute` returns `null` so callers can fall back gracefully.
 */
const ROUTE_REGISTRY: Record<string, RouteEntry> = {
  // ── Payments ──────────────────────────────────────────────────────────────
  'payments.list': {
    tenant: () => '/tenant/payments',
    landlord: () => '/landlord/payments',
  },
  'payments.detail': {
    // Tenants have a single payments page with no per-payment detail route.
    tenant: () => '/tenant/payments',
    landlord: (id) => (id ? `/landlord/payments` : '/landlord/payments'),
  },

  // ── Contracts ─────────────────────────────────────────────────────────────
  'contract.view': {
    tenant: () => '/tenant/contract/view',
    landlord: (id) => (id ? `/landlord/contracts/${id}` : '/landlord/contracts'),
  },
  'contract.list': {
    tenant: () => '/tenant/contract/view',
    landlord: () => '/landlord/contracts',
  },

  // ── Properties ────────────────────────────────────────────────────────────
  'properties.detail': {
    // Tenants have no properties section; land them on their dashboard.
    tenant: () => '/tenant/dashboard',
    landlord: (id) => (id ? `/landlord/properties/${id}` : '/landlord/properties'),
  },
  'properties.list': {
    tenant: () => '/tenant/dashboard',
    landlord: () => '/landlord/properties',
  },

  // ── Dashboards ────────────────────────────────────────────────────────────
  dashboard: {
    tenant: () => '/tenant/dashboard',
    landlord: () => '/landlord/properties',
  },
};

/**
 * Resolve a route key to a concrete URL for the given role.
 *
 * @returns The resolved URL string, or `null` when:
 *   - the key is not in the registry
 *   - the entry is feature-gated off (`enabled === false`)
 *   - the role has no resolver for that key (resolver is `null`)
 */
export function resolveRoute(targetRoute: string, role: Role, targetId?: string): string | null {
  const entry = ROUTE_REGISTRY[targetRoute];
  if (!entry) return null;

  // Respect feature flags — treat missing `enabled` as true.
  if (entry.enabled === false) return null;

  const resolver = entry[role];
  if (!resolver) return null;

  return resolver(targetId);
}

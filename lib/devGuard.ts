/**
 * Dev endpoint guard.
 *
 * Requires BOTH of the following to be true for a dev route to respond:
 *   1. NODE_ENV is NOT 'production'
 *   2. DEV_ENDPOINTS_ENABLED=true is set in the environment
 *
 * This prevents dev routes from being accessible in staging or any other
 * non-production environment where NODE_ENV is not explicitly 'production'.
 *
 * To enable dev endpoints locally, set in your .env.local:
 *   DEV_ENDPOINTS_ENABLED=true
 */
export function isDevEndpointAllowed(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.DEV_ENDPOINTS_ENABLED !== 'true') return false;
  return true;
}

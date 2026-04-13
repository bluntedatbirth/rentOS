// Feature flags for the Three Things scope cut + companion-app pivot.
// Server-evaluated: import from server code or pass as props.
// Default policy: flag === false means the surface is hidden via
// notFound() or nav omission.
export const FEATURE_CONTRACT_GENERATE = true;
export const FEATURE_MAINTENANCE = false;
export const FEATURE_CO_TENANTS = false;
export const FEATURE_PAIRING = true; // still on; UI is moved (Team EE)
export const FEATURE_PENALTIES = false; // unused until several builds post-launch (PO 2026-04-11)

// TODO(0-E): /api/dev/seed-user and other seed endpoints were deleted as part of
// the security audit (P0-E). These helpers must be updated to use a migration-only
// seeding path (e.g., a dedicated test migration or Supabase Admin API calls).
// Until then, any test that calls seedTestUsers or callSeedEndpoint will fail.
// See sprint-reports/security-fixes.md for the deferral rationale.

/**
 * @deprecated Replaced by TODO(0-E) — seed endpoint was deleted.
 */
export async function seedTestUsers(_baseURL: string): Promise<void> {
  throw new Error(
    'seedTestUsers: /api/dev/seed-user was deleted (P0-E). Update to use migration-based seeding.'
  );
}

/**
 * @deprecated Replaced by TODO(0-E) — seed endpoints were deleted.
 */
export async function callSeedEndpoint(
  _baseURL: string,
  _endpoint: string,
  _body?: Record<string, unknown>
): Promise<unknown> {
  throw new Error(
    'callSeedEndpoint: dev seed endpoints were deleted (P0-E). Update to use migration-based seeding.'
  );
}

import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { activateContract } from '@/lib/contracts/activate';

/**
 * POST /api/contracts/backfill-payments
 *
 * Admin-guarded (requires landlord session). For each of the caller's active
 * contracts, calls activateContract() which is idempotent: no-ops when payments
 * already exist, and seeds 12 monthly rent rows when they are missing.
 *
 * This lets the beta tester recover contracts that were activated via the old
 * raw-update path (which bypassed payment seeding) without wiping any data.
 *
 * Usage: curl -X POST https://rentos.homes/api/contracts/backfill-payments
 *        (with session cookie, or via Thunder Client)
 *
 * Returns:
 *   { backfilled: string[], alreadySeeded: string[], errors: { id: string, error: string }[] }
 */
export async function POST() {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const adminClient = createServiceRoleClient();

  // Fetch all active contracts belonging to this landlord
  const { data: contracts, error: fetchError } = await adminClient
    .from('contracts')
    .select('id')
    .eq('landlord_id', user.id)
    .eq('status', 'active');

  if (fetchError) {
    return serverError(fetchError.message);
  }

  if (!contracts || contracts.length === 0) {
    return NextResponse.json({
      backfilled: [],
      alreadySeeded: [],
      errors: [],
      message: 'No active contracts found for this landlord.',
    });
  }

  const backfilled: string[] = [];
  const alreadySeeded: string[] = [];
  const errors: { id: string; error: string }[] = [];

  for (const contract of contracts) {
    const result = await activateContract(adminClient, contract.id);
    if (!result.success) {
      errors.push({ id: contract.id, error: result.error ?? 'Unknown error' });
    } else if (result.seededCount > 0) {
      backfilled.push(contract.id);
    } else {
      alreadySeeded.push(contract.id);
    }
  }

  return NextResponse.json({
    backfilled,
    alreadySeeded,
    errors,
    summary: `${backfilled.length} backfilled, ${alreadySeeded.length} already had payments, ${errors.length} errors.`,
  });
}

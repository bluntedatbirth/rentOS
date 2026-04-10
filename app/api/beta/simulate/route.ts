import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { BETA_SIMULATIONS_ENABLED, SIMULATIONS, runSimulation } from '@/lib/beta/simulations';

/**
 * Beta simulation API — founder/tester convenience endpoint.
 *
 * Fails closed on missing env var (returns 404 as if the route didn't exist).
 * This is the single kill switch at runtime — unsetting
 * NEXT_PUBLIC_BETA_SIMULATIONS disables the panel AND makes the API return
 * 404 even if the UI code is still bundled.
 */

export async function GET() {
  if (!BETA_SIMULATIONS_ENABLED) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ simulations: SIMULATIONS });
}

export async function POST(request: Request) {
  if (!BETA_SIMULATIONS_ENABLED) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }
  const { action } = (body ?? {}) as { action?: string };
  if (!action || typeof action !== 'string') {
    return badRequest('Missing "action" field');
  }

  // Resolve role from the profile. Simulations only act on the caller's own rows.
  const admin = createServiceRoleClient();
  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileErr || !profile) return serverError('Profile lookup failed');
  if (profile.role !== 'landlord' && profile.role !== 'tenant') {
    return serverError('Unknown role');
  }

  const result = await runSimulation(action, { userId: user.id, role: profile.role });
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}

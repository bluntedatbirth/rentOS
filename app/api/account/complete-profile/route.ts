import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, badRequest } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { serverError } from '@/lib/apiErrors';

/**
 * POST /api/account/complete-profile
 *
 * Called when an OAuth user (Google, Facebook) has an auth account but no
 * profile row yet. Creates the profile with the role they chose on the
 * signup page.
 */
export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  if (!body || !['landlord', 'tenant'].includes(body.role)) {
    return badRequest('role is required (landlord or tenant)');
  }

  const admin = createServiceRoleClient();

  // Check if profile already exists
  const { data: existing } = await admin.from('profiles').select('id').eq('id', user.id).single();

  if (existing) {
    return NextResponse.json({ ok: true, message: 'Profile already exists' });
  }

  const metadata = user.user_metadata ?? {};
  const fullName =
    typeof body.full_name === 'string' && body.full_name
      ? body.full_name
      : typeof metadata.full_name === 'string'
        ? metadata.full_name
        : typeof metadata.name === 'string'
          ? metadata.name
          : null;

  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  const { error } = await admin.from('profiles').insert({
    id: user.id,
    role: body.role,
    active_mode: body.role,
    full_name: fullName,
    phone: typeof body.phone === 'string' ? body.phone || null : null,
    language: 'th',
    tier: 'pro',
    tier_expires_at: oneYearFromNow.toISOString(),
    founding_member: true,
  });

  if (error) {
    return serverError('[complete-profile] ' + error.message);
  }

  return NextResponse.json({ ok: true });
}

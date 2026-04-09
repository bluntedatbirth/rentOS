import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, notFound } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET() {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const adminClient = createServiceRoleClient();
  const { data: profile, error } = await adminClient
    .from('profiles')
    .select('tier, tier_expires_at, billing_cycle')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    return notFound('Profile not found');
  }

  return NextResponse.json({
    tier: profile.tier ?? 'free',
    tier_expires_at: profile.tier_expires_at ?? null,
    billing_cycle: profile.billing_cycle ?? 'monthly',
  });
}

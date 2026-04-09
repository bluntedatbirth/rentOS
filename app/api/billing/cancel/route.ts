import { getAuthenticatedUser, unauthorized, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST() {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const adminClient = createServiceRoleClient();

  // Alpha: immediate downgrade to free
  // Production: set a cancellation flag and downgrade at period end (tier_expires_at)
  const { error } = await adminClient
    .from('profiles')
    .update({
      tier: 'free',
      billing_cycle: 'monthly',
      tier_expires_at: null,
      omise_schedule_id: null,
    })
    .eq('id', user.id);

  if (error) {
    return serverError(error.message);
  }

  return Response.json({ success: true, tier: 'free' });
}

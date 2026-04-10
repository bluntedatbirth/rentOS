import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rateLimit/persistent';

const sendNotificationSchema = z.object({
  recipient_id: z.string().uuid(),
  title: z.string().max(200),
  body: z.string().max(2000),
});

export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Rate limit: 20/hour, 100/day per landlord
  const rl = await checkRateLimit(user.id, 'notifications-send', 20, 100);
  if (!rl.allowed) {
    console.warn('[rateLimit] notifications-send blocked, reason:', rl.reason, 'user:', user.id);
    return new Response(
      JSON.stringify({ error: 'rate_limit_exceeded', retryAfterSeconds: rl.retryAfterSeconds }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rl.retryAfterSeconds),
        },
      }
    );
  }

  // Verify sender is a landlord
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!senderProfile || senderProfile.role !== 'landlord') {
    return badRequest('Only landlords can send notifications');
  }

  const rawBody: unknown = await request.json();
  const parsed = sendNotificationSchema.safeParse(rawBody);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { recipient_id, title, body: messageBody } = parsed.data;

  // Get landlord's property IDs (user client — RLS scoped to this landlord)
  const { data: properties } = await supabase
    .from('properties')
    .select('id')
    .eq('landlord_id', user.id);

  const propertyIds = (properties ?? []).map((p) => p.id);

  if (propertyIds.length === 0) {
    return badRequest('Recipient is not a tenant linked to one of your properties');
  }

  // Verify the recipient is a tenant linked to one of the sender's contracts (user client)
  const { data: linkedContract } = await supabase
    .from('contracts')
    .select('id')
    .eq('tenant_id', recipient_id)
    .in('property_id', propertyIds)
    .limit(1)
    .single();

  if (!linkedContract) {
    return badRequest('Recipient is not a tenant linked to one of your properties');
  }

  // Insert notification using service-role client (notifications table has no INSERT policy for users)
  const serviceClient = createServiceRoleClient();
  const { error } = await serviceClient.from('notifications').insert({
    recipient_id,
    type: 'maintenance_raised' as const,
    title,
    body: messageBody,
  });

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json({ success: true });
}

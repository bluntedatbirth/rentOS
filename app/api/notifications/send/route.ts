import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';

export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Verify sender is a landlord
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!senderProfile || senderProfile.role !== 'landlord') {
    return badRequest('Only landlords can send notifications');
  }

  const body = await request.json();
  const { recipient_id, title, body: messageBody } = body;

  if (!recipient_id || !title || !messageBody) {
    return badRequest('recipient_id, title, and body are required');
  }

  // Get landlord's property IDs
  const { data: properties } = await supabase
    .from('properties')
    .select('id')
    .eq('landlord_id', user.id);

  const propertyIds = (properties ?? []).map((p) => p.id);

  if (propertyIds.length === 0) {
    return badRequest('Recipient is not a tenant linked to one of your properties');
  }

  // Verify the recipient is a tenant linked to one of the sender's contracts
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

  // Insert notification
  const { error } = await supabase.from('notifications').insert({
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

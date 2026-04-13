import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, notFound, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generatePairCode } from '@/lib/pairing/code';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const adminClient = createServiceRoleClient();

  // Verify the authenticated user owns this property
  const { data: property, error: fetchError } = await adminClient
    .from('properties')
    .select('id, landlord_id')
    .eq('id', params.id)
    .single();

  if (fetchError || !property) {
    return notFound('Property not found');
  }

  if ((property as Record<string, unknown>)['landlord_id'] !== user.id) {
    return notFound('Property not found');
  }

  const newCode = generatePairCode();

  const { error: updateError } = await adminClient
    .from('properties')
    .update({
      pair_code: newCode,
      pair_code_rotated_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq('id', params.id);

  if (updateError) {
    return serverError(updateError.message);
  }

  return NextResponse.json({ pair_code: newCode });
}

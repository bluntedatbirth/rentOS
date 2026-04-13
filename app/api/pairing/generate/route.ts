import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generatePairCode } from '@/lib/pairing/code';

const schema = z.object({
  propertyId: z.string().uuid(),
});

// Return the permanent pair code for a property.
// Codes are generated on first call and never expire.
// To rotate a code explicitly, a separate /rotate endpoint would be used.
export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest('Invalid propertyId');

  const adminClient = createServiceRoleClient();

  // Verify the authenticated user owns this property
  const { data: property, error: fetchError } = await adminClient
    .from('properties')
    .select('id, landlord_id')
    .eq('id', parsed.data.propertyId)
    .single();

  if (fetchError || !property) {
    return badRequest('Property not found');
  }

  const prop = property as Record<string, unknown>;

  if (prop['landlord_id'] !== user.id) {
    return badRequest('Property not found or not owned by you');
  }

  // Return the existing code if one is already set — codes are permanent
  if (prop['pair_code']) {
    return NextResponse.json({
      code: prop['pair_code'] as string,
      propertyId: parsed.data.propertyId,
    });
  }

  // Generate a new code and persist it
  const code = generatePairCode();

  const { error: updateError } = await adminClient
    .from('properties')
    .update({
      pair_code: code,
      pair_code_rotated_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq('id', parsed.data.propertyId);

  if (updateError) {
    return serverError(updateError.message);
  }

  return NextResponse.json({
    code,
    propertyId: parsed.data.propertyId,
  });
}

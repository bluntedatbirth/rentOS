import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { SLOT_UNLOCK_PACKS } from '@/lib/tier';

const checkoutSchema = z.object({
  packIndex: z.union([z.literal(0), z.literal(1), z.literal(2)]),
});

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { packIndex } = parsed.data;
  const pack = SLOT_UNLOCK_PACKS.find((p) => p.packIndex === packIndex);
  if (!pack) {
    return badRequest('Invalid packIndex');
  }

  const adminClient = createServiceRoleClient();

  const { data, error } = await adminClient
    .from('slot_purchases')
    .insert({
      user_id: user.id,
      slots_added: pack.slots,
      amount_thb: pack.thb,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error || !data) {
    return serverError(error?.message ?? 'Failed to create slot purchase');
  }

  return NextResponse.json({
    slotPurchaseId: data.id,
    mockCheckoutUrl: `/api/billing/slots/callback?id=${data.id}`,
  });
}

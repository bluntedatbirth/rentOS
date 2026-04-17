import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { SLOT_UNLOCK_PACKS } from '@/lib/tier';
import { omiseClient } from '@/lib/omise/client';

const purchaseSchema = z.object({
  packIndex: z.number().int().min(0).max(2),
  token: z.string().min(1), // Omise token from client-side Omise.js
});

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const parsed = purchaseSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const pack = SLOT_UNLOCK_PACKS[parsed.data.packIndex];
  if (!pack) return badRequest('Invalid pack');

  const adminClient = createServiceRoleClient();

  // 1. Create a pending purchase record
  const { data: purchase, error: insertError } = await adminClient
    .from('slot_purchases')
    .insert({
      user_id: user.id,
      amount_thb: pack.thb,
      slots_added: pack.slots,
      status: 'pending',
    })
    .select()
    .single();

  if (insertError || !purchase) {
    return serverError('Failed to create purchase record');
  }

  try {
    // 2. Create Omise charge
    const charge = await omiseClient.charges.create({
      amount: pack.thb * 100, // Omise uses satang (1/100 of baht)
      currency: 'thb',
      card: parsed.data.token,
      metadata: {
        purchase_id: purchase.id,
        user_id: user.id,
        pack_index: parsed.data.packIndex,
        slots: pack.slots,
      },
    });

    if (charge.status === 'successful' || charge.paid) {
      // Card payment succeeded immediately
      await adminClient
        .from('slot_purchases')
        .update({
          omise_charge_id: charge.id,
          status: 'completed',
          paid_at: new Date().toISOString(),
        })
        .eq('id', purchase.id);

      // Increment purchased_slots
      await adminClient.rpc('increment_purchased_slots', {
        p_user_id: user.id,
        p_slots: pack.slots,
      });

      return NextResponse.json({
        status: 'completed',
        purchase_id: purchase.id,
        slots_added: pack.slots,
      });
    } else if (charge.status === 'pending') {
      // PromptPay or other async payment — will resolve via webhook
      await adminClient
        .from('slot_purchases')
        .update({
          omise_charge_id: charge.id,
          status: 'pending',
        })
        .eq('id', purchase.id);

      return NextResponse.json({
        status: 'pending',
        purchase_id: purchase.id,
        authorize_uri: charge.authorize_uri || null,
      });
    } else {
      // Failed
      await adminClient
        .from('slot_purchases')
        .update({
          omise_charge_id: charge.id,
          status: 'failed',
        })
        .eq('id', purchase.id);

      return NextResponse.json({ error: 'payment_failed', status: 'failed' }, { status: 402 });
    }
  } catch (err) {
    console.error('[slots/purchase] Omise charge error:', err);
    await adminClient.from('slot_purchases').update({ status: 'failed' }).eq('id', purchase.id);

    return serverError('Payment processing failed');
  }
}

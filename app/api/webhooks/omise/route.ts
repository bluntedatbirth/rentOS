import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  // Omise sends webhook events as JSON
  const event = await request.json();

  // Basic validation — in production you'd verify the webhook signature
  // For test mode, just check the event structure
  if (!event || !event.key || !event.data) {
    return NextResponse.json({ error: 'invalid_event' }, { status: 400 });
  }

  // We only care about charge.complete events
  if (event.key !== 'charge.complete') {
    return NextResponse.json({ received: true });
  }

  const charge = event.data;
  const purchaseId = charge.metadata?.purchase_id;
  const userId = charge.metadata?.user_id;
  const slots = charge.metadata?.slots;

  if (!purchaseId || !userId || !slots) {
    console.error('[webhook/omise] Missing metadata in charge:', charge.id);
    return NextResponse.json({ error: 'missing_metadata' }, { status: 400 });
  }

  const adminClient = createServiceRoleClient();

  if (charge.status === 'successful' || charge.paid) {
    // Idempotency: check if already completed
    const { data: existing } = await adminClient
      .from('slot_purchases')
      .select('status')
      .eq('id', purchaseId)
      .single();

    if (existing?.status === 'completed') {
      // Already processed — idempotent
      return NextResponse.json({ received: true, already_processed: true });
    }

    // Update purchase record
    await adminClient
      .from('slot_purchases')
      .update({
        omise_charge_id: charge.id,
        status: 'completed',
        paid_at: new Date().toISOString(),
      })
      .eq('id', purchaseId);

    // Increment purchased_slots atomically
    const { error: rpcError } = await adminClient.rpc('increment_purchased_slots', {
      p_user_id: userId,
      p_slots: Number(slots),
    });

    if (rpcError) {
      // Fallback: read-then-write (less safe but works)
      console.error('[webhook/omise] RPC failed, using fallback:', rpcError.message);
      const { data: profile } = await adminClient
        .from('profiles')
        .select('purchased_slots')
        .eq('id', userId)
        .single();

      if (profile) {
        await adminClient
          .from('profiles')
          .update({ purchased_slots: (profile.purchased_slots ?? 0) + Number(slots) })
          .eq('id', userId);
      }
    }

    console.info('[webhook/omise] Purchase completed:', { purchaseId, userId, slots });
  } else if (charge.status === 'failed' || charge.status === 'expired') {
    await adminClient
      .from('slot_purchases')
      .update({
        omise_charge_id: charge.id,
        status: 'failed',
      })
      .eq('id', purchaseId);

    console.info('[webhook/omise] Purchase failed:', { purchaseId, userId, status: charge.status });
  }

  return NextResponse.json({ received: true });
}

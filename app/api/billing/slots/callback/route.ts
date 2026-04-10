import { NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  unauthorized,
  badRequest,
  serverError,
  notFound,
} from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendNotification } from '@/lib/notifications/send';

async function handleCallback(request: Request) {
  if (process.env.ALLOW_MOCK_CHECKOUT !== 'true') {
    return NextResponse.json({ error: 'not_available' }, { status: 403 });
  }

  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Support both query params (GET/redirect) and request body (POST)
  let slotPurchaseId: string | null = null;

  const url = new URL(request.url);
  slotPurchaseId = url.searchParams.get('id');

  if (!slotPurchaseId && request.method === 'POST') {
    try {
      const body = (await request.json()) as { slotPurchaseId?: string };
      slotPurchaseId = body.slotPurchaseId ?? null;
    } catch {
      // ignore parse errors — id may have come from query params
    }
  }

  if (!slotPurchaseId) {
    return badRequest('slotPurchaseId is required');
  }

  const adminClient = createServiceRoleClient();

  // Fetch the slot purchase — must belong to the authenticated user and be pending
  const { data: purchase, error: fetchError } = await adminClient
    .from('slot_purchases')
    .select('id, user_id, slots_added, status, omise_charge_id')
    .eq('id', slotPurchaseId)
    .single();

  if (fetchError || !purchase) {
    return notFound();
  }

  if (purchase.user_id !== user.id) {
    return notFound();
  }

  if (purchase.status !== 'pending') {
    return badRequest('Slot purchase is not in pending state');
  }

  // Require a non-null Omise charge ID — a purchase with no charge ID was never
  // initiated through real payment flow and must not be credited.
  if (!purchase.omise_charge_id) {
    return badRequest('invalid_purchase');
  }

  const slotsAdded = purchase.slots_added;

  // Mark the purchase as paid
  const { error: updatePurchaseError } = await adminClient
    .from('slot_purchases')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', slotPurchaseId);

  if (updatePurchaseError) {
    return serverError(updatePurchaseError.message);
  }

  // Fetch current purchased_slots from profile then increment
  const { data: profileData, error: profileFetchError } = await adminClient
    .from('profiles')
    .select('purchased_slots')
    .eq('id', user.id)
    .single();

  if (profileFetchError || !profileData) {
    return serverError(profileFetchError?.message ?? 'Failed to fetch profile');
  }

  const currentSlots = profileData.purchased_slots ?? 0;
  const newPurchasedSlots = currentSlots + slotsAdded;

  const { error: profileUpdateError } = await adminClient
    .from('profiles')
    .update({ purchased_slots: newPurchasedSlots })
    .eq('id', user.id);

  if (profileUpdateError) {
    return serverError(profileUpdateError.message);
  }

  // Send notification (fire-and-forget — non-blocking)
  sendNotification({
    recipientId: user.id,
    type: 'slot_unlock_succeeded',
    titleEn: 'Slots Unlocked!',
    titleTh: 'ปลดล็อกสล็อตสำเร็จ!',
    bodyEn: `${slotsAdded} extra property slot${slotsAdded > 1 ? 's' : ''} have been added to your account.`,
    bodyTh: `เพิ่มสล็อตทรัพย์สิน ${slotsAdded} ช่องในบัญชีของคุณแล้ว`,
    url: '/landlord/billing/slots',
  }).catch((err: unknown) => {
    console.error('[SlotCallback] Notification failed (non-blocking):', err);
  });

  return NextResponse.json({ ok: true, newPurchasedSlots });
}

export async function POST(request: Request) {
  return handleCallback(request);
}

export async function GET(request: Request) {
  return handleCallback(request);
}

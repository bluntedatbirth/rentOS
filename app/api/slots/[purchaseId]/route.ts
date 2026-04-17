import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, notFound } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ purchaseId: string }> }
) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const { purchaseId } = await params;
  const adminClient = createServiceRoleClient();

  const { data: purchase } = await adminClient
    .from('slot_purchases')
    .select('id, status, slots_added, amount_thb, paid_at, created_at')
    .eq('id', purchaseId)
    .eq('user_id', user.id)
    .single();

  if (!purchase) return notFound('Purchase not found');

  return NextResponse.json(purchase);
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requirePro } from '@/lib/tier';

const bulkPaymentSchema = z.object({
  action: z.enum(['mark_paid']),
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Check pro tier
  const adminClient = createServiceRoleClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('tier, role, tier_expires_at')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'landlord') {
    return unauthorized();
  }

  const tierCheck = requirePro(profile.tier, 'bulk_actions', profile.tier_expires_at);
  if (!tierCheck.allowed) {
    return NextResponse.json(tierCheck, { status: 403 });
  }

  const body: unknown = await request.json();
  const parsed = bulkPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { ids } = parsed.data;

  // Verify all payments belong to this landlord via contract ownership
  const { data: payments, error: fetchError } = await adminClient
    .from('payments')
    .select('id, status, contracts!inner(landlord_id)')
    .in('id', ids);

  if (fetchError) {
    return serverError(fetchError.message);
  }

  const ownedIds = (payments ?? [])
    .filter((p) => {
      const contract = p.contracts as unknown as { landlord_id: string };
      return contract.landlord_id === user.id;
    })
    .map((p) => p.id);

  if (ownedIds.length === 0) {
    return badRequest('No matching payments found');
  }

  const { data, error } = await adminClient
    .from('payments')
    .update({
      status: 'paid',
      paid_date: new Date().toISOString().split('T')[0],
    })
    .in('id', ownedIds)
    .select('id, status');

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json({ updated: data?.length ?? 0, ids: data?.map((p) => p.id) ?? [] });
}

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// TODO: DELETE during scale-back cleanup (see SIMPLIFICATION_PROGRESS.md). This route is dead code from the cut feature set.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requirePro } from '@/lib/tier';

const bulkPenaltySchema = z.object({
  action: z.enum(['resolve', 'waive']),
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
  const parsed = bulkPenaltySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { action, ids } = parsed.data;

  // Verify all penalties belong to this landlord via contract ownership
  const { data: penalties, error: fetchError } = await adminClient
    .from('penalties')
    .select('id, status, contracts!inner(landlord_id)')
    .in('id', ids);

  if (fetchError) {
    return serverError(fetchError.message);
  }

  const ownedIds = (penalties ?? [])
    .filter((p) => {
      const contract = p.contracts as unknown as { landlord_id: string };
      return contract.landlord_id === user.id;
    })
    .map((p) => p.id);

  if (ownedIds.length === 0) {
    return badRequest('No matching penalties found');
  }

  const newStatus = action === 'resolve' ? 'resolved' : 'waived';
  const updateData: Record<string, unknown> = {
    status: newStatus,
    resolved_at: new Date().toISOString(),
  };

  const { data, error } = await adminClient
    .from('penalties')
    .update(updateData)
    .in('id', ownedIds)
    .select('id, status');

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json({ updated: data?.length ?? 0, ids: data?.map((p) => p.id) ?? [] });
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from '@/lib/supabase/api';
import { onPenaltyConfirmed } from '@/lib/notifications/events';

const patchSchema = z.object({
  action: z.enum(['confirm', 'waive', 'resolve']),
  confirmed_amount: z.number().min(0).optional(),
  landlord_resolution_note: z.string().min(1).max(2000).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  // Fetch the penalty and verify ownership
  const { data: penalty, error: fetchError } = await supabase
    .from('penalties')
    .select('*, contracts!inner(landlord_id)')
    .eq('id', params.id)
    .single();

  if (fetchError || !penalty) {
    return notFound('Penalty not found');
  }

  const contract = penalty.contracts as unknown as { landlord_id: string };
  if (contract.landlord_id !== user.id) {
    return unauthorized();
  }

  const { action, confirmed_amount, landlord_resolution_note } = parsed.data;

  let updateData: Record<string, unknown> = {};

  switch (action) {
    case 'confirm':
      if (penalty.status !== 'pending_landlord_review') {
        return badRequest('Penalty is not pending landlord review');
      }
      updateData = {
        status: 'confirmed',
        confirmed_amount: confirmed_amount ?? penalty.calculated_amount,
      };
      break;

    case 'waive':
      if (
        penalty.status !== 'pending_landlord_review' &&
        penalty.status !== 'pending_tenant_appeal' &&
        penalty.status !== 'appeal_under_review'
      ) {
        return badRequest('Penalty cannot be waived from current status');
      }
      updateData = {
        status: 'waived',
        resolved_at: new Date().toISOString(),
        landlord_resolution_note: landlord_resolution_note ?? null,
      };
      break;

    case 'resolve':
      if (penalty.status !== 'appeal_under_review' && penalty.status !== 'pending_tenant_appeal') {
        return badRequest('Penalty is not under appeal review');
      }
      if (!landlord_resolution_note) {
        return badRequest('Resolution note is required');
      }
      updateData = {
        status: 'resolved',
        landlord_resolution_note,
        resolved_at: new Date().toISOString(),
        ...(confirmed_amount !== undefined ? { confirmed_amount } : {}),
      };
      break;
  }

  const { data, error } = await supabase
    .from('penalties')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return serverError(error.message);
  }

  // Fire-and-forget: send notification on confirm
  if (action === 'confirm' && data) {
    void onPenaltyConfirmed(params.id, penalty.contract_id);
  }

  return NextResponse.json(data);
}

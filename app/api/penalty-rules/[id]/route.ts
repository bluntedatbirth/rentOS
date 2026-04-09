import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';

const patchSchema = z.object({
  clause_id: z.string().optional(),
  trigger_type: z.enum(['late_payment', 'lease_violation', 'custom']).optional(),
  trigger_days: z.number().int().min(1).optional(),
  penalty_amount: z.number().min(0).optional(),
  penalty_description: z.string().optional().nullable(),
  auto_apply: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const adminClient = createServiceRoleClient();

  // Verify ownership
  const { data: rule, error: fetchError } = await adminClient
    .from('penalty_rules')
    .select('id, landlord_id')
    .eq('id', params.id)
    .single();

  if (fetchError || !rule) {
    return notFound('Penalty rule not found');
  }

  if (rule.landlord_id !== user.id) {
    return unauthorized();
  }

  const body: unknown = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { data, error } = await adminClient
    .from('penalty_rules')
    .update(parsed.data)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const adminClient = createServiceRoleClient();

  // Verify ownership
  const { data: rule, error: fetchError } = await adminClient
    .from('penalty_rules')
    .select('id, landlord_id')
    .eq('id', params.id)
    .single();

  if (fetchError || !rule) {
    return notFound('Penalty rule not found');
  }

  if (rule.landlord_id !== user.id) {
    return unauthorized();
  }

  const { error } = await adminClient.from('penalty_rules').delete().eq('id', params.id);

  if (error) {
    return serverError(error.message);
  }

  return new NextResponse(null, { status: 204 });
}

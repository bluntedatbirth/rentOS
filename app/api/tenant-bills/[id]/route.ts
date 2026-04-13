import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from '@/lib/supabase/api';

const BILL_CATEGORIES = [
  'rent',
  'electric',
  'water',
  'internet',
  'phone',
  'insurance',
  'other',
] as const;

const patchBillSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    amount: z.number().positive().optional(),
    due_day: z.number().int().min(1).max(31).optional(),
    category: z.enum(BILL_CATEGORIES).optional(),
    status: z.enum(['active', 'paused', 'deleted']).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = patchBillSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  // Build update object — only include provided fields
  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.amount !== undefined) updates.amount = parsed.data.amount;
  if (parsed.data.due_day !== undefined) updates.due_day = parsed.data.due_day;
  if (parsed.data.category !== undefined) updates.category = parsed.data.category;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;

  if (Object.keys(updates).length === 0) {
    return badRequest('No fields to update');
  }

  // RLS guarantees tenant_id = auth.uid(), but we also filter explicitly for safety
  const { data, error } = await supabase
    .from('tenant_bills')
    .update(updates)
    .eq('id', params.id)
    .eq('tenant_id', user.id)
    .select()
    .single();

  if (error || !data) {
    if (error?.code === 'PGRST116') return notFound('Bill not found');
    return serverError(error?.message);
  }

  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Verify ownership before soft-delete
  const { data: existing, error: fetchError } = await supabase
    .from('tenant_bills')
    .select('id')
    .eq('id', params.id)
    .eq('tenant_id', user.id)
    .single();

  if (fetchError || !existing) return notFound('Bill not found');

  const { error } = await supabase
    .from('tenant_bills')
    .update({ status: 'deleted' })
    .eq('id', params.id)
    .eq('tenant_id', user.id);

  if (error) return serverError(error.message);

  return NextResponse.json({ success: true });
}

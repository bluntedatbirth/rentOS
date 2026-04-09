import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from '@/lib/supabase/api';

const patchRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  trigger_type: z.enum(['payment_due', 'payment_overdue', 'lease_expiry', 'custom']).optional(),
  days_offset: z.number().int().min(0).max(365).optional(),
  message_template: z.string().min(1).max(2000).optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('notification_rules')
    .select('id, landlord_id')
    .eq('id', params.id)
    .eq('landlord_id', user.id)
    .single();

  if (fetchError || !existing) return notFound('Notification rule not found');

  const body: unknown = await request.json();
  const parsed = patchRuleSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { data, error } = await supabase
    .from('notification_rules')
    .update(parsed.data)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return serverError(error.message);

  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('notification_rules')
    .select('id, landlord_id')
    .eq('id', params.id)
    .eq('landlord_id', user.id)
    .single();

  if (fetchError || !existing) return notFound('Notification rule not found');

  const { error } = await supabase.from('notification_rules').delete().eq('id', params.id);

  if (error) return serverError(error.message);

  return new NextResponse(null, { status: 204 });
}

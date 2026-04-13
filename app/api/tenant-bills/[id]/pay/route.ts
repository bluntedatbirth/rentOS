import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from '@/lib/supabase/api';

const paySchema = z.object({
  undo: z.boolean().optional(),
});

/** Return YYYY-MM-DD for today (UTC) */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Return YYYY-MM-DD for the 1st of the current month (or clamped due_day) */
function currentMonthDueDate(dueDay: number): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(dueDay, lastDay);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json().catch(() => ({}));
  const parsed = paySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const undo = parsed.data.undo ?? false;

  // Verify the bill belongs to this tenant
  const { data: bill, error: billError } = await supabase
    .from('tenant_bills')
    .select('id, due_day, status')
    .eq('id', params.id)
    .eq('tenant_id', user.id)
    .single();

  if (billError || !bill) return notFound('Bill not found');

  if (bill.status === 'deleted') return notFound('Bill not found');

  const dueDate = currentMonthDueDate(bill.due_day);

  // Find or create the payment row for this month
  const { data: existing, error: fetchError } = await supabase
    .from('tenant_bill_payments')
    .select('*')
    .eq('bill_id', params.id)
    .eq('due_date', dueDate)
    .maybeSingle();

  if (fetchError) return serverError(fetchError.message);

  if (undo) {
    // Revert to pending
    if (!existing) {
      // Nothing to undo — create a pending row
      const { data: created, error: createError } = await supabase
        .from('tenant_bill_payments')
        .insert({ bill_id: params.id, due_date: dueDate, status: 'pending' })
        .select()
        .single();
      if (createError) return serverError(createError.message);
      return NextResponse.json(created);
    }

    const { data: updated, error: updateError } = await supabase
      .from('tenant_bill_payments')
      .update({ status: 'pending', paid_date: null })
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) return serverError(updateError.message);
    return NextResponse.json(updated);
  }

  // Mark as paid
  if (!existing) {
    // Create and mark paid in one step
    const { data: created, error: createError } = await supabase
      .from('tenant_bill_payments')
      .insert({ bill_id: params.id, due_date: dueDate, status: 'paid', paid_date: todayIso() })
      .select()
      .single();
    if (createError) return serverError(createError.message);
    return NextResponse.json(created);
  }

  const { data: updated, error: updateError } = await supabase
    .from('tenant_bill_payments')
    .update({ status: 'paid', paid_date: todayIso() })
    .eq('id', existing.id)
    .select()
    .single();

  if (updateError) return serverError(updateError.message);
  return NextResponse.json(updated);
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';

const BILL_CATEGORIES = [
  'rent',
  'electric',
  'water',
  'internet',
  'phone',
  'insurance',
  'other',
] as const;

const createBillSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  amount: z.number().positive('Amount must be greater than 0'),
  due_day: z.number().int().min(1).max(31),
  category: z.enum(BILL_CATEGORIES),
  is_recurring: z.boolean().optional(),
});

/** Return YYYY-MM-DD for the 1st of the current month */
function currentMonthDueDate(dueDay: number): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1; // 1-based
  // Clamp to last day of month for months shorter than due_day
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(dueDay, lastDay);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export async function GET(_request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Fetch active bills
  const { data: bills, error: billsError } = await supabase
    .from('tenant_bills')
    .select('*')
    .eq('tenant_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (billsError) {
    // Gracefully handle missing table (migration not yet applied)
    if (billsError.message.includes('tenant_bills')) return NextResponse.json([]);
    return serverError(billsError.message);
  }
  if (!bills || bills.length === 0) return NextResponse.json([]);

  const billIds = bills.map((b) => b.id);

  // Determine the current-month due_date for each bill
  // We fetch all payment rows for these bills where due_date matches the current month
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const monthPrefix = `${year}-${month}`;

  const { data: existingPayments, error: paymentsError } = await supabase
    .from('tenant_bill_payments')
    .select('*')
    .in('bill_id', billIds)
    .gte('due_date', `${monthPrefix}-01`)
    .lte('due_date', `${monthPrefix}-31`);

  if (paymentsError) return serverError(paymentsError.message);

  const paymentsByBillId = new Map((existingPayments ?? []).map((p) => [p.bill_id, p]));

  // For bills without a payment row this month, auto-create one
  const missingBills = bills.filter((b) => !paymentsByBillId.has(b.id));

  if (missingBills.length > 0) {
    const newRows = missingBills.map((b) => ({
      bill_id: b.id,
      due_date: currentMonthDueDate(b.due_day),
      status: 'pending' as const,
    }));

    const { data: created, error: insertError } = await supabase
      .from('tenant_bill_payments')
      .insert(newRows)
      .select();

    if (insertError) return serverError(insertError.message);

    (created ?? []).forEach((p) => paymentsByBillId.set(p.bill_id, p));
  }

  const result = bills.map((bill) => ({
    ...bill,
    current_payment: paymentsByBillId.get(bill.id) ?? null,
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = createBillSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { name, amount, due_day, category, is_recurring } = parsed.data;

  const { data: bill, error: billError } = await supabase
    .from('tenant_bills')
    .insert({
      tenant_id: user.id,
      name,
      amount,
      due_day,
      category,
      is_recurring: is_recurring ?? true,
    })
    .select()
    .single();

  if (billError) {
    if (billError.message.includes('tenant_bills'))
      return NextResponse.json(
        { error: 'Bills feature not yet available — database migration pending' },
        { status: 503 }
      );
    return serverError(billError.message);
  }

  // Auto-create this month's payment row
  const { data: payment, error: paymentError } = await supabase
    .from('tenant_bill_payments')
    .insert({
      bill_id: bill.id,
      due_date: currentMonthDueDate(due_day),
      status: 'pending',
    })
    .select()
    .single();

  if (paymentError) return serverError(paymentError.message);

  return NextResponse.json({ ...bill, current_payment: payment }, { status: 201 });
}

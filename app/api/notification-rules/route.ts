import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { requirePro } from '@/lib/tier';

const createRuleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  trigger_type: z.enum(['payment_due', 'payment_overdue', 'lease_expiry', 'custom']),
  days_offset: z.number().int().min(0).max(365),
  message_template: z.string().min(1, 'Message template is required').max(2000),
  is_active: z.boolean().default(true),
});

export async function GET() {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const { data, error } = await supabase
    .from('notification_rules')
    .select('*')
    .eq('landlord_id', user.id)
    .order('created_at', { ascending: true });

  if (error) return serverError(error.message);

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Fetch tier for pro check
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier, tier_expires_at')
    .eq('id', user.id)
    .single();

  const tierCheck = requirePro(
    profile?.tier ?? 'free',
    'notification_rules',
    profile?.tier_expires_at ?? null
  );
  if (!tierCheck.allowed) {
    return NextResponse.json(
      { error: tierCheck.reason, upgradeUrl: tierCheck.upgradeUrl },
      { status: 403 }
    );
  }

  const body: unknown = await request.json();
  const parsed = createRuleSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { data, error } = await supabase
    .from('notification_rules')
    .insert({ ...parsed.data, landlord_id: user.id })
    .select()
    .single();

  if (error) return serverError(error.message);

  return NextResponse.json(data, { status: 201 });
}

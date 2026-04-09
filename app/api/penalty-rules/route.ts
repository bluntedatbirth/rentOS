import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requirePro } from '@/lib/tier';

export async function GET(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const contractId = searchParams.get('contract_id');

  if (!contractId) {
    return badRequest('contract_id is required');
  }

  const { data, error } = await supabase
    .from('penalty_rules')
    .select('*')
    .eq('contract_id', contractId)
    .eq('landlord_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json(data);
}

const createRuleSchema = z.object({
  contract_id: z.string().uuid(),
  clause_id: z.string().optional(),
  trigger_type: z.enum(['late_payment', 'lease_violation', 'custom']),
  trigger_days: z.number().int().min(1),
  penalty_amount: z.number().min(0),
  penalty_description: z.string().optional(),
  auto_apply: z.boolean().default(false),
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

  const tierCheck = requirePro(profile.tier, 'penalty_automation', profile.tier_expires_at);
  if (!tierCheck.allowed) {
    return NextResponse.json(tierCheck, { status: 403 });
  }

  const body: unknown = await request.json();
  const parsed = createRuleSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { data, error } = await adminClient
    .from('penalty_rules')
    .insert({
      ...parsed.data,
      landlord_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json(data, { status: 201 });
}

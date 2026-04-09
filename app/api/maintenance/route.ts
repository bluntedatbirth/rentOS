import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { requirePro } from '@/lib/tier';
import { sendNotification } from '@/lib/notifications/send';

const createMaintenanceSchema = z.object({
  contract_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  photo_urls: z.array(z.string().url()).max(3).optional(),
  // Pro-only fields
  assigned_to: z.string().max(200).optional(),
  estimated_cost: z.number().nonnegative().optional(),
  sla_deadline: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const contractId = searchParams.get('contract_id');

  let query = supabase
    .from('maintenance_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { data, error } = await query;

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = createMaintenanceSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  // Get user tier for Pro field gating
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single();

  const userTier = profile?.tier ?? 'free';

  // Gate Pro fields
  const hasProFields =
    parsed.data.assigned_to !== undefined ||
    parsed.data.estimated_cost !== undefined ||
    parsed.data.sla_deadline !== undefined;

  if (hasProFields) {
    const check = requirePro(userTier, 'Maintenance Pro Fields');
    if (!check.allowed) {
      return NextResponse.json(
        { error: 'Pro required', upgradeUrl: check.upgradeUrl },
        { status: 403 }
      );
    }
  }

  const isPro = userTier === 'pro' || process.env.DEFER_TIER_ENFORCEMENT === 'true';

  const { data, error } = await supabase
    .from('maintenance_requests')
    .insert({
      contract_id: parsed.data.contract_id,
      raised_by: user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      photo_urls: parsed.data.photo_urls ?? [],
      ...(isPro && parsed.data.assigned_to !== undefined
        ? { assigned_to: parsed.data.assigned_to }
        : {}),
      ...(isPro && parsed.data.estimated_cost !== undefined
        ? { estimated_cost: parsed.data.estimated_cost }
        : {}),
      ...(isPro && parsed.data.sla_deadline !== undefined
        ? { sla_deadline: parsed.data.sla_deadline }
        : {}),
    })
    .select()
    .single();

  if (error) {
    return serverError(error.message);
  }

  // Notify the landlord about the new maintenance request
  try {
    const { data: contractData } = await supabase
      .from('contracts')
      .select('landlord_id, properties(name)')
      .eq('id', parsed.data.contract_id)
      .single();

    const contract = contractData as unknown as {
      landlord_id: string;
      properties: { name: string } | null;
    } | null;

    if (contract?.landlord_id) {
      const propertyName = contract.properties?.name ?? '';
      await sendNotification({
        recipientId: contract.landlord_id,
        type: 'maintenance_raised',
        titleEn: 'New Maintenance Request',
        titleTh: 'แจ้งซ่อมใหม่',
        bodyEn: `A tenant has submitted a maintenance request${propertyName ? ` for ${propertyName}` : ''}: ${parsed.data.title}`,
        bodyTh: `ผู้เช่าแจ้งซ่อม${propertyName ? ` ${propertyName}` : ''}: ${parsed.data.title}`,
        url: '/landlord/maintenance',
      });
    }
  } catch {
    // Non-critical — request was already created
  }

  return NextResponse.json(data, { status: 201 });
}

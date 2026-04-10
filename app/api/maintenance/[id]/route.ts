import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from '@/lib/supabase/api';
import { onMaintenanceStatusChanged } from '@/lib/notifications/events';
import { requirePro } from '@/lib/tier';

/**
 * GET /api/maintenance/[id]
 *
 * Returns a single maintenance request by ID, including photo_urls.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const { data, error } = await supabase
    .from('maintenance_requests')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !data) {
    return notFound('Maintenance request not found');
  }

  return NextResponse.json(data);
}

const updateMaintenanceSchema = z.object({
  status: z.enum(['in_progress', 'resolved']).optional(),
  // Pro-only fields
  assigned_to: z.string().max(200).nullable().optional(),
  estimated_cost: z.number().nonnegative().nullable().optional(),
  actual_cost: z.number().nonnegative().nullable().optional(),
  sla_deadline: z.string().datetime().nullable().optional(),
  completed_at: z.string().datetime().nullable().optional(),
});

const validTransitions: Record<string, string> = {
  open: 'in_progress',
  in_progress: 'resolved',
};

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = updateMaintenanceSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  // Fetch the maintenance request
  const { data: maintenanceRequest, error: fetchError } = await supabase
    .from('maintenance_requests')
    .select('id, status, contract_id')
    .eq('id', params.id)
    .single();

  if (fetchError || !maintenanceRequest) {
    return notFound('Maintenance request not found');
  }

  // Validate the user is the landlord who owns the contract
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('id, property_id')
    .eq('id', maintenanceRequest.contract_id)
    .single();

  if (contractError || !contract) {
    return notFound('Contract not found');
  }

  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('id, landlord_id')
    .eq('id', contract.property_id)
    .single();

  if (propertyError || !property || property.landlord_id !== user.id) {
    return unauthorized();
  }

  // Get user tier for Pro field gating
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single();

  const userTier = profile?.tier ?? 'free';

  // Check if Pro fields are included
  const hasProFields =
    parsed.data.assigned_to !== undefined ||
    parsed.data.estimated_cost !== undefined ||
    parsed.data.actual_cost !== undefined ||
    parsed.data.sla_deadline !== undefined ||
    parsed.data.completed_at !== undefined;

  if (hasProFields) {
    const check = requirePro(userTier, 'Maintenance Pro Fields');
    if (!check.allowed) {
      return NextResponse.json(
        { error: 'Pro required', upgradeUrl: check.upgradeUrl },
        { status: 403 }
      );
    }
  }

  // Validate status transition if status is being changed
  let newStatus: string | undefined;
  if (parsed.data.status !== undefined) {
    newStatus = parsed.data.status;
    const currentStatus = maintenanceRequest.status;
    if (validTransitions[currentStatus] !== newStatus) {
      return badRequest(`Invalid status transition from '${currentStatus}' to '${newStatus}'`);
    }
  }

  const isPro = userTier === 'pro' || process.env.DEFER_TIER_ENFORCEMENT === 'true';
  const autoCompletedAt =
    newStatus === 'resolved' && parsed.data.completed_at === undefined
      ? new Date().toISOString()
      : undefined;

  const { data, error } = await supabase
    .from('maintenance_requests')
    .update({
      ...(newStatus !== undefined
        ? { status: newStatus as 'open' | 'in_progress' | 'resolved' }
        : {}),
      ...(autoCompletedAt !== undefined ? { completed_at: autoCompletedAt } : {}),
      ...(isPro && parsed.data.assigned_to !== undefined
        ? { assigned_to: parsed.data.assigned_to }
        : {}),
      ...(isPro && parsed.data.estimated_cost !== undefined
        ? { estimated_cost: parsed.data.estimated_cost }
        : {}),
      ...(isPro && parsed.data.actual_cost !== undefined
        ? { actual_cost: parsed.data.actual_cost }
        : {}),
      ...(isPro && parsed.data.sla_deadline !== undefined
        ? { sla_deadline: parsed.data.sla_deadline }
        : {}),
      ...(isPro && parsed.data.completed_at !== undefined
        ? { completed_at: parsed.data.completed_at }
        : {}),
    })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return serverError(error.message);
  }

  // Fire-and-forget: notify tenant of status change
  if (data && parsed.data.status) {
    void onMaintenanceStatusChanged(
      params.id,
      maintenanceRequest.contract_id,
      parsed.data.status,
      maintenanceRequest.status
    );
  }

  return NextResponse.json(data);
}

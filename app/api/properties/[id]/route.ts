import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from '@/lib/supabase/api';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', params.id)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return notFound('Property not found');
  }

  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Verify property exists and is owned by this user
  const { data: property, error: fetchError } = await supabase
    .from('properties')
    .select('id, landlord_id')
    .eq('id', params.id)
    .eq('is_active', true)
    .single();

  if (fetchError || !property) {
    return notFound('Property not found');
  }

  if ((property as { landlord_id: string }).landlord_id !== user.id) {
    return notFound('Property not found');
  }

  // Block deletion if there is an active contract
  const { count: activeCount } = await supabase
    .from('contracts')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', params.id)
    .eq('status', 'active');

  if ((activeCount ?? 0) > 0) {
    return NextResponse.json(
      {
        error: 'active_contract',
        message: 'Property has an active contract. End it before removing the property.',
      },
      { status: 409 }
    );
  }

  // Delete non-active contracts first (FK is RESTRICT with no cascade)
  await supabase.from('contracts').delete().eq('property_id', params.id).neq('status', 'active');

  // Hard delete the property row
  const { error: deleteError } = await supabase
    .from('properties')
    .delete()
    .eq('id', params.id)
    .eq('landlord_id', user.id);

  if (deleteError) {
    return NextResponse.json(
      { error: 'delete_failed', message: deleteError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

const patchPropertySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    address: z.string().max(500).optional(),
    unit_number: z.string().max(50).optional(),
    lease_start: isoDate.optional(),
    lease_end: isoDate.optional(),
    monthly_rent: z.number().positive().optional(),
  })
  .refine((d) => !(d.lease_start && d.lease_end) || d.lease_end > d.lease_start, {
    message: 'lease_end must be after lease_start',
    path: ['lease_end'],
  });

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = patchPropertySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  // Build the update object — only include fields that were explicitly provided
  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.address !== undefined) updates.address = parsed.data.address;
  if (parsed.data.unit_number !== undefined) updates.unit_number = parsed.data.unit_number;
  if (parsed.data.lease_start !== undefined) updates.lease_start = parsed.data.lease_start;
  if (parsed.data.lease_end !== undefined) updates.lease_end = parsed.data.lease_end;
  if (parsed.data.monthly_rent !== undefined) updates.monthly_rent = parsed.data.monthly_rent;

  if (Object.keys(updates).length === 0) {
    return badRequest('No fields to update');
  }

  // RLS policy ensures only the owning landlord can update their property.
  // The .eq('landlord_id', user.id) guard below is an explicit belt-and-braces check.
  const { data, error } = await supabase
    .from('properties')
    .update(updates)
    .eq('id', params.id)
    .eq('landlord_id', user.id)
    .select()
    .single();

  if (error || !data) {
    if (error?.code === 'PGRST116') {
      return notFound('Property not found');
    }
    return serverError(error?.message);
  }

  return NextResponse.json(data);
}

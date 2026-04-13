import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from '@/lib/supabase/api';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

const createShellPropertySchema = z
  .object({
    name: z.string().min(1).max(200),
    address: z.string().max(500).optional(),
    unit_number: z.string().max(50).optional(),
    lease_start: isoDate.optional(),
    lease_end: isoDate.optional(),
    monthly_rent: z.number().positive().optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((d) => !(d.lease_start && d.lease_end) || d.lease_end > d.lease_start, {
    message: 'lease_end must be after lease_start',
    path: ['lease_end'],
  });

const deleteShellPropertySchema = z.object({
  propertyId: z.string().uuid(),
});

export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = createShellPropertySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { data, error } = await supabase
    .from('properties')
    .insert({
      name: parsed.data.name,
      address: parsed.data.address ?? null,
      unit_number: parsed.data.unit_number ?? null,
      lease_start: parsed.data.lease_start ?? null,
      lease_end: parsed.data.lease_end ?? null,
      monthly_rent: parsed.data.monthly_rent ?? null,
      notes: parsed.data.notes ?? null,
      is_shell: true,
      created_by_tenant_id: user.id,
      landlord_id: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new columns not yet in generated types
    } as any)
    .select()
    .single();

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Accept propertyId from the request body or query string
  let propertyId: string | undefined;
  const url = new URL(request.url);
  const queryId = url.searchParams.get('propertyId');

  if (queryId) {
    propertyId = queryId;
  } else {
    try {
      const body: unknown = await request.json();
      const parsed = deleteShellPropertySchema.safeParse(body);
      if (!parsed.success) {
        return badRequest('propertyId is required and must be a valid UUID');
      }
      propertyId = parsed.data.propertyId;
    } catch {
      return badRequest('propertyId is required');
    }
  }

  // Validate UUID format when it came from the query string
  const uuidResult = deleteShellPropertySchema.safeParse({ propertyId });
  if (!uuidResult.success) {
    return badRequest('propertyId must be a valid UUID');
  }

  // Only allow deleting shell properties owned by the caller
  const { data: property, error: fetchError } = await (
    supabase
      .from('properties')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new columns not yet in generated types
      .select('id, is_shell, created_by_tenant_id') as any
  )
    .eq('id', propertyId)
    .single();

  if (fetchError || !property) {
    return notFound('Property not found');
  }

  const prop = property as Record<string, unknown>;

  if (!prop['is_shell']) {
    return badRequest('Only shell properties can be deleted via this endpoint');
  }

  if (prop['created_by_tenant_id'] !== user.id) {
    return notFound('Property not found');
  }

  // is_shell and created_by_tenant_id ownership already verified above;
  // the double-guard on created_by_tenant_id here is belt-and-braces.
  const { error: deleteError } = await supabase
    .from('properties')
    .delete()
    .eq('id', propertyId)
    .eq('created_by_tenant_id' as never, user.id);

  if (deleteError) {
    return serverError(deleteError.message);
  }

  return NextResponse.json({ success: true });
}

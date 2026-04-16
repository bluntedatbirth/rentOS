import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getPropertyLimit } from '@/lib/tier';
import { generatePairCode } from '@/lib/pairing/code';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

const createPropertySchema = z
  .object({
    name: z.string().min(1).max(200),
    address: z.string().max(500).optional(),
    unit_number: z.string().max(50).optional(),
    lease_start: isoDate.optional(),
    lease_end: isoDate.optional(),
    monthly_rent: z.number().positive().optional(),
    daily_rate: z.number().positive().optional(),
  })
  .refine((d) => !(d.lease_start && d.lease_end) || d.lease_end > d.lease_start, {
    message: 'lease_end must be after lease_start',
    path: ['lease_end'],
  });

export async function GET() {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const { data, error } = await supabase
    .from('properties')
    .select('id, name, address, unit_number, created_at')
    .eq('landlord_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = createPropertySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  // Check property limit based on user tier
  const adminClient = createServiceRoleClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('tier, purchased_slots')
    .eq('id', user.id)
    .single();

  const userTier = profile?.tier ?? 'free';
  const purchasedSlots = profile?.purchased_slots ?? 0;
  const limit = getPropertyLimit(userTier, purchasedSlots);

  if (isFinite(limit)) {
    const { count } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('landlord_id', user.id)
      .eq('is_active', true);

    if ((count ?? 0) >= limit) {
      return NextResponse.json(
        {
          error: 'property_limit_reached',
          limit,
          purchased_slots: purchasedSlots,
        },
        { status: 403 }
      );
    }
  }

  const { data, error } = await supabase
    .from('properties')
    .insert({
      landlord_id: user.id,
      name: parsed.data.name,
      address: parsed.data.address ?? null,
      unit_number: parsed.data.unit_number ?? null,
      lease_start: parsed.data.lease_start ?? null,
      lease_end: parsed.data.lease_end ?? null,
      monthly_rent: parsed.data.monthly_rent ?? null,
      daily_rate: parsed.data.daily_rate ?? null,
      pair_code: generatePairCode(),
      pair_code_rotated_at: new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new columns not yet in generated types
    } as any)
    .select()
    .single();

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json(data, { status: 201 });
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest } from '@/lib/supabase/api';

const createPropertySchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(500).optional(),
  unit_number: z.string().max(50).optional(),
});

export async function GET() {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('landlord_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

  const { data, error } = await supabase
    .from('properties')
    .insert({
      landlord_id: user.id,
      name: parsed.data.name,
      address: parsed.data.address ?? null,
      unit_number: parsed.data.unit_number ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

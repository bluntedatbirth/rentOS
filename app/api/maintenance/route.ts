import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest } from '@/lib/supabase/api';

const createMaintenanceSchema = z.object({
  contract_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  photo_urls: z.array(z.string().url()).optional(),
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
    return NextResponse.json({ error: error.message }, { status: 500 });
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

  const { data, error } = await supabase
    .from('maintenance_requests')
    .insert({
      contract_id: parsed.data.contract_id,
      raised_by: user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      photo_urls: parsed.data.photo_urls ?? [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized } from '@/lib/supabase/api';

export async function GET(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const contractId = searchParams.get('contract_id');

  let query = supabase.from('penalties').select('*').order('created_at', { ascending: false });

  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

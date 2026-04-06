import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, notFound } from '@/lib/supabase/api';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // RLS ensures only landlord or tenant of this contract can see it
  const { data, error } = await supabase
    .from('contracts')
    .select('*, properties(name, address, unit_number)')
    .eq('id', params.id)
    .single();

  if (error || !data) {
    return notFound('Contract not found');
  }

  return NextResponse.json(data);
}

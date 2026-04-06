import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, notFound } from '@/lib/supabase/api';

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

  // Soft delete: set is_active = false
  const { data, error } = await supabase
    .from('properties')
    .update({ is_active: false })
    .eq('id', params.id)
    .eq('landlord_id', user.id)
    .select()
    .single();

  if (error || !data) {
    return notFound('Property not found or not owned by you');
  }

  return NextResponse.json({ message: 'Property deactivated', property: data });
}

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

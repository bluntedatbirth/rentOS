import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, notFound, badRequest } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';

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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body = await request.json();
  if (body?.status !== 'terminated') {
    return badRequest('Only status=terminated is supported');
  }

  const admin = createServiceRoleClient();

  const { data: contract, error: fetchError } = await admin
    .from('contracts')
    .select('id, landlord_id, status, property_id')
    .eq('id', params.id)
    .single();

  if (fetchError || !contract) return notFound('Contract not found');
  if (contract.landlord_id !== user.id) return unauthorized();
  if (contract.status !== 'active' && contract.status !== 'scheduled') {
    return badRequest('Only active or scheduled contracts can be terminated');
  }

  // Set contract to terminated
  const { error: updateError } = await admin
    .from('contracts')
    .update({ status: 'terminated' })
    .eq('id', params.id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to terminate contract' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const admin = createServiceRoleClient();

  // Fetch the contract and verify ownership
  const { data: contract, error: fetchError } = await admin
    .from('contracts')
    .select('id, landlord_id, tenant_id, property_id, original_file_url, status')
    .eq('id', params.id)
    .single();

  if (fetchError || !contract) {
    return notFound('Contract not found');
  }

  if (contract.landlord_id !== user.id) {
    return unauthorized();
  }

  // Block deletion of active/scheduled contracts — must terminate first
  if (contract.status === 'active' || contract.status === 'scheduled') {
    return badRequest('Terminate the contract before deleting it');
  }

  // Delete related records first (payments, penalties)
  await admin.from('payments').delete().eq('contract_id', contract.id);
  await admin.from('penalties').delete().eq('contract_id', contract.id);

  // Delete the contract
  const { error: deleteError } = await admin.from('contracts').delete().eq('id', contract.id);

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete contract' }, { status: 500 });
  }

  // Check if the property has any remaining contracts (only for landlord-linked properties)
  if (contract.property_id) {
    const { count } = await admin
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', contract.property_id);

    // If no contracts left and property is a placeholder, delete it too
    if (count === 0) {
      const { data: prop } = await admin
        .from('properties')
        .select('name')
        .eq('id', contract.property_id)
        .single();

      if (prop?.name === 'Detecting from contract...') {
        await admin.from('properties').delete().eq('id', contract.property_id);
      }
    }
  }

  return NextResponse.json({ success: true });
}

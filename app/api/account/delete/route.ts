import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Contract statuses that count as "not yet active" for the purpose of account deletion.
// Active contracts block deletion; these are rescinded or unlinked on delete.
type ContractStatus = 'pending' | 'active' | 'awaiting_signature' | 'expired' | 'terminated';
const PENDING_STATUSES: ContractStatus[] = ['pending', 'awaiting_signature'];

type DeletePrecheck = {
  role: 'landlord' | 'tenant';
  active_contracts: number;
  pending_contracts: number;
  can_delete: boolean;
};

async function runPrecheck(userId: string): Promise<DeletePrecheck | { error: string }> {
  const admin = createServiceRoleClient();

  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profileErr || !profile) return { error: 'Profile not found' };
  if (profile.role !== 'landlord' && profile.role !== 'tenant') {
    return { error: 'Unknown role' };
  }

  const roleColumn = profile.role === 'landlord' ? 'landlord_id' : 'tenant_id';

  const { count: activeCount } = await admin
    .from('contracts')
    .select('id', { count: 'exact', head: true })
    .eq(roleColumn, userId)
    .eq('status', 'active');

  const { count: pendingCount } = await admin
    .from('contracts')
    .select('id', { count: 'exact', head: true })
    .eq(roleColumn, userId)
    .in('status', PENDING_STATUSES);

  return {
    role: profile.role,
    active_contracts: activeCount ?? 0,
    pending_contracts: pendingCount ?? 0,
    can_delete: (activeCount ?? 0) === 0,
  };
}

// GET /api/account/delete — pre-check: can this user delete their account?
export async function GET() {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const result = await runPrecheck(user.id);
  if ('error' in result) return serverError(result.error);
  return NextResponse.json(result);
}

// POST /api/account/delete — perform account deletion with contract-aware side effects
export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const { confirmation } = body as { confirmation?: string };
  if (confirmation !== 'DELETE') {
    return badRequest('Confirmation text must be "DELETE"');
  }

  const precheck = await runPrecheck(user.id);
  if ('error' in precheck) return serverError(precheck.error);

  // Block deletion while any active contracts still exist — these must be ended manually first
  if (!precheck.can_delete) {
    return NextResponse.json(
      {
        error: 'active_contracts',
        active_contracts: precheck.active_contracts,
        message:
          precheck.role === 'landlord'
            ? 'You have active contracts. End them before deleting your account.'
            : 'You are currently renting. End your active lease before deleting your account.',
      },
      { status: 409 }
    );
  }

  const admin = createServiceRoleClient();
  const _roleColumn = precheck.role === 'landlord' ? 'landlord_id' : 'tenant_id';

  // Handle pending contracts
  if (precheck.pending_contracts > 0) {
    if (precheck.role === 'landlord') {
      // Landlord deletion rescinds (terminates) all pending contracts they created
      const { error: terminateErr } = await admin
        .from('contracts')
        .update({ status: 'terminated' })
        .eq('landlord_id', user.id)
        .in('status', PENDING_STATUSES);
      if (terminateErr) {
        return serverError('Failed to rescind pending contracts: ' + terminateErr.message);
      }
    } else {
      // Tenant deletion unlinks them from any pending contracts so the landlord can re-pair
      const { error: unlinkErr } = await admin
        .from('contracts')
        .update({ tenant_id: null })
        .eq('tenant_id', user.id)
        .in('status', PENDING_STATUSES);
      if (unlinkErr) {
        return serverError('Failed to unlink pending contracts: ' + unlinkErr.message);
      }
    }
  }

  // Soft-delete: clear personal data from profile
  const { error: profileErr } = await admin
    .from('profiles')
    .update({ full_name: '[Deleted]', phone: null })
    .eq('id', user.id);

  if (profileErr) return serverError(profileErr.message);

  // Sign the user out
  await supabase.auth.signOut();

  return NextResponse.json({
    success: true,
    rescinded_contracts: precheck.role === 'landlord' ? precheck.pending_contracts : 0,
    unlinked_contracts: precheck.role === 'tenant' ? precheck.pending_contracts : 0,
  });
}

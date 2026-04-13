import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/supabase/server-session';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * /landlord/payments is no longer a standalone page.
 * Payments are scoped to each property via the Payments tab on the
 * property detail page.
 *
 * Priority order for redirect target:
 * 1. First property that has an active contract with an unpaid/overdue payment.
 * 2. First property that has any active contract.
 * 3. /landlord/properties (properties list).
 */
export default async function LandlordPaymentsPage() {
  const { user } = await getServerSession();

  if (!user) {
    redirect('/login');
  }

  const supabase = createServerSupabaseClient();

  // Step 1: fetch all active contracts for this landlord
  const { data: activeContracts } = await supabase
    .from('contracts')
    .select('id, property_id')
    .eq('landlord_id', user.id)
    .eq('status', 'active');

  const contracts = (activeContracts ?? []) as Array<{
    id: string;
    property_id: string;
  }>;

  if (contracts.length === 0) {
    redirect('/landlord/properties');
  }

  const contractIds = contracts.map((c) => c.id);

  // Step 2: find a pending/overdue payment among those contracts
  const { data: duePayments } = await supabase
    .from('payments')
    .select('contract_id')
    .in('contract_id', contractIds)
    .in('status', ['pending', 'overdue'])
    .limit(1);

  const firstDue = (duePayments ?? [])[0] as { contract_id: string } | undefined;

  if (firstDue) {
    const match = contracts.find((c) => c.id === firstDue.contract_id);
    if (match?.property_id) {
      redirect(`/landlord/properties/${match.property_id}?tab=payments`);
    }
  }

  // Step 3: fall back to first property with any active contract
  const fallback = contracts[0];
  if (fallback?.property_id) {
    redirect(`/landlord/properties/${fallback.property_id}?tab=payments`);
  }

  redirect('/landlord/properties');
}

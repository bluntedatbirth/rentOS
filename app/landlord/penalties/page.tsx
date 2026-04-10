import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getServerSession } from '@/lib/supabase/server-session';
import { redirect } from 'next/navigation';
import { PenaltiesClient } from './PenaltiesClient';

interface Penalty {
  id: string;
  contract_id: string;
  clause_id: string;
  description_th: string | null;
  description_en: string | null;
  calculated_amount: number | null;
  confirmed_amount: number | null;
  status: string;
  tenant_appeal_note: string | null;
  landlord_resolution_note: string | null;
  created_at: string;
}

interface StructuredClause {
  clause_id: string;
  penalty_defined: boolean;
  penalty_amount?: number;
  penalty_description?: string;
  thai_text?: string;
  english_text?: string;
  title_th?: string;
  title_en?: string;
  text_th?: string;
  text_en?: string;
}

interface Contract {
  id: string;
  property_id: string;
  structured_clauses: StructuredClause[] | null;
  properties?: { name: string } | null;
  monthly_rent?: number | null;
  lease_start?: string | null;
  lease_end?: string | null;
}

const STATUS_ORDER: Record<string, number> = {
  pending_landlord_review: 0,
  appeal_under_review: 1,
  pending_tenant_appeal: 2,
  confirmed: 3,
  resolved: 4,
  waived: 5,
};

export default async function LandlordPenaltiesPage() {
  const { user } = await getServerSession();

  if (!user) {
    redirect('/login');
  }

  const supabase = createServerSupabaseClient();

  const { data: contractsData } = await supabase
    .from('contracts')
    .select(
      'id, property_id, structured_clauses, monthly_rent, lease_start, lease_end, properties(name)'
    )
    .eq('landlord_id', user.id);

  const contractsList = (contractsData ?? []) as unknown as Contract[];

  let penalties: Penalty[] = [];
  if (contractsList.length > 0) {
    const contractIds = contractsList.map((c) => c.id);
    const { data: penaltiesData } = await supabase
      .from('penalties')
      .select(
        'id, contract_id, clause_id, description_th, description_en, calculated_amount, confirmed_amount, status, tenant_appeal_note, landlord_resolution_note, created_at'
      )
      .in('contract_id', contractIds)
      .order('created_at', { ascending: false });

    penalties = ((penaltiesData ?? []) as Penalty[]).sort((a, b) => {
      const orderA = STATUS_ORDER[a.status] ?? 99;
      const orderB = STATUS_ORDER[b.status] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  return <PenaltiesClient initialPenalties={penalties} initialContracts={contractsList} />;
}

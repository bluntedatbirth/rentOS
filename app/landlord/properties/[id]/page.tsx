import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getServerSession } from '@/lib/supabase/server-session';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { PropertyDetailClient } from './PropertyDetailClient';

interface PropertyDetail {
  id: string;
  name: string;
  address: string | null;
  unit_number: string | null;
  created_at: string;
  cover_image_url: string | null;
  // Lease / rent fields (type-asserted — not in generated types yet)
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  current_tenant_id: string | null;
  pair_code: string | null;
  pair_code_rotated_at: string | null;
  previous_tenant_count: number;
}

interface LinkedContract {
  id: string;
  status: string;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  tenant_id: string | null;
  created_at: string;
}

interface PaymentRecord {
  id: string;
  contract_id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  payment_type: 'rent' | 'utility' | 'deposit' | 'penalty';
  status: 'pending' | 'paid' | 'overdue';
  promptpay_ref: string | null;
  notes: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  claimed_note: string | null;
}

interface TenantProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
}

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const { user } = await getServerSession();

  if (!user) {
    redirect('/login');
  }

  const { id } = params;
  const supabase = createServerSupabaseClient();

  const [propRes, contractsRes] = await Promise.all([
    supabase
      .from('properties')
      .select(
        'id, name, address, unit_number, created_at, cover_image_url, lease_start, lease_end, monthly_rent, current_tenant_id, pair_code, pair_code_rotated_at, previous_tenant_count'
      )
      .eq('id', id)
      .eq('landlord_id', user.id)
      .eq('is_active', true)
      .single(),
    supabase
      .from('contracts')
      .select('id, status, lease_start, lease_end, monthly_rent, tenant_id, created_at')
      .eq('property_id', id)
      .order('created_at', { ascending: false }),
  ]);

  if (!propRes.data) {
    notFound();
  }

  const property = propRes.data as unknown as PropertyDetail;
  const contractList = (contractsRes.data ?? []) as LinkedContract[];

  // Fetch tenant profiles and payments in parallel
  const contractIds = contractList.map((c) => c.id);
  const tenantIds = Array.from(
    new Set(contractList.map((c) => c.tenant_id).filter(Boolean))
  ) as string[];

  // Also include current_tenant_id so we can display the paired tenant name
  if (property.current_tenant_id && !tenantIds.includes(property.current_tenant_id)) {
    tenantIds.push(property.current_tenant_id);
  }

  const [tenantsRes, paymentsRes] = await Promise.all([
    tenantIds.length > 0
      ? supabase.from('profiles').select('id, full_name, phone').in('id', tenantIds)
      : Promise.resolve({ data: [] }),
    contractIds.length > 0
      ? supabase
          .from('payments')
          .select(
            'id, contract_id, amount, due_date, paid_date, payment_type, status, promptpay_ref, notes, claimed_by, claimed_at, claimed_note'
          )
          .in('contract_id', contractIds)
          .order('due_date', { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const payments = (paymentsRes.data ?? []) as unknown as PaymentRecord[];

  const tenantMap: Record<string, TenantProfile> = {};
  ((tenantsRes.data ?? []) as unknown as TenantProfile[]).forEach((tp) => {
    tenantMap[tp.id] = tp;
  });

  return (
    <PropertyDetailClient
      property={property}
      initialContracts={contractList}
      initialTenants={tenantMap}
      initialPayments={payments}
    />
  );
}

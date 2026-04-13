import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export interface ActivateResult {
  success: boolean;
  seededCount: number;
  error?: string;
}

/**
 * Shared helper: activates a contract and seeds 12 monthly payment rows.
 * Enforces all invariants before transitioning.
 * Idempotent: won't duplicate payment rows if already seeded.
 */
export async function activateContract(
  supabase: SupabaseClient<Database>,
  contractId: string
): Promise<ActivateResult> {
  // 1. Fetch the contract
  const { data: contractRaw, error: fetchError } = await supabase
    .from('contracts')
    .select(
      'id, tenant_id, property_id, landlord_id, status, structured_clauses, lease_start, lease_end, monthly_rent, renewed_from, due_day'
    )
    .eq('id', contractId)
    .single();

  if (fetchError || !contractRaw) {
    return {
      success: false,
      seededCount: 0,
      error: `Contract not found: ${fetchError?.message ?? 'unknown'}`,
    };
  }

  const contract = contractRaw as unknown as {
    id: string;
    tenant_id: string | null;
    property_id: string;
    landlord_id: string;
    status: string;
    structured_clauses: unknown[] | null;
    lease_start: string | null;
    lease_end: string | null;
    monthly_rent: number | null;
    renewed_from: string | null;
    due_day: number | null;
  };

  // 2. Verify invariants
  const hasClauses =
    Array.isArray(contract.structured_clauses) && contract.structured_clauses.length > 0;
  if (!hasClauses) {
    return { success: false, seededCount: 0, error: 'Contract has no structured clauses' };
  }

  if (!contract.tenant_id) {
    return { success: false, seededCount: 0, error: 'Contract has no tenant' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const leaseStart = contract.lease_start ? new Date(contract.lease_start) : null;
  if (!leaseStart || leaseStart > today) {
    return {
      success: false,
      seededCount: 0,
      error: `lease_start (${contract.lease_start ?? 'null'}) has not arrived yet`,
    };
  }

  // 3. Check 1-active-per-property (unless contract is already active)
  if (contract.status !== 'active') {
    const { data: existing, error: idxError } = await supabase
      .from('contracts')
      .select('id')
      .eq('property_id', contract.property_id)
      .eq('status', 'active')
      .neq('id', contractId)
      .maybeSingle();

    if (idxError) {
      return { success: false, seededCount: 0, error: `Index check failed: ${idxError.message}` };
    }
    if (existing) {
      return { success: false, seededCount: 0, error: 'Property already has an active contract' };
    }

    // Set status to active
    const { error: activateError } = await supabase
      .from('contracts')
      .update({ status: 'active' })
      .eq('id', contractId);

    if (activateError) {
      return {
        success: false,
        seededCount: 0,
        error: `Failed to activate: ${activateError.message}`,
      };
    }
  }

  // 4. Expire original contract if this is a renewal
  if (contract.renewed_from) {
    const { error: expireError } = await supabase
      .from('contracts')
      .update({ status: 'expired' })
      .eq('id', contract.renewed_from);

    if (expireError) {
      // Non-fatal — log but continue
      console.error('[activateContract] Failed to expire original contract:', expireError.message);
    }
  }

  // 5. Idempotency check: skip seeding if payments already exist
  const { data: existingPayments, error: checkError } = await supabase
    .from('payments')
    .select('id')
    .eq('contract_id', contractId)
    .eq('payment_type', 'rent')
    .limit(1);

  if (checkError) {
    return {
      success: false,
      seededCount: 0,
      error: `Payments check failed: ${checkError.message}`,
    };
  }

  if (existingPayments && existingPayments.length > 0) {
    // Already seeded — idempotent return
    return { success: true, seededCount: 0 };
  }

  // 6. Seed 12 monthly rent payment rows
  if (!contract.monthly_rent || contract.monthly_rent <= 0) {
    // No rent amount set — skip seeding but still succeed
    return { success: true, seededCount: 0 };
  }

  const firstOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const anchorDate = leaseStart > firstOfCurrentMonth ? leaseStart : firstOfCurrentMonth;

  // T-BUG-07: bound seeding loop by lease_end so short leases don't get rows past expiry
  const leaseEndDate = contract.lease_end ? new Date(contract.lease_end) : null;

  // Use due_day from contract, defaulting to 1 and clamping to 1–28 to avoid
  // month-length edge cases (e.g. no Feb 30th).
  const dueDay = Math.min(Math.max(contract.due_day ?? 1, 1), 28);

  const paymentRows: Database['public']['Tables']['payments']['Insert'][] = [];
  for (let i = 0; i < 12; i++) {
    const dueDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + i, dueDay);
    // T-BUG-07: stop seeding when due date exceeds lease end
    if (leaseEndDate && dueDate > leaseEndDate) break;
    const dueDateStr = dueDate.toISOString().split('T')[0]!;
    paymentRows.push({
      contract_id: contractId,
      amount: contract.monthly_rent,
      due_date: dueDateStr,
      payment_type: 'rent',
      status: 'pending',
    });
  }

  const { error: insertError } = await supabase.from('payments').insert(paymentRows);

  if (insertError) {
    return {
      success: false,
      seededCount: 0,
      error: `Failed to seed payments: ${insertError.message}`,
    };
  }

  return { success: true, seededCount: paymentRows.length };
}

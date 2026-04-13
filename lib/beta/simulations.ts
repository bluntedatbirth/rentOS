/**
 * Beta simulation registry.
 *
 * This whole module is a BETA-ONLY convenience for founder/tester accounts so that
 * we can trigger edge-case states (lease expiry, overdue payments, paired tenants,
 * tier-downgrade warnings, …) without manually setting up real scenarios.
 *
 * HOW TO REMOVE AT LAUNCH:
 *   1. Unset `NEXT_PUBLIC_BETA_SIMULATIONS` in Vercel — instantly disables the UI
 *      panel (checks in SimulationPanel.tsx) and returns 404 from the API route.
 *   2. Or delete the three directories for a permanent removal in one commit:
 *        - lib/beta/
 *        - app/api/beta/simulate/
 *        - components/beta/
 *      Then remove the `<SimulationPanel />` import from
 *      app/{landlord,tenant}/layout.tsx.
 *
 * SAFETY:
 *   - Every handler only mutates rows the authenticated user already owns
 *     (landlord_id = user.id or tenant_id = user.id). No cross-user writes.
 *   - The API route itself fails closed on missing env var.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

export const BETA_SIMULATIONS_ENABLED = process.env.NEXT_PUBLIC_BETA_SIMULATIONS === 'true';

export type SimulationCategory = 'contract' | 'tenant_action' | 'landlord_action' | 'billing';

export interface SimulationDefinition {
  id: string;
  category: SimulationCategory;
  label: string;
  description: string;
  /** Role that can run this simulation. 'both' = either role. */
  allowedRole: 'landlord' | 'tenant' | 'both';
  /** When true, the simulation panel renders a contract picker so the user can
   *  choose which contract to target instead of always defaulting to the first. */
  needsContractTarget?: boolean;
}

export const SIMULATIONS: SimulationDefinition[] = [
  {
    id: 'reset_test_account',
    category: 'landlord_action',
    label: 'Reset test account (delete all test data)',
    description:
      'Deletes all contracts, payments, penalties, maintenance requests, and notifications for the current landlord. Keeps properties and the landlord/tenant profiles themselves. Use this before re-running a test flow.',
    allowedRole: 'landlord',
  },
  {
    id: 'simulate_overdue_payment',
    category: 'landlord_action',
    label: 'Simulate overdue payment (>7 days)',
    description:
      'Seeds 12 monthly rent payments on the first active contract (if none exist), then sets the earliest unpaid payment to overdue with a due_date more than 7 days in the past. Use this to trigger the payment_penalty notification cron.',
    allowedRole: 'landlord',
  },
  {
    id: 'simulate_contract_expiring_60d',
    category: 'contract',
    label: 'Simulate contract expiring in 60 days',
    description:
      'Sets lease_end on the first active contract to today + 55 days — inside the 60-day window — so the lease_expiry notification cron fires. Use this to test the Contracts Expiring card.',
    allowedRole: 'landlord',
  },
  {
    id: 'pair_tenant_to_property',
    category: 'tenant_action',
    label: 'Pair tenant to first available property',
    description:
      'Finds the first property with no current tenant (current_tenant_id IS NULL) and pairs this tenant to it by creating an active contract.',
    allowedRole: 'tenant',
  },
  {
    id: 'seed_3_test_properties',
    category: 'landlord_action',
    label: 'Seed 3 test properties',
    description:
      'Creates 3 properties: one Active (lease spanning today), one Expiring (15 days left), one Vacant (no dates). Each gets a pair code.',
    allowedRole: 'landlord',
  },
  {
    id: 'simulate_lease_ending_tomorrow',
    category: 'contract',
    label: 'Simulate lease ending tomorrow',
    description: 'Sets lease_end = tomorrow on the first active contract and its linked property.',
    allowedRole: 'landlord',
  },
  {
    id: 'create_shell_property',
    category: 'tenant_action',
    label: 'Create a shell property',
    description: 'Inserts a tenant-owned shell property with sample data (name, rent, 1yr lease).',
    allowedRole: 'tenant',
  },
  {
    id: 'trigger_payment_due_notification',
    category: 'billing',
    label: 'Trigger payment due notification',
    description: 'Sends a payment_due notification to yourself.',
    allowedRole: 'both',
  },
  {
    id: 'switch_role',
    category: 'landlord_action',
    label: 'Switch mode (landlord ↔ tenant)',
    description: 'Flips active_mode in the DB. The page will auto-reload into the other mode.',
    allowedRole: 'both',
  },
];

type SimContext = {
  userId: string;
  role: 'landlord' | 'tenant';
  /** Optional contract ID the user selected in the panel picker. */
  targetContractId?: string;
};

type SimResult = {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
};

type SimHandler = (ctx: SimContext) => Promise<SimResult>;

// Lookup the first active contract owned by the landlord.
async function findActiveContract(
  userId: string
): Promise<{ id: string; property_id: string | null } | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from('contracts')
    .select('id, property_id')
    .eq('landlord_id', userId)
    .eq('status', 'active')
    .limit(1);
  return (data && data[0]) || null;
}

const handlers: Record<string, SimHandler> = {
  reset_test_account: async ({ userId, role }) => {
    if (role !== 'landlord') {
      return { success: false, message: 'Only landlords can reset the test account.' };
    }
    // Server-side env guard — belt-and-suspenders on top of the API route check.
    if (process.env.NEXT_PUBLIC_BETA_SIMULATIONS !== 'true') {
      return { success: false, message: 'Beta simulations are not enabled.' };
    }
    const admin = createServiceRoleClient();

    // Collect all contract IDs owned by this landlord
    const { data: contracts, error: cSelErr } = await admin
      .from('contracts')
      .select('id, tenant_id')
      .eq('landlord_id', userId);
    if (cSelErr)
      return { success: false, message: 'Failed to fetch contracts: ' + cSelErr.message };

    const contractIds = (contracts ?? []).map((c) => c.id);
    const tenantIdsRaw = (contracts ?? [])
      .map((c) => c.tenant_id)
      .filter((id): id is string => !!id);
    const tenantIds = tenantIdsRaw.filter((id, idx) => tenantIdsRaw.indexOf(id) === idx);

    // Delete child rows in FK-safe order before deleting contracts.
    if (contractIds.length > 0) {
      const { error: payDelErr } = await admin
        .from('payments')
        .delete()
        .in('contract_id', contractIds);
      if (payDelErr) {
        return { success: false, message: 'payments delete failed: ' + payDelErr.message };
      }

      const { error: penDelErr } = await admin
        .from('penalties')
        .delete()
        .in('contract_id', contractIds);
      if (penDelErr) {
        return { success: false, message: 'penalties delete failed: ' + penDelErr.message };
      }

      const { error: mntDelErr } = await admin
        .from('maintenance_requests')
        .delete()
        .in('contract_id', contractIds);
      if (mntDelErr) {
        return {
          success: false,
          message: 'maintenance_requests delete failed: ' + mntDelErr.message,
        };
      }

      // NULL out renewed_from self-references to avoid FK constraint blocks
      const { error: renewNullErr } = await admin
        .from('contracts')
        .update({ renewed_from: null } as Record<string, unknown>)
        .in('renewed_from', contractIds);
      if (renewNullErr) {
        return { success: false, message: 'renewed_from cleanup failed: ' + renewNullErr.message };
      }
    }

    // Delete notifications for landlord + their tenants
    const notifRecipients = [userId, ...tenantIds];
    const { error: notifDelErr } = await admin
      .from('notifications')
      .delete()
      .in('recipient_id', notifRecipients);
    if (notifDelErr) {
      return { success: false, message: 'notifications delete failed: ' + notifDelErr.message };
    }

    // Finally delete the contracts themselves
    if (contractIds.length > 0) {
      const { error: cDelErr } = await admin.from('contracts').delete().eq('landlord_id', userId);
      if (cDelErr) {
        return { success: false, message: 'contracts delete failed: ' + cDelErr.message };
      }
    }

    return {
      success: true,
      message: `Reset complete. Deleted ${contractIds.length} contract${contractIds.length === 1 ? '' : 's'} and all associated payments, penalties, maintenance requests, and notifications.`,
      data: { contracts_deleted: contractIds.length, tenants_affected: tenantIds.length },
    };
  },

  simulate_overdue_payment: async ({ userId, role }) => {
    if (role !== 'landlord') {
      return { success: false, message: 'Only landlords can simulate overdue payments.' };
    }
    const admin = createServiceRoleClient();

    // 1. Find the landlord's first active contract
    const contract = await findActiveContract(userId);
    if (!contract) {
      return {
        success: false,
        message: 'No active contract found. Pair a tenant to a contract first.',
      };
    }

    // 2. Load monthly_rent and lease_start
    const { data: contractRow, error: contractErr } = await admin
      .from('contracts')
      .select('monthly_rent, lease_start')
      .eq('id', contract.id)
      .single();
    if (contractErr || !contractRow) {
      return { success: false, message: 'Failed to load contract details.' };
    }

    const contractData = contractRow as unknown as {
      monthly_rent: number | null;
      lease_start: string | null;
    };
    const rent =
      contractData.monthly_rent && contractData.monthly_rent > 0
        ? contractData.monthly_rent
        : 15000;

    // 3. Check whether payments already exist on this contract
    const { data: existingPayments, error: payErr } = await admin
      .from('payments')
      .select('id, due_date, status')
      .eq('contract_id', contract.id)
      .eq('payment_type', 'rent')
      .order('due_date', { ascending: true });
    if (payErr) return { success: false, message: payErr.message };

    let paymentIdToMarkOverdue: string | null = null;
    let seeded = 0;

    if (!existingPayments || existingPayments.length === 0) {
      // Seed 12 monthly rows starting from the lease_start month
      const anchor = contractData.lease_start ? new Date(contractData.lease_start) : new Date();
      anchor.setDate(1);
      const rows: Array<{
        contract_id: string;
        amount: number;
        due_date: string;
        payment_type: 'rent';
        status: 'pending';
      }> = [];
      for (let i = 0; i < 12; i++) {
        const due = new Date(anchor.getFullYear(), anchor.getMonth() + i, 1);
        rows.push({
          contract_id: contract.id,
          amount: rent,
          due_date: due.toISOString().slice(0, 10),
          payment_type: 'rent',
          status: 'pending',
        });
      }
      const { data: inserted, error: insertErr } = await admin
        .from('payments')
        .insert(rows)
        .select('id')
        .order('id', { ascending: true });
      if (insertErr) return { success: false, message: insertErr.message };
      seeded = inserted?.length ?? 0;
      paymentIdToMarkOverdue = inserted?.[0]?.id ?? null;
    } else {
      // Pick the earliest still-unpaid payment; if none, use the very first row
      const firstUnpaid = existingPayments.find(
        (p) => (p as { status: string }).status !== 'paid'
      ) as { id: string } | undefined;
      paymentIdToMarkOverdue = firstUnpaid?.id ?? (existingPayments[0] as { id: string }).id;
    }

    if (!paymentIdToMarkOverdue) {
      return { success: false, message: 'Could not determine a payment to mark overdue.' };
    }

    // 4. Set due_date to 8 days ago and status to overdue (>7 days triggers payment_penalty cron)
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
    const overdueDateStr = eightDaysAgo.toISOString().slice(0, 10);

    const { error: updateErr } = await admin
      .from('payments')
      .update({
        due_date: overdueDateStr,
        status: 'overdue',
      } as Record<string, unknown>)
      .eq('id', paymentIdToMarkOverdue);
    if (updateErr) return { success: false, message: updateErr.message };

    return {
      success: true,
      message:
        seeded > 0
          ? `Seeded ${seeded} payments and marked one overdue (due 8 days ago). Run the cron to fire payment_penalty.`
          : 'Marked earliest unpaid payment overdue (due 8 days ago). Run the cron to fire payment_penalty.',
      data: {
        contract_id: contract.id,
        payment_id: paymentIdToMarkOverdue,
        seeded,
        new_due_date: overdueDateStr,
      },
    };
  },

  simulate_contract_expiring_60d: async ({ userId, role }) => {
    if (role !== 'landlord') {
      return { success: false, message: 'Only landlords can simulate contract expiry.' };
    }
    const contract = await findActiveContract(userId);
    if (!contract) {
      return {
        success: false,
        message: 'No active contract found. Pair a tenant to a contract first.',
      };
    }
    const admin = createServiceRoleClient();

    // Set lease_end to today + 55 days — inside the 60-day lease_expiry cron window
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 55);
    const expiryDateStr = expiryDate.toISOString().slice(0, 10);

    const { error } = await admin
      .from('contracts')
      .update({ lease_end: expiryDateStr } as Record<string, unknown>)
      .eq('id', contract.id);
    if (error) return { success: false, message: error.message };

    return {
      success: true,
      message: `Contract ${contract.id.slice(0, 8)} lease_end set to ${expiryDateStr} (55 days from now). Run the cron to fire lease_expiry.`,
      data: { contract_id: contract.id, lease_end: expiryDateStr },
    };
  },

  pair_tenant_to_property: async ({ userId, role }) => {
    if (role !== 'tenant') return { success: false, message: 'Only tenants can pair.' };
    const admin = createServiceRoleClient();
    // Find first property with no current tenant
    const { data: props } = (await admin
      .from('properties')
      .select('id, name, landlord_id, pair_code, daily_rate, lease_end')
      .is('current_tenant_id' as string, null)
      .eq('is_active', true)
      .limit(1)) as {
      data: Array<{
        id: string;
        name: string;
        landlord_id: string;
        pair_code: string | null;
        daily_rate: number | null;
        lease_end: string | null;
      }> | null;
    };
    const prop = props?.[0];
    if (!prop)
      return { success: false, message: 'No available property found (all have tenants).' };
    // Create active contract
    const today = new Date().toISOString().slice(0, 10);
    const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: contractData, error: contractErr } = await admin
      .from('contracts')
      .insert({
        property_id: prop.id,
        tenant_id: userId,
        landlord_id: prop.landlord_id,
        status: 'active',
        lease_start: today,
        lease_end: oneYearLater,
        monthly_rent: 15000,
      } as any)
      .select('id')
      .single();
    /* eslint-enable @typescript-eslint/no-explicit-any */
    if (contractErr) return { success: false, message: contractErr.message };
    // Update property current_tenant_id
    await admin
      .from('properties')
      .update({ current_tenant_id: userId } as Record<string, unknown>)
      .eq('id', prop.id);
    // Seed a payment for the tenant
    if (contractData) {
      const isShortTerm = !!prop.daily_rate;
      if (isShortTerm && prop.lease_end && prop.daily_rate) {
        // Daily-rate: single lump-sum payment at lease end
        const start = new Date(today);
        const end = new Date(prop.lease_end);
        const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
        const total = prop.daily_rate * days;
        await admin.from('payments').insert({
          contract_id: contractData.id,
          amount: total,
          due_date: prop.lease_end,
          payment_type: 'rent',
          status: 'pending',
        });
      } else {
        // Monthly: seed up to 12 payments on 1st of each month
        const payments: Array<Record<string, unknown>> = [];
        const leaseEnd = new Date(oneYearLater);
        const cursor = new Date(today);
        // Advance to 1st of next month
        cursor.setMonth(cursor.getMonth() + 1);
        cursor.setDate(1);
        for (let i = 0; i < 12 && cursor <= leaseEnd; i++) {
          payments.push({
            contract_id: contractData.id,
            amount: 15000,
            due_date: cursor.toISOString().slice(0, 10),
            payment_type: 'rent',
            status: 'pending',
          });
          cursor.setMonth(cursor.getMonth() + 1);
        }
        if (payments.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await admin.from('payments').insert(payments as any);
        }
      }
    }
    return {
      success: true,
      message: `Paired to "${prop.name}" and seeded a payment. Refresh to see it on your dashboard.`,
      data: { property_id: prop.id },
    };
  },

  seed_3_test_properties: async ({ userId, role }) => {
    if (role !== 'landlord')
      return { success: false, message: 'Only landlords can seed properties.' };
    const admin = createServiceRoleClient();
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
    // Generate pair codes
    const { generatePairCode } = await import('@/lib/pairing/code');
    const rows = [
      {
        landlord_id: userId,
        name: 'Test — Active Condo',
        address: '123 Sukhumvit Rd',
        lease_start: fmt(addDays(today, -180)),
        lease_end: fmt(addDays(today, 180)),
        monthly_rent: 15000,
        pair_code: generatePairCode(),
        pair_code_rotated_at: new Date().toISOString(),
      },
      {
        landlord_id: userId,
        name: 'Test — Expiring Apartment',
        address: '456 Silom Rd',
        lease_start: fmt(addDays(today, -350)),
        lease_end: fmt(addDays(today, 15)),
        monthly_rent: 12000,
        pair_code: generatePairCode(),
        pair_code_rotated_at: new Date().toISOString(),
      },
      {
        landlord_id: userId,
        name: 'Test — Vacant Studio',
        address: '789 Ratchada Rd',
        pair_code: generatePairCode(),
        pair_code_rotated_at: new Date().toISOString(),
      },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- columns not yet in generated types
    const { error } = await admin.from('properties').insert(rows as any);
    if (error) return { success: false, message: error.message };
    return {
      success: true,
      message: 'Created 3 test properties: Active, Expiring (15 days), Vacant.',
    };
  },

  simulate_lease_ending_tomorrow: async ({ userId, role }) => {
    if (role !== 'landlord')
      return { success: false, message: 'Only landlords can simulate lease ending.' };
    const contract = await findActiveContract(userId);
    if (!contract) return { success: false, message: 'No active contract found.' };
    const admin = createServiceRoleClient();
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const { error: cErr } = await admin
      .from('contracts')
      .update({ lease_end: tomorrow } as Record<string, unknown>)
      .eq('id', contract.id);
    if (cErr) return { success: false, message: cErr.message };
    if (contract.property_id) {
      await admin
        .from('properties')
        .update({ lease_end: tomorrow } as Record<string, unknown>)
        .eq('id', contract.property_id);
    }
    return {
      success: true,
      message: `Lease end set to ${tomorrow} (tomorrow) on contract and property.`,
      data: { contract_id: contract.id },
    };
  },

  create_shell_property: async ({ userId, role }) => {
    if (role !== 'tenant')
      return { success: false, message: 'Only tenants can create shell properties.' };
    const admin = createServiceRoleClient();
    const today = new Date().toISOString().slice(0, 10);
    const oneYear = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { error } = await admin.from('properties').insert({
      name: 'My Rental (Shell)',
      address: 'Sample address',
      lease_start: today,
      lease_end: oneYear,
      monthly_rent: 10000,
      is_shell: true,
      created_by_tenant_id: userId,
    } as any);
    /* eslint-enable @typescript-eslint/no-explicit-any */
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Shell property created. Refresh your dashboard to see it.' };
  },

  trigger_payment_due_notification: async ({ userId }) => {
    const admin = createServiceRoleClient();
    const { error } = await admin.from('notifications').insert({
      recipient_id: userId,
      type: 'payment_due',
      title: 'Payment Due Soon',
      body: 'You have a rent payment due in 3 days.',
    });
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Payment due notification sent. Check the bell icon.' };
  },

  switch_role: async ({ userId, role }) => {
    const admin = createServiceRoleClient();
    const newMode = role === 'landlord' ? 'tenant' : 'landlord';
    const { error } = await admin
      .from('profiles')
      .update({ active_mode: newMode } as Record<string, unknown>)
      .eq('id', userId);
    if (error) return { success: false, message: error.message };
    return {
      success: true,
      message: `Switched to ${newMode} mode. The page will reload.`,
      data: { new_mode: newMode },
    };
  },
};

export async function runSimulation(actionId: string, ctx: SimContext): Promise<SimResult> {
  const def = SIMULATIONS.find((s) => s.id === actionId);
  if (!def) return { success: false, message: `Unknown simulation: ${actionId}` };
  if (def.allowedRole !== 'both' && def.allowedRole !== ctx.role) {
    return { success: false, message: `This simulation requires role: ${def.allowedRole}` };
  }
  const handler = handlers[actionId];
  if (!handler) return { success: false, message: `No handler for: ${actionId}` };
  try {
    return await handler(ctx);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, message: 'Handler threw: ' + msg };
  }
}

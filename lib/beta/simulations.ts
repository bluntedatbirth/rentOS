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
import { sendNotification } from '@/lib/notifications/send';

// ---------------------------------------------------------------------------
// Random sample pools for simulations that need realistic-looking test data.
// Each call picks a fresh entry so running a sim twice never creates identical
// rows (critical for smoke-testing notifications, lists, filters, etc.)
// ---------------------------------------------------------------------------

const PROPERTY_NAMES = [
  'Sukhumvit Condo',
  'Silom Loft',
  'Thonglor Apartment',
  'Phrom Phong Studio',
  'Asoke Penthouse',
  'Ekkamai Flat',
  'Sathorn Residence',
  'Ari Townhouse',
  'Ratchada Suite',
  'Phaya Thai Duplex',
];

const PROPERTY_DISTRICTS = [
  'Watthana',
  'Khlong Toei',
  'Bang Rak',
  'Ratchathewi',
  'Huai Khwang',
  'Phaya Thai',
  'Pathum Wan',
];

const MAINTENANCE_TITLES_EN = [
  'Leaking kitchen faucet',
  'Air conditioner not cooling',
  'Toilet clogged',
  'Electrical outlet sparking',
  'Water heater broken',
  'Mould on bathroom ceiling',
  'Front door lock jammed',
  'Bedroom window will not close',
  'Ceiling fan making loud noise',
  'Shower drain backed up',
];

const MAINTENANCE_DESCRIPTIONS = [
  'This has been getting worse over the past few days. Please inspect ASAP.',
  'Started happening this morning. Tenant is unable to use the fixture.',
  'Noticed last night. Not an emergency but would like it resolved this week.',
  'Urgent — creates a safety concern if left unaddressed.',
  'Intermittent issue. Happens mostly in the evenings.',
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomHouseNumber(): number {
  return Math.floor(Math.random() * 999) + 1;
}

// ---------------------------------------------------------------------------
// Shared sample clause set — used by every sim that needs populated clauses.
// Accepts a monthly rent so the text stays realistic; pass a default (15000)
// when the exact rent is unknown at the call site.
// ---------------------------------------------------------------------------
function makeSampleClauses(monthlyRent: number) {
  return [
    {
      clause_id: 'c1',
      title_th: 'ค่าเช่ารายเดือน',
      title_en: 'Monthly Rent',
      text_th: `ผู้เช่าตกลงชำระค่าเช่าจำนวน ${monthlyRent.toLocaleString()} บาท ทุกวันที่ 1 ของเดือน`,
      text_en: `Tenant agrees to pay rent of ฿${monthlyRent.toLocaleString()} on the 1st of every month.`,
      category: 'payment' as const,
    },
    {
      clause_id: 'c2',
      title_th: 'เงินประกัน',
      title_en: 'Security Deposit',
      text_th: `ผู้เช่าวางเงินประกัน ${(monthlyRent * 2).toLocaleString()} บาท คืนเมื่อสิ้นสุดสัญญา`,
      text_en: `Tenant shall deposit ฿${(monthlyRent * 2).toLocaleString()} as security, refundable on lease end.`,
      category: 'deposit' as const,
    },
    {
      clause_id: 'c3',
      title_th: 'ค่าสาธารณูปโภค',
      title_en: 'Utilities',
      text_th: 'ค่าไฟฟ้า น้ำประปา และอินเทอร์เน็ต ผู้เช่าเป็นผู้รับผิดชอบ',
      text_en: 'Tenant is responsible for electricity, water, and internet.',
      category: 'utilities' as const,
    },
    {
      clause_id: 'c4',
      title_th: 'การซ่อมบำรุง',
      title_en: 'Maintenance',
      text_th: 'ผู้ให้เช่ารับผิดชอบการซ่อมบำรุงโครงสร้าง ผู้เช่ารับผิดชอบการซ่อมแซมเล็กน้อย',
      text_en: 'Landlord handles structural repairs; tenant handles minor maintenance.',
      category: 'maintenance' as const,
    },
  ];
}

export const BETA_SIMULATIONS_ENABLED = process.env.NEXT_PUBLIC_BETA_SIMULATIONS === 'true';

export type SimulationCategory = 'contract' | 'tenant_action' | 'landlord_action' | 'billing';

export interface SimulationDefinition {
  id: string;
  category: SimulationCategory;
  label: string;
  description: string;
  /** Role that can run this simulation. 'both' = either role. */
  allowedRole: 'landlord' | 'tenant' | 'both';
}

export const SIMULATIONS: SimulationDefinition[] = [
  {
    id: 'seed_pending_contract',
    category: 'contract',
    label: 'Create property + pending contract',
    description:
      'Spawns a fresh random property and a matching pending contract you can pair a tenant to.',
    allowedRole: 'landlord',
  },
  {
    id: 'auto_pair_demo_tenant',
    category: 'contract',
    label: 'Auto-pair demo tenant',
    description: 'Links the demo tenant account to your first pending contract and activates it.',
    allowedRole: 'landlord',
  },
  {
    id: 'trigger_renewal_needed',
    category: 'contract',
    label: 'Trigger renewal-needed state',
    description:
      'Backdates lease_end on your first active contract to 15 days from now so the renewal banner fires.',
    allowedRole: 'landlord',
  },
  {
    id: 'delete_non_active_contracts',
    category: 'contract',
    label: 'Delete all non-active contracts',
    description:
      'Permanently deletes all pending, awaiting_signature, expired, and terminated contracts (and their payments/penalties/maintenance rows). Keeps active contracts.',
    allowedRole: 'landlord',
  },
  {
    id: 'fire_renewal_offer',
    category: 'contract',
    label: 'Fire lease renewal offer',
    description:
      'Creates a pending-renewal contract chained off your first active contract and notifies the tenant with a lease_renewal_offer.',
    allowedRole: 'landlord',
  },
  {
    id: 'file_maintenance_request',
    category: 'tenant_action',
    label: 'File maintenance request (as tenant)',
    description:
      'Creates an open maintenance request with a randomized title. Notifies the landlord.',
    allowedRole: 'both',
  },
  {
    id: 'appeal_penalty',
    category: 'tenant_action',
    label: 'Appeal a confirmed penalty (as tenant)',
    description:
      'Flips your first confirmed penalty to pending_tenant_appeal and notifies the landlord. Requires a confirmed penalty.',
    allowedRole: 'both',
  },
  {
    id: 'advance_maintenance_in_progress',
    category: 'landlord_action',
    label: 'Advance maintenance to in-progress',
    description:
      'Takes the first open maintenance request, assigns a technician + cost + SLA deadline, and notifies the tenant.',
    allowedRole: 'landlord',
  },
  {
    id: 'trigger_tier_expiry_warning',
    category: 'billing',
    label: 'Trigger tier expiry warning (5 days)',
    description: 'Sets tier_expires_at to 5 days from now so the expiry banner fires.',
    allowedRole: 'both',
  },
  {
    id: 'trigger_tier_downgrade',
    category: 'billing',
    label: 'Trigger tier downgrade (past grace)',
    description:
      'Sets tier_expires_at to 4 days ago (past 3-day grace), flips tier to free, and sends a tier_downgraded notification.',
    allowedRole: 'both',
  },
  {
    id: 'simulate_tenant_claim_payment',
    category: 'tenant_action',
    label: 'Simulate claiming an unpaid payment',
    description:
      'Takes the oldest unpaid payment on your active contract and claims it as paid. Landlord will be notified.',
    allowedRole: 'tenant',
  },
  {
    id: 'simulate_due_payment',
    category: 'tenant_action',
    label: 'Simulate a due payment',
    description:
      'Seeds 12 monthly rent payments on your active contract (if none exist), then pushes the earliest one into "overdue" by setting its due_date to 5 days ago. Use this to test the Due section on the payments page.',
    allowedRole: 'tenant',
  },
  {
    id: 'reset_test_account',
    category: 'landlord_action',
    label: 'Reset test account (delete all test data)',
    description:
      'Deletes all contracts, payments, penalties, maintenance requests, and notifications for the current landlord. Keeps properties and the landlord/tenant profiles themselves. Use this before re-running a test flow.',
    allowedRole: 'landlord',
  },
];

type SimContext = {
  userId: string;
  role: 'landlord' | 'tenant';
};

type SimResult = {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
};

type SimHandler = (ctx: SimContext) => Promise<SimResult>;

// Lookup a contract owned by or assigned to this user.
// Returns the first contract matching the given status; null if none.
async function findContract(
  userId: string,
  role: 'landlord' | 'tenant',
  statuses: string[]
): Promise<{ id: string; property_id: string } | null> {
  const admin = createServiceRoleClient();
  const column = role === 'landlord' ? 'landlord_id' : 'tenant_id';
  const { data } = await admin
    .from('contracts')
    .select('id, property_id')
    .eq(column, userId)
    .in(
      'status',
      statuses as ('active' | 'expired' | 'terminated' | 'pending' | 'awaiting_signature')[]
    )
    .limit(1);
  return (data && data[0]) || null;
}

const handlers: Record<string, SimHandler> = {
  seed_pending_contract: async ({ userId, role }) => {
    if (role !== 'landlord') {
      return { success: false, message: 'Only landlords can seed pending contracts.' };
    }
    const admin = createServiceRoleClient();

    // Always create a fresh random property so each run produces distinct data.
    const suffix = Math.floor(Math.random() * 1000);
    const propertyName = `${pick(PROPERTY_NAMES)} #${suffix}`;
    const district = pick(PROPERTY_DISTRICTS);
    const address = `${randomHouseNumber()}/${randomHouseNumber()} Soi Example, ${district}, Bangkok 10110`;

    const { data: newProp, error: propErr } = await admin
      .from('properties')
      .insert({
        landlord_id: userId,
        name: propertyName,
        address,
      })
      .select('id')
      .single();
    if (propErr || !newProp) {
      return {
        success: false,
        message: 'Failed to create property: ' + (propErr?.message ?? ''),
      };
    }

    const today = new Date();
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    // Randomize rent within a realistic Bangkok range so list views show variety.
    const monthlyRent = 10000 + Math.floor(Math.random() * 20) * 1000;

    // 'pending' should mean "uploaded + parsed, reviewable" — populate sample
    // parsed content so the detail view actually renders something the user can
    // read. Without this the contract opens with 0 clauses and no raw text,
    // which isn't what real pending contracts look like.
    const sampleClauses = makeSampleClauses(monthlyRent);

    const rawTextTh = `สัญญาเช่าที่พักอาศัย\n\nระหว่าง ผู้ให้เช่า และ ผู้เช่า\nสถานที่: ${propertyName}, ${address}\nระยะเวลาเช่า: 1 ปี (${today.toISOString().slice(0, 10)} ถึง ${oneYearLater.toISOString().slice(0, 10)})\nค่าเช่า: ${monthlyRent.toLocaleString()} บาท/เดือน\nเงินประกัน: ${(monthlyRent * 2).toLocaleString()} บาท\n\n(เอกสารจำลองสำหรับการทดสอบระบบ)`;

    const translatedTextEn = `Residential Lease Agreement\n\nBetween Landlord and Tenant\nProperty: ${propertyName}, ${address}\nLease Period: 1 year (${today.toISOString().slice(0, 10)} to ${oneYearLater.toISOString().slice(0, 10)})\nRent: ฿${monthlyRent.toLocaleString()}/month\nSecurity Deposit: ฿${(monthlyRent * 2).toLocaleString()}\n\n(Simulation document for system testing)`;

    const contractPayload: Record<string, unknown> = {
      property_id: newProp.id,
      landlord_id: userId,
      status: 'pending',
      lease_start: today.toISOString().slice(0, 10),
      lease_end: oneYearLater.toISOString().slice(0, 10),
      monthly_rent: monthlyRent,
      security_deposit: monthlyRent * 2,
      structured_clauses: sampleClauses,
      raw_text_th: rawTextTh,
      translated_text_en: translatedTextEn,
    };

    const { data: contract, error } = await admin
      .from('contracts')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(contractPayload as any)
      .select('id')
      .single();
    if (error || !contract) {
      return { success: false, message: 'Failed to create contract: ' + (error?.message ?? '') };
    }
    return {
      success: true,
      message: `Created ${propertyName} + pending contract ${contract.id.slice(0, 8)} (4 sample clauses).`,
      data: { contract_id: contract.id, property_id: newProp.id },
    };
  },

  trigger_renewal_needed: async ({ userId, role }) => {
    if (role !== 'landlord') {
      return { success: false, message: 'Only landlords can trigger renewal state.' };
    }
    const contract = await findContract(userId, 'landlord', ['active']);
    if (!contract) {
      return { success: false, message: 'No active contract found to mark for renewal.' };
    }
    const admin = createServiceRoleClient();
    const fifteenDaysFromNow = new Date();
    fifteenDaysFromNow.setDate(fifteenDaysFromNow.getDate() + 15);
    const { error } = await admin
      .from('contracts')
      .update({ lease_end: fifteenDaysFromNow.toISOString().slice(0, 10) })
      .eq('id', contract.id);
    if (error) return { success: false, message: error.message };
    return {
      success: true,
      message: `Contract ${contract.id.slice(0, 8)} now expires in 15 days — renewal banner should fire.`,
      data: { contract_id: contract.id },
    };
  },

  delete_non_active_contracts: async ({ userId, role }) => {
    if (role !== 'landlord') {
      return { success: false, message: 'Only landlords can delete contracts.' };
    }
    const admin = createServiceRoleClient();

    // Find all non-active contracts owned by this landlord
    const { data: targets, error: selErr } = await admin
      .from('contracts')
      .select('id')
      .eq('landlord_id', userId)
      .in('status', ['pending', 'awaiting_signature', 'expired', 'terminated']);
    if (selErr) return { success: false, message: selErr.message };
    if (!targets || targets.length === 0) {
      return { success: false, message: 'No non-active contracts to delete.' };
    }
    const ids = targets.map((t) => t.id);

    // Clean up child rows first — payments, penalties, and maintenance_requests
    // have NOT NULL FKs to contracts WITHOUT ON DELETE CASCADE, so we must
    // delete them explicitly or the contract delete will fail.
    // (contract_analyses and penalty_rules DO cascade, so we skip those.)
    const { error: payErr } = await admin.from('payments').delete().in('contract_id', ids);
    if (payErr) return { success: false, message: 'payments cleanup failed: ' + payErr.message };

    const { error: penErr } = await admin.from('penalties').delete().in('contract_id', ids);
    if (penErr) return { success: false, message: 'penalties cleanup failed: ' + penErr.message };

    const { error: mntErr } = await admin
      .from('maintenance_requests')
      .delete()
      .in('contract_id', ids);
    if (mntErr) {
      return { success: false, message: 'maintenance cleanup failed: ' + mntErr.message };
    }

    // contracts.renewed_from is a self-referencing FK without ON DELETE CASCADE —
    // any contract whose renewed_from points at a target will block the delete.
    // NULL them out first so the targets can be deleted cleanly.
    const { error: renewErr } = await admin
      .from('contracts')
      .update({ renewed_from: null } as Record<string, unknown>)
      .in('renewed_from', ids);
    if (renewErr) {
      return { success: false, message: 'renewed_from cleanup failed: ' + renewErr.message };
    }

    // Now delete the contracts
    const { error: cErr } = await admin.from('contracts').delete().in('id', ids);
    if (cErr) return { success: false, message: 'contract delete failed: ' + cErr.message };

    return {
      success: true,
      message: `Deleted ${ids.length} non-active contract${ids.length === 1 ? '' : 's'} (and their child rows).`,
      data: { deleted_count: ids.length },
    };
  },

  auto_pair_demo_tenant: async ({ userId, role }) => {
    if (role !== 'landlord') {
      return { success: false, message: 'Only landlords can pair tenants.' };
    }
    const admin = createServiceRoleClient();
    // Look up a tenant profile (demo tenant) — first one that isn't the current user
    const { data: tenant } = await admin
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'tenant')
      .neq('id', userId)
      .limit(1)
      .single();
    if (!tenant) {
      return { success: false, message: 'No tenant account found to pair with.' };
    }
    const pending = await findContract(userId, 'landlord', ['pending', 'awaiting_signature']);
    if (!pending) {
      return {
        success: false,
        message: 'No pending contract found. Run "Create property + pending contract" first.',
      };
    }

    // Load the contract so we can verify / fix state machine invariants before
    // flipping to 'active': needs non-empty structured_clauses, monthly_rent > 0,
    // lease_start <= today, and lease_end > today.
    const { data: pendingRow, error: loadErr } = await admin
      .from('contracts')
      .select('structured_clauses, monthly_rent, lease_start, lease_end')
      .eq('id', pending.id)
      .single();
    if (loadErr || !pendingRow) {
      return { success: false, message: 'Failed to load pending contract details.' };
    }

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const oneYearLater = new Date(today);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    const oneYearLaterStr = oneYearLater.toISOString().slice(0, 10);

    const existingClauses = pendingRow.structured_clauses as unknown[];
    const hasValidClauses = Array.isArray(existingClauses) && existingClauses.length > 0;
    const monthlyRent =
      typeof pendingRow.monthly_rent === 'number' && pendingRow.monthly_rent > 0
        ? pendingRow.monthly_rent
        : 15000;

    // lease_start must be <= today for 'active'; if it's in the future or missing,
    // reset it to today so the state machine is satisfied.
    const leaseStartIsValid =
      typeof pendingRow.lease_start === 'string' && pendingRow.lease_start <= todayStr;
    // lease_end must be > today for 'active'.
    const leaseEndIsValid =
      typeof pendingRow.lease_end === 'string' && pendingRow.lease_end > todayStr;

    const { error } = await admin
      .from('contracts')
      .update({
        tenant_id: tenant.id,
        status: 'active',
        pairing_code: null,
        pairing_expires_at: null,
        // Ensure state machine invariants are met:
        ...(!hasValidClauses && { structured_clauses: makeSampleClauses(monthlyRent) }),
        ...(!leaseStartIsValid && { lease_start: todayStr }),
        ...(!leaseEndIsValid && { lease_end: oneYearLaterStr }),
        ...(!(typeof pendingRow.monthly_rent === 'number' && pendingRow.monthly_rent > 0) && {
          monthly_rent: monthlyRent,
        }),
      } as Record<string, unknown>)
      .eq('id', pending.id);
    if (error) return { success: false, message: error.message };
    return {
      success: true,
      message: `Paired ${tenant.full_name ?? 'demo tenant'} to contract ${pending.id.slice(0, 8)}.`,
      data: { contract_id: pending.id, tenant_id: tenant.id },
    };
  },

  file_maintenance_request: async ({ userId, role }) => {
    const contract = await findContract(userId, role, ['active']);
    if (!contract) {
      return { success: false, message: 'No active contract found.' };
    }
    const admin = createServiceRoleClient();
    // Randomize so each run produces a distinct row — useful for notification
    // testing (multiple rows with different titles in the inbox).
    const title = pick(MAINTENANCE_TITLES_EN);
    const description = pick(MAINTENANCE_DESCRIPTIONS);
    const { data, error } = await admin
      .from('maintenance_requests')
      .insert({
        contract_id: contract.id,
        raised_by: userId,
        title,
        description,
        status: 'open',
      })
      .select('id')
      .single();
    if (error || !data) return { success: false, message: error?.message ?? 'Insert failed' };

    // Always notify the landlord — even if the sim runner IS the landlord.
    // The whole point of this sim is to verify inbox delivery, so the founder
    // wants to see the notification land even when testing from the landlord
    // side. The real /api/maintenance POST route also notifies the landlord.
    try {
      const { data: contractRow } = await admin
        .from('contracts')
        .select('landlord_id, tenant_id, properties(name)')
        .eq('id', contract.id)
        .single();
      const contractInfo = contractRow as unknown as {
        landlord_id: string | null;
        tenant_id: string | null;
        properties: { name: string } | null;
      } | null;
      if (contractInfo?.landlord_id) {
        const propertyName = contractInfo.properties?.name ?? '';
        await sendNotification({
          recipientId: contractInfo.landlord_id,
          type: 'maintenance_raised',
          titleEn: 'New Maintenance Request',
          titleTh: 'แจ้งซ่อมใหม่',
          bodyEn: `A tenant has submitted a maintenance request${propertyName ? ` for ${propertyName}` : ''}: ${title}`,
          bodyTh: `ผู้เช่าแจ้งซ่อม${propertyName ? ` ${propertyName}` : ''}: ${title}`,
          url: '/landlord/maintenance',
        });
      }
    } catch {
      // Non-critical — request was already created
    }

    return {
      success: true,
      message: `Filed "${title}" (${data.id.slice(0, 8)}).`,
      data: { maintenance_id: data.id, title },
    };
  },

  fire_renewal_offer: async ({ userId, role }) => {
    if (role !== 'landlord') {
      return { success: false, message: 'Only landlords can fire renewal offers.' };
    }
    const active = await findContract(userId, 'landlord', ['active']);
    if (!active) {
      return { success: false, message: 'No active contract found to renew.' };
    }
    const admin = createServiceRoleClient();

    // Pull the active contract's core fields so the renewal inherits them
    const { data: original, error: origErr } = await admin
      .from('contracts')
      .select('property_id, tenant_id, lease_start, lease_end, monthly_rent, security_deposit')
      .eq('id', active.id)
      .single();
    if (origErr || !original) {
      return { success: false, message: 'Failed to load original contract.' };
    }

    // Renewal: one-year extension starting the day after the current lease_end
    const currentEnd = original.lease_end ? new Date(original.lease_end) : new Date();
    const newStart = new Date(currentEnd);
    newStart.setDate(newStart.getDate() + 1);
    const newEnd = new Date(newStart);
    newEnd.setFullYear(newEnd.getFullYear() + 1);

    // 'pending' requires non-empty structured_clauses per the state machine rules.
    const renewMonthlyRent =
      typeof original.monthly_rent === 'number' && original.monthly_rent > 0
        ? original.monthly_rent
        : 15000;

    const renewalPayload: Record<string, unknown> = {
      property_id: original.property_id,
      landlord_id: userId,
      tenant_id: original.tenant_id,
      status: 'pending',
      lease_start: newStart.toISOString().slice(0, 10),
      lease_end: newEnd.toISOString().slice(0, 10),
      monthly_rent: renewMonthlyRent,
      security_deposit: original.security_deposit,
      renewed_from: active.id,
      structured_clauses: makeSampleClauses(renewMonthlyRent),
    };

    const { data: renewal, error: renewErr } = await admin
      .from('contracts')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(renewalPayload as any)
      .select('id')
      .single();
    if (renewErr || !renewal) {
      return {
        success: false,
        message: 'Failed to create renewal: ' + (renewErr?.message ?? ''),
      };
    }

    // Notify the tenant with a lease_renewal_offer
    if (original.tenant_id) {
      try {
        await sendNotification({
          recipientId: original.tenant_id,
          type: 'lease_renewal_offer',
          titleEn: 'Lease Renewal Offer',
          titleTh: 'ข้อเสนอต่อสัญญาเช่า',
          bodyEn: 'Your landlord has offered a one-year lease renewal. Please review and respond.',
          bodyTh: 'เจ้าของที่พักของคุณเสนอการต่อสัญญาเช่า 1 ปี โปรดตรวจสอบและตอบกลับ',
          url: '/tenant/contracts',
        });
      } catch {
        // Non-critical — renewal was already created
      }
    }

    return {
      success: true,
      message: `Fired renewal offer ${renewal.id.slice(0, 8)} (tenant notified).`,
      data: { renewal_contract_id: renewal.id, original_contract_id: active.id },
    };
  },

  appeal_penalty: async ({ userId, role }) => {
    const admin = createServiceRoleClient();

    // Find a confirmed penalty on a contract the user owns (as landlord or tenant)
    const column = role === 'landlord' ? 'landlord_id' : 'tenant_id';
    const { data: contracts } = await admin
      .from('contracts')
      .select('id, landlord_id')
      .eq(column, userId);
    const contractIds = (contracts ?? []).map((c) => c.id);
    if (contractIds.length === 0) {
      return { success: false, message: 'No contracts found.' };
    }

    const { data: penalty } = await admin
      .from('penalties')
      .select('id, contract_id')
      .in('contract_id', contractIds)
      .eq('status', 'confirmed')
      .limit(1)
      .single();
    if (!penalty) {
      return {
        success: false,
        message:
          'No confirmed penalty found. Raise a penalty via the contract UI and confirm it first.',
      };
    }

    const { error: updErr } = await admin
      .from('penalties')
      .update({
        status: 'pending_tenant_appeal',
        tenant_appeal_note:
          'Simulation: I believe this penalty was raised in error. Please reconsider the circumstances.',
      } as Record<string, unknown>)
      .eq('id', penalty.id);
    if (updErr) return { success: false, message: updErr.message };

    // Look up the landlord for the affected contract and notify them
    const affectedContract = (contracts ?? []).find((c) => c.id === penalty.contract_id);
    if (affectedContract?.landlord_id) {
      try {
        await sendNotification({
          recipientId: affectedContract.landlord_id,
          type: 'penalty_appeal',
          titleEn: 'Penalty Appealed',
          titleTh: 'มีการอุทธรณ์ค่าปรับ',
          bodyEn: 'A tenant has appealed a penalty. Please review.',
          bodyTh: 'ผู้เช่าได้อุทธรณ์ค่าปรับ กรุณาตรวจสอบ',
          url: '/landlord/penalties',
        });
      } catch {
        // Non-critical — appeal was already saved
      }
    }

    return {
      success: true,
      message: `Appealed penalty ${penalty.id.slice(0, 8)} (landlord notified).`,
      data: { penalty_id: penalty.id },
    };
  },

  advance_maintenance_in_progress: async ({ userId, role }) => {
    if (role !== 'landlord') {
      return { success: false, message: 'Only landlords can advance maintenance status.' };
    }
    const admin = createServiceRoleClient();

    // Find the landlord's contracts, then the first open maintenance request on them
    const { data: contracts } = await admin
      .from('contracts')
      .select('id, tenant_id, properties(name)')
      .eq('landlord_id', userId);
    const contractIds = (contracts ?? []).map((c) => c.id);
    if (contractIds.length === 0) {
      return { success: false, message: 'No contracts found.' };
    }

    const { data: request } = await admin
      .from('maintenance_requests')
      .select('id, contract_id, title')
      .in('contract_id', contractIds)
      .eq('status', 'open')
      .limit(1)
      .single();
    if (!request) {
      return {
        success: false,
        message: 'No open maintenance request. Run "File maintenance request" first.',
      };
    }

    // SLA deadline 3 days from now, random estimated cost ฿500–3500
    const slaDeadline = new Date();
    slaDeadline.setDate(slaDeadline.getDate() + 3);
    const estimatedCost = 500 + Math.floor(Math.random() * 30) * 100;

    const { error: updErr } = await admin
      .from('maintenance_requests')
      .update({
        status: 'in_progress',
        assigned_to: 'Sim Tech (Bangkok Handyman Co.)',
        estimated_cost: estimatedCost,
        sla_deadline: slaDeadline.toISOString(),
      } as Record<string, unknown>)
      .eq('id', request.id);
    if (updErr) return { success: false, message: updErr.message };

    // Notify the tenant that their request is now being worked on
    const affectedContract = (contracts ?? []).find((c) => c.id === request.contract_id) as
      | { tenant_id: string | null; properties: { name: string } | null }
      | undefined;
    if (affectedContract?.tenant_id) {
      try {
        await sendNotification({
          recipientId: affectedContract.tenant_id,
          type: 'maintenance_updated',
          titleEn: 'Maintenance Request In Progress',
          titleTh: 'คำขอซ่อมกำลังดำเนินการ',
          bodyEn: `Your request "${request.title}" is now in progress. A technician has been assigned.`,
          bodyTh: `คำขอ "${request.title}" ของคุณกำลังดำเนินการ ช่างได้รับมอบหมายแล้ว`,
          url: '/tenant/maintenance',
        });
      } catch {
        // Non-critical — status was already advanced
      }
    }

    return {
      success: true,
      message: `Advanced "${request.title}" to in_progress (tenant notified).`,
      data: { maintenance_id: request.id, estimated_cost: estimatedCost },
    };
  },

  trigger_tier_expiry_warning: async ({ userId }) => {
    const admin = createServiceRoleClient();
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
    const { error } = await admin
      .from('profiles')
      .update({ tier: 'pro', tier_expires_at: fiveDaysFromNow.toISOString() })
      .eq('id', userId);
    if (error) return { success: false, message: error.message };

    // Send the warning notification the real 7-day expiry cron would send
    try {
      await sendNotification({
        recipientId: userId,
        type: 'tier_expiry_warning',
        titleEn: 'Pro Plan Expiring Soon',
        titleTh: 'แพ็กเกจ Pro กำลังจะหมดอายุ',
        bodyEn: 'Your Pro plan expires in 5 days. Renew to keep your features.',
        bodyTh: 'แพ็กเกจ Pro ของคุณจะหมดอายุใน 5 วัน ต่ออายุเพื่อรักษาฟีเจอร์ไว้',
        url: '/landlord/billing',
      });
    } catch {
      // Non-critical — profile update succeeded
    }

    return {
      success: true,
      message: 'Set tier_expires_at to 5 days from now (warning notification sent).',
      data: { tier_expires_at: fiveDaysFromNow.toISOString() },
    };
  },

  trigger_tier_downgrade: async ({ userId }) => {
    const admin = createServiceRoleClient();
    // 4 days ago = past the 3-day grace period, so the downgrade cron would fire
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    const { error } = await admin
      .from('profiles')
      .update({ tier: 'free', tier_expires_at: fourDaysAgo.toISOString() })
      .eq('id', userId);
    if (error) return { success: false, message: error.message };

    // Send the downgrade notification the real grace-expiry cron would send
    try {
      await sendNotification({
        recipientId: userId,
        type: 'tier_downgraded',
        titleEn: 'Downgraded to Free',
        titleTh: 'ดาวน์เกรดเป็นแพ็กเกจฟรี',
        bodyEn: 'Your Pro plan grace period has ended. You have been downgraded to the Free tier.',
        bodyTh: 'ช่วงผ่อนผันของแพ็กเกจ Pro สิ้นสุดแล้ว คุณถูกดาวน์เกรดเป็นแพ็กเกจฟรี',
        url: '/landlord/billing',
      });
    } catch {
      // Non-critical — profile update succeeded
    }

    return {
      success: true,
      message: 'Downgraded to free (past grace period). tier_downgraded notification sent.',
      data: { tier: 'free', tier_expires_at: fourDaysAgo.toISOString() },
    };
  },

  simulate_tenant_claim_payment: async ({ userId, role }) => {
    if (role !== 'tenant') {
      return { success: false, message: 'Only tenants can claim payments.' };
    }
    const admin = createServiceRoleClient();

    // Find the tenant's active contract
    const contract = await findContract(userId, 'tenant', ['active']);
    if (!contract) {
      return { success: false, message: 'No active contract found.' };
    }

    // Find the oldest unpaid (pending or overdue) payment on that contract
    const { data: payment, error: payErr } = await admin
      .from('payments')
      .select('id, contract_id')
      .eq('contract_id', contract.id)
      .in('status', ['pending', 'overdue'])
      .order('due_date', { ascending: true })
      .limit(1)
      .single();
    if (payErr || !payment) {
      return { success: false, message: 'No unpaid payments to claim.' };
    }

    // Apply claim — mirrors the logic in POST /api/payments/[id]/claim
    const now = new Date().toISOString();
    const { error: claimErr } = await admin
      .from('payments')
      .update({
        status: 'claimed',
        claimed_by: userId,
        claimed_at: now,
        claimed_note: 'Simulation: payment marked as paid by tenant.',
      } as Record<string, unknown>)
      .eq('id', payment.id);
    if (claimErr) return { success: false, message: claimErr.message };

    // Notify the landlord
    try {
      const { data: contractRow } = await admin
        .from('contracts')
        .select('landlord_id, properties(name)')
        .eq('id', contract.id)
        .single();
      const contractInfo = contractRow as unknown as {
        landlord_id: string | null;
        properties: { name: string } | null;
      } | null;
      if (contractInfo?.landlord_id) {
        const propertyName = contractInfo.properties?.name ?? '';
        await sendNotification({
          recipientId: contractInfo.landlord_id,
          type: 'payment_claimed',
          titleEn: 'Tenant Claimed a Payment',
          titleTh: 'ผู้เช่าแจ้งชำระเงินแล้ว',
          bodyEn: `A tenant has claimed a payment${propertyName ? ` for ${propertyName}` : ''}. Please verify.`,
          bodyTh: `ผู้เช่าแจ้งว่าชำระเงินแล้ว${propertyName ? ` สำหรับ ${propertyName}` : ''} กรุณาตรวจสอบ`,
          url: '/landlord/payments',
        });
      }
    } catch {
      // Non-critical — claim was already saved
    }

    return {
      success: true,
      message: `Payment ${payment.id.slice(0, 8)} claimed (landlord notified).`,
      data: { payment_id: payment.id },
    };
  },

  simulate_due_payment: async ({ userId, role }) => {
    if (role !== 'tenant') {
      return { success: false, message: 'Only tenants can simulate a due payment.' };
    }
    const admin = createServiceRoleClient();

    // 1. Find the tenant's active contract
    const { data: contractRow, error: contractErr } = await admin
      .from('contracts')
      .select('id, monthly_rent, lease_start')
      .eq('tenant_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    if (contractErr) return { success: false, message: contractErr.message };
    if (!contractRow) {
      return {
        success: false,
        message:
          'No active contract found. Ask the landlord to pair a contract with you first (auto_pair_demo_tenant).',
      };
    }

    const contract = contractRow as unknown as {
      id: string;
      monthly_rent: number | null;
      lease_start: string | null;
    };
    const rent = contract.monthly_rent && contract.monthly_rent > 0 ? contract.monthly_rent : 15000;

    // 2. Check whether payments already exist on this contract
    const { data: existingPayments, error: payErr } = await admin
      .from('payments')
      .select('id, due_date, status')
      .eq('contract_id', contract.id)
      .eq('payment_type', 'rent')
      .order('due_date', { ascending: true });
    if (payErr) return { success: false, message: payErr.message };

    // 3. If no payments: seed 12 monthly rows starting from the lease_start month
    let paymentIdToPushOverdue: string | null = null;
    let seeded = 0;
    if (!existingPayments || existingPayments.length === 0) {
      const anchor = contract.lease_start ? new Date(contract.lease_start) : new Date();
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
      paymentIdToPushOverdue = inserted?.[0]?.id ?? null;
    } else {
      // Pick the earliest still-unpaid payment; if none, use the very first row
      const firstUnpaid = existingPayments.find(
        (p) => (p as { status: string }).status !== 'paid'
      ) as { id: string } | undefined;
      paymentIdToPushOverdue = firstUnpaid?.id ?? (existingPayments[0] as { id: string }).id;
    }

    if (!paymentIdToPushOverdue) {
      return { success: false, message: 'Could not determine a payment to mark overdue.' };
    }

    // 4. Push that payment into "overdue" — due 5 days ago
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const overdueDateStr = fiveDaysAgo.toISOString().slice(0, 10);

    const { error: updateErr } = await admin
      .from('payments')
      .update({
        due_date: overdueDateStr,
        status: 'overdue',
      } as Record<string, unknown>)
      .eq('id', paymentIdToPushOverdue);
    if (updateErr) return { success: false, message: updateErr.message };

    return {
      success: true,
      message:
        seeded > 0
          ? `Seeded ${seeded} payments and marked one as overdue (due 5 days ago). Check your payments page.`
          : 'Marked your earliest unpaid payment as overdue (due 5 days ago). Check your payments page.',
      data: {
        contract_id: contract.id,
        payment_id: paymentIdToPushOverdue,
        seeded,
        new_due_date: overdueDateStr,
      },
    };
  },

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

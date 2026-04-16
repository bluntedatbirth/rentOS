import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendNotification } from '@/lib/notifications/send';
import { unauthorized } from '@/lib/apiErrors';
import { activateContract } from '@/lib/contracts/activate';
import { endTenancy } from '@/lib/properties/endTenancy';

/**
 * GET /api/cron/daily
 *
 * Daily cron job (designed for Vercel Cron at 02:00 UTC / 09:00 Bangkok).
 * Handles:
 *  1. Payment due reminders (due within 3 days)
 *  2. Overdue payment status updates and notifications
 *  3. Lease expiry warnings (within 30 days)
 *  4. Auto-apply penalty rules (late_payment triggers)
 *  5. Custom notification rules (landlord-defined)
 */
export async function GET(request: Request) {
  // Auth check: require CRON_SECRET in production
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return unauthorized();
  }

  const supabase = createServiceRoleClient();
  const today = new Date().toISOString().split('T')[0]!; // YYYY-MM-DD
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]!;
  const sixtyDaysFromNow = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]!;

  const summary = {
    paymentDueReminders: 0,
    overdueUpdates: 0,
    leaseExpiryWarnings: 0,
    customRuleNotifications: 0,
    scheduledContractsActivated: 0,
    paymentsSeeded: 0,
    leaseEndTransitions: 0,
    expiredPairingCodesCleared: 0,
    errors: [] as string[],
  };

  // ----------------------------------------------------------------
  // Pre-fetch recent notifications for dedup (replaces per-payment SELECTs)
  // Key: `${recipient_id}:${body}` — same logic as the inline dedup queries below.
  // ----------------------------------------------------------------
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const dedupSet = new Set<string>();
  try {
    const { data: recentNotifs } = await supabase
      .from('notifications')
      .select('recipient_id, body')
      .gte('sent_at', oneDayAgo);

    for (const n of recentNotifs ?? []) {
      if (n.recipient_id && n.body) {
        dedupSet.add(`${n.recipient_id}:${n.body}`);
      }
    }
  } catch (dedupErr) {
    // Non-fatal: log and continue with an empty dedup set (may send duplicates)
    const msg = dedupErr instanceof Error ? dedupErr.message : String(dedupErr);
    console.warn('[Cron] Could not pre-fetch dedup set:', msg);
  }

  // ----------------------------------------------------------------
  // 1. Payment due reminders: pending payments due within 3 days
  // ----------------------------------------------------------------
  try {
    const { data: duePayments, error } = await supabase
      .from('payments')
      .select('id, amount, due_date, contract_id, contracts!inner(tenant_id)')
      .eq('status', 'pending')
      .gte('due_date', today)
      .lte('due_date', threeDaysFromNow);

    if (error) throw error;

    for (const payment of duePayments ?? []) {
      const contract = payment.contracts as unknown as { tenant_id: string | null };
      if (!contract?.tenant_id) continue;

      await sendNotification({
        recipientId: contract.tenant_id,
        type: 'payment_due',
        titleEn: 'Payment Due Soon',
        titleTh: 'ใกล้ถึงกำหนดชำระเงิน',
        bodyEn: `Payment of ${payment.amount} THB is due on ${payment.due_date}.`,
        bodyTh: `ยอดชำระ ${payment.amount} บาท ครบกำหนดวันที่ ${payment.due_date}`,
        url: '/tenant/payments',
        payload: { target_route: 'payments.list' },
      });
      summary.paymentDueReminders++;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    summary.errors.push(`payment_due: ${msg}`);
    console.error('[Cron] Payment due error:', msg);
  }

  // ----------------------------------------------------------------
  // 2. Overdue payments: pending payments past due date
  // ----------------------------------------------------------------
  try {
    const { data: overduePayments, error } = await supabase
      .from('payments')
      .select('id, amount, due_date, contract_id, contracts!inner(tenant_id)')
      .eq('status', 'pending')
      .lt('due_date', today);

    if (error) throw error;

    for (const payment of overduePayments ?? []) {
      // Update status to overdue
      const { error: updateError } = await supabase
        .from('payments')
        .update({ status: 'overdue' as const })
        .eq('id', payment.id);

      if (updateError) {
        summary.errors.push(`overdue_update ${payment.id}: ${updateError.message}`);
        continue;
      }

      const contract = payment.contracts as unknown as { tenant_id: string | null };
      if (!contract?.tenant_id) continue;

      await sendNotification({
        recipientId: contract.tenant_id,
        type: 'payment_overdue',
        titleEn: 'Payment Overdue',
        titleTh: 'ค้างชำระเงิน',
        bodyEn: `Payment of ${payment.amount} THB was due on ${payment.due_date} and is now overdue.`,
        bodyTh: `ยอดชำระ ${payment.amount} บาท ครบกำหนดวันที่ ${payment.due_date} เลยกำหนดชำระแล้ว`,
        url: '/tenant/payments',
        payload: { target_route: 'payments.list' },
      });
      summary.overdueUpdates++;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    summary.errors.push(`payment_overdue: ${msg}`);
    console.error('[Cron] Overdue error:', msg);
  }

  // ----------------------------------------------------------------
  // 2b. Payment penalty notifications: overdue payments past grace period
  //     Fires to the LANDLORD (not the tenant).
  //     Tenant continues to receive 'payment_overdue' from block 2 above.
  //
  // TODO: penalty_grace_days configurability — follow-up sprint.
  //       Currently hardcoded to 7 days (INTERVAL '7 days' equivalent).
  // ----------------------------------------------------------------
  let penaltyNotifications = 0;
  try {
    const graceDays = 7; // hardcoded; see TODO above
    const graceCutoff = new Date(Date.now() - graceDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]!;

    // Fetch overdue payments where due_date + 7 days < now AND penalty_notified_at IS NULL.
    // DD's migration adds penalty_notified_at; this column is expected to exist.
    const { data: penaltyPayments, error: penaltyError } = await supabase
      .from('payments')
      .select(
        'id, amount, due_date, contract_id, contracts!inner(landlord_id, tenant_id, properties(name))'
      )
      .eq('status', 'overdue')
      .lt('due_date', graceCutoff)
      .is('penalty_notified_at', null);

    if (penaltyError) throw penaltyError;

    for (const payment of penaltyPayments ?? []) {
      const contract = payment.contracts as unknown as {
        landlord_id: string | null;
        tenant_id: string | null;
        properties: { name: string } | null;
      };

      if (!contract?.landlord_id) continue;

      const propertyName = contract.properties?.name ?? 'your property';

      // Fetch tenant name for the notification body
      let tenantName = 'Tenant';
      if (contract.tenant_id) {
        const { data: tenantProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', contract.tenant_id)
          .single();
        if (tenantProfile?.full_name) tenantName = tenantProfile.full_name;
      }

      await sendNotification({
        recipientId: contract.landlord_id,
        // DB CHECK constraint accepts 'penalty_raised', not 'payment_penalty'.
        // Previously fired 'payment_penalty' and all inserts silently failed.
        type: 'penalty_raised',
        titleEn: 'Rent payment overdue (penalty)',
        titleTh: 'ค่าเช่าเกินกำหนด (ปรับ)',
        bodyEn: `${tenantName}'s rent for ${propertyName} is past the grace period.`,
        bodyTh: `ค่าเช่าของ ${tenantName} สำหรับ ${propertyName} เกินระยะเวลาผ่อนผัน`,
        url: '/landlord/payments',
        payload: { target_route: 'payments.list' },
      });

      // Mark as notified so cron is idempotent
      await supabase
        .from('payments')
        .update({ penalty_notified_at: new Date().toISOString() })
        .eq('id', payment.id);

      penaltyNotifications++;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    summary.errors.push(`payment_penalty: ${msg}`);
    console.error('[Cron] Payment penalty notification error:', msg);
  }

  // ----------------------------------------------------------------
  // 3. Lease expiry warnings: active contracts ending within 60 days
  // lease_expiry: 60-day warning window (sprint: Landlord Shell Cleanup)
  // ----------------------------------------------------------------
  try {
    const { data: expiringContracts, error } = await supabase
      .from('contracts')
      .select('id, tenant_id, landlord_id, lease_end')
      .eq('status', 'active')
      .gte('lease_end', today)
      .lte('lease_end', sixtyDaysFromNow);

    if (error) throw error;

    for (const contract of expiringContracts ?? []) {
      const daysLeft = Math.ceil(
        (new Date(contract.lease_end!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      // Notify tenant
      if (contract.tenant_id) {
        await sendNotification({
          recipientId: contract.tenant_id,
          type: 'lease_expiry',
          titleEn: 'Lease Expiring Soon',
          titleTh: 'สัญญาเช่าใกล้หมดอายุ',
          bodyEn: `Your lease expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
          bodyTh: `สัญญาเช่าของคุณจะหมดอายุในอีก ${daysLeft} วัน`,
          url: '/tenant/contract/view',
          payload: { target_route: 'contract.view', fallback_route: 'dashboard' },
        });
      }

      // Notify landlord
      if (contract.landlord_id) {
        await sendNotification({
          recipientId: contract.landlord_id,
          type: 'lease_expiry',
          titleEn: 'Tenant Lease Expiring Soon',
          titleTh: 'สัญญาเช่าผู้เช่าใกล้หมดอายุ',
          bodyEn: `A tenant lease expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
          bodyTh: `สัญญาเช่าผู้เช่าจะหมดอายุในอีก ${daysLeft} วัน`,
          url: '/landlord/contracts',
          payload: { target_route: 'contract.list' },
        });
      }

      summary.leaseExpiryWarnings++;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    summary.errors.push(`lease_expiry: ${msg}`);
    console.error('[Cron] Lease expiry error:', msg);
  }

  // ----------------------------------------------------------------
  // 4. Custom notification rules (landlord-defined)
  // ----------------------------------------------------------------
  try {
    interface NotifRule {
      id: string;
      landlord_id: string;
      name: string;
      trigger_type: string;
      days_offset: number;
      message_template: string;
    }
    const { data: rules, error: rulesError } = (await supabase
      .from('notification_rules' as never)
      .select('id, landlord_id, name, trigger_type, days_offset, message_template')
      .eq('is_active', true)) as unknown as { data: NotifRule[] | null; error: Error | null };

    if (rulesError) throw rulesError;

    for (const rule of rules ?? []) {
      try {
        const offsetMs = rule.days_offset * 24 * 60 * 60 * 1000;

        if (rule.trigger_type === 'payment_due') {
          // Find pending payments due exactly days_offset days from now
          const targetDate = new Date(Date.now() + offsetMs).toISOString().split('T')[0]!;
          const { data: payments } = await supabase
            .from('payments')
            .select(
              'id, amount, due_date, contract_id, contracts!inner(tenant_id, landlord_id, properties(name))'
            )
            .eq('status', 'pending')
            .eq('due_date', targetDate);

          for (const payment of payments ?? []) {
            const c = payment.contracts as unknown as {
              tenant_id: string | null;
              landlord_id: string | null;
              properties: { name: string } | null;
            };
            if (c.landlord_id !== rule.landlord_id) continue;
            const recipientId = c.tenant_id;
            if (!recipientId) continue;

            const body = rule.message_template
              .replace('{amount}', String(payment.amount))
              .replace('{due_date}', payment.due_date ?? '')
              .replace('{property_name}', c.properties?.name ?? '')
              .replace('{tenant_name}', '');

            if (dedupSet.has(`${recipientId}:${body}`)) continue;
            dedupSet.add(`${recipientId}:${body}`);

            await sendNotification({
              recipientId,
              type: 'payment_due',
              titleEn: rule.name,
              titleTh: rule.name,
              bodyEn: body,
              bodyTh: body,
              url: '/tenant/payments',
              payload: { target_route: 'payments.list' },
            });
            summary.customRuleNotifications++;
          }
        } else if (rule.trigger_type === 'payment_overdue') {
          // Find overdue payments that became overdue exactly days_offset days ago
          const targetDate = new Date(Date.now() - offsetMs).toISOString().split('T')[0]!;
          const { data: payments } = await supabase
            .from('payments')
            .select(
              'id, amount, due_date, contract_id, contracts!inner(tenant_id, landlord_id, properties(name))'
            )
            .eq('status', 'overdue')
            .eq('due_date', targetDate);

          for (const payment of payments ?? []) {
            const c = payment.contracts as unknown as {
              tenant_id: string | null;
              landlord_id: string | null;
              properties: { name: string } | null;
            };
            if (c.landlord_id !== rule.landlord_id) continue;
            const recipientId = c.tenant_id;
            if (!recipientId) continue;

            const body = rule.message_template
              .replace('{amount}', String(payment.amount))
              .replace('{due_date}', payment.due_date ?? '')
              .replace('{property_name}', c.properties?.name ?? '')
              .replace('{tenant_name}', '');

            if (dedupSet.has(`${recipientId}:${body}`)) continue;
            dedupSet.add(`${recipientId}:${body}`);

            await sendNotification({
              recipientId,
              type: 'payment_overdue',
              titleEn: rule.name,
              titleTh: rule.name,
              bodyEn: body,
              bodyTh: body,
              url: '/tenant/payments',
              payload: { target_route: 'payments.list' },
            });
            summary.customRuleNotifications++;
          }
        } else if (rule.trigger_type === 'lease_expiry') {
          // Find active contracts expiring exactly days_offset days from now
          const targetDate = new Date(Date.now() + offsetMs).toISOString().split('T')[0]!;
          const { data: contracts } = await supabase
            .from('contracts')
            .select('id, tenant_id, landlord_id, lease_end, properties(name)')
            .eq('status', 'active')
            .eq('lease_end', targetDate);

          for (const contract of contracts ?? []) {
            if (contract.landlord_id !== rule.landlord_id) continue;
            const recipientId = contract.tenant_id;
            if (!recipientId) continue;

            const props = contract.properties as unknown as { name: string } | null;
            const body = rule.message_template
              .replace('{due_date}', contract.lease_end ?? '')
              .replace('{property_name}', props?.name ?? '')
              .replace('{amount}', '')
              .replace('{tenant_name}', '');

            if (dedupSet.has(`${recipientId}:${body}`)) continue;
            dedupSet.add(`${recipientId}:${body}`);

            await sendNotification({
              recipientId,
              type: 'lease_expiry',
              titleEn: rule.name,
              titleTh: rule.name,
              bodyEn: body,
              bodyTh: body,
              url: '/tenant/contracts',
              payload: { target_route: 'contract.view', fallback_route: 'dashboard' },
            });
            summary.customRuleNotifications++;
          }
        }
      } catch (ruleErr) {
        const msg = ruleErr instanceof Error ? ruleErr.message : String(ruleErr);
        summary.errors.push(`custom_rule ${rule.id}: ${msg}`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    summary.errors.push(`custom_rules: ${msg}`);
    console.error('[Cron] Custom rules error:', msg);
  }

  // ----------------------------------------------------------------
  // 5. Auto-apply penalty rules: late_payment triggers
  // ----------------------------------------------------------------
  let autoPenaltiesApplied = 0;
  try {
    // Fetch all active auto-apply late_payment rules
    interface PenaltyRule {
      id: string;
      contract_id: string;
      landlord_id: string;
      trigger_days: number;
      penalty_amount: number;
      penalty_description: string;
      clause_id: string | null;
    }
    const { data: rules, error: rulesError } = (await supabase
      .from('penalty_rules' as never)
      .select(
        'id, contract_id, landlord_id, trigger_days, penalty_amount, penalty_description, clause_id'
      )
      .eq('trigger_type', 'late_payment')
      .eq('auto_apply', true)
      .eq('is_active', true)) as unknown as { data: PenaltyRule[] | null; error: Error | null };

    if (rulesError) throw rulesError;

    for (const rule of rules ?? []) {
      try {
        // Calculate the threshold date: payments overdue by at least trigger_days
        const thresholdDate = new Date(Date.now() - rule.trigger_days * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]!;

        // Find overdue payments for this contract older than trigger_days
        const { data: overduePayments, error: paymentsError } = await supabase
          .from('payments')
          .select('id')
          .eq('contract_id', rule.contract_id)
          .eq('status', 'overdue')
          .lte('due_date', thresholdDate);

        if (paymentsError) {
          summary.errors.push(`penalty_rule ${rule.id} payments: ${paymentsError.message}`);
          continue;
        }

        for (const payment of overduePayments ?? []) {
          // Check if a penalty already exists for this payment + rule combo
          const { data: existing } = await supabase
            .from('penalties')
            .select('id')
            .eq('contract_id', rule.contract_id)
            .eq('clause_id', `auto_rule_${rule.id}_pay_${payment.id}`)
            .maybeSingle();

          if (existing) continue;

          // Auto-create penalty
          const { error: insertError } = await supabase.from('penalties').insert({
            contract_id: rule.contract_id,
            clause_id: `auto_rule_${rule.id}_pay_${payment.id}`,
            calculated_amount: rule.penalty_amount,
            description_en:
              rule.penalty_description ?? `Auto-applied late payment penalty (rule: ${rule.id})`,
            description_th: rule.penalty_description ?? `ค่าปรับล่าช้าอัตโนมัติ (กฎ: ${rule.id})`,
            raised_by: rule.landlord_id,
            status: 'pending_landlord_review',
          });

          if (insertError) {
            summary.errors.push(`penalty_rule ${rule.id} insert: ${insertError.message}`);
          } else {
            autoPenaltiesApplied++;
          }
        }
      } catch (ruleErr) {
        const msg = ruleErr instanceof Error ? ruleErr.message : String(ruleErr);
        summary.errors.push(`penalty_rule ${rule.id}: ${msg}`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    summary.errors.push(`auto_penalties: ${msg}`);
    console.error('[Cron] Auto-penalty error:', msg);
  }

  // ----------------------------------------------------------------
  // 6. Auto lease-end transitions: properties past lease_end with an active tenant
  //    Fires the morning AFTER the lease ends (lease_end < today, strictly less).
  //    Guard: current_tenant_id IS NOT NULL ensures idempotency.
  // ----------------------------------------------------------------
  try {
    interface ExpiredPropertyRow {
      id: string;
      name: string;
    }
    const { data: expiredProperties, error: expiredError } = (await supabase
      .from('properties' as never)
      .select('id, name')
      .lt('lease_end', today)
      .not('current_tenant_id', 'is', null)
      .eq('is_active', true)
      .eq('is_shell', false)) as unknown as {
      data: ExpiredPropertyRow[] | null;
      error: Error | null;
    };

    if (expiredError) throw expiredError;

    for (const property of expiredProperties ?? []) {
      try {
        const result = await endTenancy(supabase, property.id);
        if (result.success) {
          summary.leaseEndTransitions++;
          console.log(
            `[Cron] Lease-end auto-transition: property ${property.id} (${property.name}) — former tenant ${result.formerTenantId ?? 'n/a'}`
          );
        }
      } catch (propErr) {
        const msg = propErr instanceof Error ? propErr.message : String(propErr);
        summary.errors.push(`lease_end_transition ${property.id}: ${msg}`);
        console.error(`[Cron] Lease-end transition failed for property ${property.id}:`, msg);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    summary.errors.push(`lease_end_transitions: ${msg}`);
    console.error('[Cron] Lease-end transitions error:', msg);
  }

  // ----------------------------------------------------------------
  // 7b. Expired pairing_code cleanup (Task 2, Sprint 3)
  //
  // contracts.pairing_code / pairing_expires_at are set when a landlord
  // generates a contract-specific pairing code (distinct from the permanent
  // pair_code on properties). When the code expires AND the contract still
  // has no tenant assigned (tenant_id IS NULL), the code is stale and safe
  // to clear. We null out the columns rather than deleting the row so the
  // contract record (and any metadata) is preserved.
  //
  // We intentionally do NOT clear codes where tenant_id IS NOT NULL: if a
  // tenant already redeemed the code the pairing_code column is historical
  // context, not a security surface.
  // ----------------------------------------------------------------
  try {
    const { data: expiredCodes, error: expiredCodesError } = await supabase
      .from('contracts')
      .select('id')
      .not('pairing_code', 'is', null)
      .lt('pairing_expires_at', new Date().toISOString())
      .is('tenant_id', null);

    if (expiredCodesError) throw expiredCodesError;

    if (expiredCodes && expiredCodes.length > 0) {
      const expiredIds = expiredCodes.map((c) => c.id);
      const { error: clearError } = await supabase
        .from('contracts')
        .update({ pairing_code: null, pairing_expires_at: null })
        .in('id', expiredIds);

      if (clearError) throw clearError;

      summary.expiredPairingCodesCleared = expiredIds.length;
      console.log(
        `[Cron] Cleared ${expiredIds.length} expired pairing code(s) from contracts with no tenant`
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    summary.errors.push(`expired_pairing_codes: ${msg}`);
    console.error('[Cron] Expired pairing code cleanup error:', msg);
  }

  // ----------------------------------------------------------------
  // 8. Anthropic spend threshold alerting (log-only, founder visibility)
  // ----------------------------------------------------------------
  let spendAlertUsd = 0;
  try {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const { data: spendRows, error: spendError } = await supabase
      .from('ai_spend_log' as never)
      .select('cost_usd')
      .gte('called_at', monthStart);

    if (spendError) throw spendError;

    const monthTotal = ((spendRows ?? []) as { cost_usd: number }[]).reduce(
      (s, r) => s + r.cost_usd,
      0
    );
    spendAlertUsd = monthTotal;

    if (monthTotal >= 95) {
      console.error(
        `[SPEND_ALERT] Anthropic monthly spend CRITICAL: $${monthTotal.toFixed(4)} of $100 cap`
      );
    } else if (monthTotal >= 80) {
      console.warn(
        `[SPEND_ALERT] Anthropic monthly spend at 80% threshold: $${monthTotal.toFixed(4)} of $100 cap`
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    summary.errors.push(`spend_alert: ${msg}`);
    console.error('[Cron] Spend alert error:', msg);
  }

  // ----------------------------------------------------------------
  // 9. Auto-activate scheduled contracts whose lease_start has arrived
  // ----------------------------------------------------------------
  try {
    const { data: scheduledContracts, error: scheduledError } = await supabase
      .from('contracts')
      .select('id, property_id')
      .eq('status', 'scheduled')
      .lte('lease_start', today);

    if (scheduledError) throw scheduledError;

    for (const sc of scheduledContracts ?? []) {
      const contract = sc as unknown as { id: string; property_id: string };
      try {
        const result = await activateContract(supabase, contract.id);
        if (!result.success) {
          // Could be the 1-active-per-property constraint — log and skip
          console.warn(`[Cron] Skipping scheduled contract ${contract.id}: ${result.error}`);
          summary.errors.push(`scheduled_activate ${contract.id}: ${result.error}`);
        } else {
          summary.scheduledContractsActivated++;
          summary.paymentsSeeded += result.seededCount;
        }
      } catch (contractErr) {
        const msg = contractErr instanceof Error ? contractErr.message : String(contractErr);
        summary.errors.push(`scheduled_activate ${contract.id}: ${msg}`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    summary.errors.push(`scheduled_activation: ${msg}`);
    console.error('[Cron] Scheduled activation error:', msg);
  }

  const fullSummary = {
    ...summary,
    autoPenaltiesApplied,
    penaltyNotifications,
    spendAlertUsd,
  };

  if (summary.errors.length > 0) {
    return NextResponse.json({ summary: fullSummary }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ran_at: new Date().toISOString(), summary: fullSummary });
}

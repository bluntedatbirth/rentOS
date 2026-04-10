import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendNotification } from '@/lib/notifications/send';
import { unauthorized } from '@/lib/apiErrors';
import { activateContract } from '@/lib/contracts/activate';

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
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]!;

  const summary = {
    paymentDueReminders: 0,
    overdueUpdates: 0,
    leaseExpiryWarnings: 0,
    customRuleNotifications: 0,
    scheduledContractsActivated: 0,
    paymentsSeeded: 0,
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
      });
      summary.overdueUpdates++;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    summary.errors.push(`payment_overdue: ${msg}`);
    console.error('[Cron] Overdue error:', msg);
  }

  // ----------------------------------------------------------------
  // 3. Lease expiry warnings: active contracts ending within 30 days
  // ----------------------------------------------------------------
  try {
    const { data: expiringContracts, error } = await supabase
      .from('contracts')
      .select('id, tenant_id, landlord_id, lease_end')
      .eq('status', 'active')
      .gte('lease_end', today)
      .lte('lease_end', thirtyDaysFromNow);

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
  // 6. Pro tier expiry warnings
  // ----------------------------------------------------------------
  let tierExpiryWarnings = 0;
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: expiringProfiles, error: expiryError } = await supabase
      .from('profiles')
      .select('id, tier_expires_at')
      .eq('tier', 'pro')
      .gte('tier_expires_at', now.toISOString())
      .lte('tier_expires_at', sevenDaysFromNow);

    if (expiryError) throw expiryError;

    for (const p of expiringProfiles ?? []) {
      if (!p.tier_expires_at) continue;
      const expiry = new Date(p.tier_expires_at);
      const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Only notify at 7-day and 3-day marks
      if (daysLeft !== 7 && daysLeft !== 3) continue;

      await sendNotification({
        recipientId: p.id,
        type: 'tier_expiry_warning',
        titleEn: 'Pro Plan Expiring',
        titleTh: 'แพลน Pro กำลังจะหมดอายุ',
        bodyEn: `Your Pro plan expires in ${daysLeft} days. Renew to keep your features.`,
        bodyTh: `แพลน Pro ของคุณจะหมดอายุในอีก ${daysLeft} วัน กรุณาต่ออายุเพื่อใช้งานฟีเจอร์ต่อ`,
        url: '/landlord/billing',
      });
      tierExpiryWarnings++;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    summary.errors.push(`tier_expiry_warnings: ${msg}`);
    console.error('[Cron] Tier expiry warning error:', msg);
  }

  // ----------------------------------------------------------------
  // 7. Pro tier expired — downgrade after grace period
  // ----------------------------------------------------------------
  let tierDowngrades = 0;
  try {
    const now = new Date();
    const gracePeriodCutoff = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: expiredProfiles, error: expiredError } = await supabase
      .from('profiles')
      .select('id')
      .eq('tier', 'pro')
      .lt('tier_expires_at', gracePeriodCutoff);

    if (expiredError) throw expiredError;

    for (const p of expiredProfiles ?? []) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          tier: 'free',
          billing_cycle: 'monthly',
          tier_expires_at: null,
          omise_schedule_id: null,
        })
        .eq('id', p.id);

      if (updateError) {
        summary.errors.push(`tier_downgrade ${p.id}: ${updateError.message}`);
        continue;
      }

      await sendNotification({
        recipientId: p.id,
        type: 'tier_downgraded',
        titleEn: 'Pro Plan Expired',
        titleTh: 'แพลน Pro หมดอายุแล้ว',
        bodyEn: 'Your Pro plan has expired and been downgraded to Free.',
        bodyTh: 'แพลน Pro ของคุณหมดอายุแล้วและถูกปรับลดเป็นแพลนฟรี',
        url: '/landlord/billing/upgrade',
      });
      tierDowngrades++;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    summary.errors.push(`tier_downgrades: ${msg}`);
    console.error('[Cron] Tier downgrade error:', msg);
  }

  // ── 7. Daily signing reminders for awaiting_signature contracts ────────────
  let signingReminders = 0;
  try {
    const { data: awaitingContracts } = await supabase
      .from('contracts')
      .select('id, landlord_id, tenant_id, properties(name)')
      .eq('status', 'awaiting_signature');

    for (const c of awaitingContracts ?? []) {
      const contract = c as unknown as {
        id: string;
        landlord_id: string;
        tenant_id: string | null;
        properties: { name: string } | null;
      };
      if (!contract.landlord_id) continue;

      const propertyName = contract.properties?.name ?? 'your property';

      await sendNotification({
        recipientId: contract.landlord_id,
        type: 'renewal_signing_reminder',
        titleEn: 'Renewal Awaiting Signature',
        titleTh: 'สัญญาต่อรอลงนาม',
        bodyEn: `The tenant for ${propertyName} has accepted the renewal. Please sign the physical contract.`,
        bodyTh: `ผู้เช่า ${propertyName} ยอมรับการต่อสัญญาแล้ว กรุณานัดลงนามสัญญา`,
        url: `/contracts/${contract.id}`,
      });
      signingReminders++;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    summary.errors.push(`signing_reminders: ${msg}`);
    console.error('[Cron] Signing reminder error:', msg);
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
    tierExpiryWarnings,
    tierDowngrades,
    signingReminders,
    spendAlertUsd,
  };

  if (summary.errors.length > 0) {
    return NextResponse.json({ summary: fullSummary }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ran_at: new Date().toISOString(), summary: fullSummary });
}

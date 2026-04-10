import { NextResponse } from 'next/server';
import { isDevEndpointAllowed } from '@/lib/devGuard';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// DEV ONLY — wipe current user's test data while preserving auth identity
export async function POST() {
  if (!isDevEndpointAllowed()) return new Response(null, { status: 404 });

  // Read logged-in user from cookie-backed session — do NOT trust client-provided IDs
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const svc = createServiceRoleClient();
  const userId = user.id;
  const deleted: Record<string, number> = {};

  // Fetch user's contract IDs first (needed for contract-scoped deletes)
  const { data: contracts, error: contractFetchError } = await svc
    .from('contracts')
    .select('id')
    .or(`landlord_id.eq.${userId},tenant_id.eq.${userId}`);

  if (contractFetchError) {
    return NextResponse.json(
      { error: `Failed to fetch contracts: ${contractFetchError.message}` },
      { status: 500 }
    );
  }

  const contractIds = (contracts ?? []).map((c) => c.id);

  // Fetch user's property IDs (needed for property-scoped deletes)
  const { data: properties, error: propertyFetchError } = await svc
    .from('properties')
    .select('id')
    .eq('landlord_id', userId);

  if (propertyFetchError) {
    return NextResponse.json(
      { error: `Failed to fetch properties: ${propertyFetchError.message}` },
      { status: 500 }
    );
  }

  const propertyIds = (properties ?? []).map((p) => p.id);

  // ── 1. payments (contract-scoped) ─────────────────────────────────────────
  if (contractIds.length > 0) {
    const { data, error } = await svc
      .from('payments')
      .delete()
      .in('contract_id', contractIds)
      .select('id');
    if (error) {
      return NextResponse.json(
        { error: `Failed to delete payments: ${error.message}` },
        { status: 500 }
      );
    }
    deleted.payments = (data ?? []).length;
  } else {
    deleted.payments = 0;
  }

  // ── 2. penalties (contract-scoped) ────────────────────────────────────────
  if (contractIds.length > 0) {
    const { data, error } = await svc
      .from('penalties')
      .delete()
      .in('contract_id', contractIds)
      .select('id');
    if (error) {
      return NextResponse.json(
        { error: `Failed to delete penalties: ${error.message}` },
        { status: 500 }
      );
    }
    deleted.penalties = (data ?? []).length;
  } else {
    deleted.penalties = 0;
  }

  // ── 3. maintenance_requests (contract-scoped) ─────────────────────────────
  if (contractIds.length > 0) {
    const { data, error } = await svc
      .from('maintenance_requests')
      .delete()
      .in('contract_id', contractIds)
      .select('id');
    if (error) {
      return NextResponse.json(
        { error: `Failed to delete maintenance_requests: ${error.message}` },
        { status: 500 }
      );
    }
    deleted.maintenance_requests = (data ?? []).length;
  } else {
    deleted.maintenance_requests = 0;
  }

  // ── 4. contract_analyses (contract-scoped) ────────────────────────────────
  if (contractIds.length > 0) {
    const { data, error } = await svc
      .from('contract_analyses')
      .delete()
      .in('contract_id', contractIds)
      .select('id');
    if (error) {
      return NextResponse.json(
        { error: `Failed to delete contract_analyses: ${error.message}` },
        { status: 500 }
      );
    }
    deleted.contract_analyses = (data ?? []).length;
  } else {
    deleted.contract_analyses = 0;
  }

  // ── 5. penalty_rules (contract-scoped via landlord_id) ────────────────────
  {
    const { data, error } = await svc
      .from('penalty_rules')
      .delete()
      .eq('landlord_id', userId)
      .select('id');
    if (error) {
      return NextResponse.json(
        { error: `Failed to delete penalty_rules: ${error.message}` },
        { status: 500 }
      );
    }
    deleted.penalty_rules = (data ?? []).length;
  }

  // ── 6. contracts ─────────────────────────────────────────────────────────
  if (contractIds.length > 0) {
    const { data, error } = await svc
      .from('contracts')
      .delete()
      .or(`landlord_id.eq.${userId},tenant_id.eq.${userId}`)
      .select('id');
    if (error) {
      return NextResponse.json(
        { error: `Failed to delete contracts: ${error.message}` },
        { status: 500 }
      );
    }
    deleted.contracts = (data ?? []).length;
  } else {
    deleted.contracts = 0;
  }

  // ── 7. notification_rules ─────────────────────────────────────────────────
  {
    const { data, error } = await svc
      .from('notification_rules')
      .delete()
      .eq('landlord_id', userId)
      .select('id');
    if (error) {
      return NextResponse.json(
        { error: `Failed to delete notification_rules: ${error.message}` },
        { status: 500 }
      );
    }
    deleted.notification_rules = (data ?? []).length;
  }

  // ── 8. property_images (property-scoped) ─────────────────────────────────
  if (propertyIds.length > 0) {
    const { data, error } = await svc
      .from('property_images')
      .delete()
      .in('property_id', propertyIds)
      .select('id');
    if (error) {
      return NextResponse.json(
        { error: `Failed to delete property_images: ${error.message}` },
        { status: 500 }
      );
    }
    deleted.property_images = (data ?? []).length;
  } else {
    deleted.property_images = 0;
  }

  // ── 9. documents (landlord_id column confirmed from migration) ────────────
  {
    const { data, error } = await svc
      .from('documents')
      .delete()
      .eq('landlord_id', userId)
      .select('id');
    if (error) {
      return NextResponse.json(
        { error: `Failed to delete documents: ${error.message}` },
        { status: 500 }
      );
    }
    deleted.documents = (data ?? []).length;
  }

  // ── 10. contract_templates (user custom only, not system) ─────────────────
  {
    const { data, error } = await svc
      .from('contract_templates')
      .delete()
      .eq('landlord_id', userId)
      .or('is_system.eq.false,is_system.is.null')
      .select('id');
    if (error) {
      return NextResponse.json(
        { error: `Failed to delete contract_templates: ${error.message}` },
        { status: 500 }
      );
    }
    deleted.contract_templates = (data ?? []).length;
  }

  // ── 11. properties ────────────────────────────────────────────────────────
  if (propertyIds.length > 0) {
    const { data, error } = await svc
      .from('properties')
      .delete()
      .eq('landlord_id', userId)
      .select('id');
    if (error) {
      return NextResponse.json(
        { error: `Failed to delete properties: ${error.message}` },
        { status: 500 }
      );
    }
    deleted.properties = (data ?? []).length;
  } else {
    deleted.properties = 0;
  }

  // ── 12. notifications ─────────────────────────────────────────────────────
  {
    const { data, error } = await svc
      .from('notifications')
      .delete()
      .eq('recipient_id', userId)
      .select('id');
    if (error) {
      return NextResponse.json(
        { error: `Failed to delete notifications: ${error.message}` },
        { status: 500 }
      );
    }
    deleted.notifications = (data ?? []).length;
  }

  // ── 13. slot_purchases (optional — migration may not be applied yet) ─────
  try {
    const { data, error } = await svc
      .from('slot_purchases')
      .delete()
      .eq('user_id', userId)
      .select('id');
    if (error) {
      console.warn('[reset-my-data] slot_purchases skip:', error.message);
    } else {
      deleted.slot_purchases = (data ?? []).length;
    }
  } catch (e) {
    console.warn('[reset-my-data] slot_purchases exception:', e);
  }

  // ── 14. translation_reports (optional table — skip if missing) ────────────
  try {
    const { data, error } = await svc
      .from('translation_reports')
      .delete()
      .eq('user_id', userId)
      .select('id');
    if (error) {
      // 42P01 = relation does not exist; any error on optional table → skip
      console.warn('[reset-my-data] translation_reports skip:', error.message);
    } else {
      deleted.translation_reports = (data ?? []).length;
    }
  } catch (e) {
    console.warn('[reset-my-data] translation_reports exception:', e);
  }

  // ── 15. ai_spend_log (optional table — skip if missing) ───────────────────
  try {
    const { data, error } = await svc
      .from('ai_spend_log')
      .delete()
      .eq('user_id', userId)
      .select('id');
    if (error) {
      console.warn('[reset-my-data] ai_spend_log skip:', error.message);
    } else {
      deleted.ai_spend_log = (data ?? []).length;
    }
  } catch (e) {
    console.warn('[reset-my-data] ai_spend_log exception:', e);
  }

  // ── 16. ai_rate_limits (optional table — skip if missing) ─────────────────
  try {
    const { data, error } = await svc
      .from('ai_rate_limits')
      .delete()
      .eq('user_id', userId)
      .select('id');
    if (error) {
      console.warn('[reset-my-data] ai_rate_limits skip:', error.message);
    } else {
      deleted.ai_rate_limits = (data ?? []).length;
    }
  } catch (e) {
    console.warn('[reset-my-data] ai_rate_limits exception:', e);
  }

  // ── 17. Reset profile counters (preserve identity columns) ────────────────
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  // First try with purchased_slots (only present if slot migration is applied)
  const { error: profileError } = await svc
    .from('profiles')
    .update({
      purchased_slots: 0,
      tier: 'pro',
      tier_expires_at: oneYearFromNow.toISOString(),
    })
    .eq('id', userId);

  if (profileError) {
    // purchased_slots column may not exist yet — retry without it
    const { error: profileFallbackError } = await svc
      .from('profiles')
      .update({
        tier: 'pro',
        tier_expires_at: oneYearFromNow.toISOString(),
      })
      .eq('id', userId);

    if (profileFallbackError) {
      return NextResponse.json(
        { error: `Failed to reset profile: ${profileFallbackError.message}` },
        { status: 500 }
      );
    }
    console.warn('[reset-my-data] profile reset without purchased_slots (column not yet migrated)');
  }

  return NextResponse.json({ ok: true, deleted });
}

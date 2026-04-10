import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isDevEndpointAllowed } from '@/lib/devGuard';

// DEV ONLY — run schema migrations using raw SQL via service role
export async function POST() {
  if (!isDevEndpointAllowed()) return new Response(null, { status: 404 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Use the Supabase SQL endpoint (available via management API)
  // Since we can't run DDL through PostgREST, we'll use the pg_net approach
  // or create helper columns through the PostgREST PATCH approach

  // Actually, let's try using the Supabase client to test if columns exist
  // and report what needs to be added manually
  const adminClient = createClient(supabaseUrl, serviceKey);

  const checks: { column: string; table: string; exists: boolean }[] = [];

  // Check profiles.notification_preferences
  const { error: e1 } = await adminClient
    .from('profiles')
    .select('notification_preferences')
    .limit(1);
  checks.push({ table: 'profiles', column: 'notification_preferences', exists: !e1 });

  // Check contracts.pairing_code
  const { error: e2 } = await adminClient.from('contracts').select('pairing_code').limit(1);
  checks.push({ table: 'contracts', column: 'pairing_code', exists: !e2 });

  // Check contracts.co_tenants
  const { error: e3 } = await adminClient.from('contracts').select('co_tenants').limit(1);
  checks.push({ table: 'contracts', column: 'co_tenants', exists: !e3 });

  const missing = checks.filter((c) => !c.exists);

  if (missing.length === 0) {
    return NextResponse.json({ status: 'all columns exist', checks });
  }

  return NextResponse.json({
    status: 'columns missing — run the SQL below in Supabase Dashboard > SQL Editor',
    missing,
    sql: `-- Run this in Supabase Dashboard > SQL Editor
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{}'::jsonb;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS pairing_code text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS pairing_expires_at timestamptz;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS co_tenants jsonb DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS idx_contracts_pairing_code ON contracts(pairing_code) WHERE pairing_code IS NOT NULL;`,
  });
}

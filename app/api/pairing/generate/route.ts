import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, unauthorized, badRequest } from '@/lib/supabase/api';
import type { Database } from '@/lib/supabase/types';

const schema = z.object({
  contract_id: z.string().uuid(),
});

// Generate a one-time pairing code for a contract
export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest('Invalid contract_id');

  const adminClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify landlord owns this contract
  const { data: contract } = await adminClient
    .from('contracts')
    .select('id, landlord_id, tenant_id')
    .eq('id', parsed.data.contract_id)
    .single();

  if (!contract || contract.landlord_id !== user.id) {
    return badRequest('Contract not found or not owned by you');
  }

  // Generate a 6-character alphanumeric code
  const code = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .substring(0, 6)
    .toUpperCase();

  // Store in pairing_codes table (or use contracts table)
  // For simplicity, we'll use a dedicated pairing approach via a temp table
  // Store as a JSON field on the contract for now
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min expiry

  await adminClient
    .from('contracts')
    .update({
      pairing_code: code,
      pairing_expires_at: expiresAt,
    } as Record<string, unknown>)
    .eq('id', parsed.data.contract_id);

  return NextResponse.json({
    code,
    contract_id: parsed.data.contract_id,
    expires_at: expiresAt,
  });
}

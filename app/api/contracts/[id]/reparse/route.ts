import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, notFound, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { reparseContractText } from '@/lib/claude/extractContract';
import { checkRateLimit, logAISpend } from '@/lib/rateLimit/persistent';
import type { StructuredClause } from '@/lib/supabase/types';

/**
 * POST /api/contracts/[id]/reparse
 * Re-parse a contract's raw_text_th into fresh structured_clauses via AI.
 * Used to backfill renewals that were created before the reparse logic existed.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Persistent rate limit: 5/hour, 10/day per user
  const rl = await checkRateLimit(user.id, 'reparse', 5, 10);
  if (!rl.allowed) {
    console.warn('[rateLimit] reparse blocked, reason:', rl.reason, 'user:', user.id);
    return new Response(
      JSON.stringify({ error: 'ai_unavailable', retryAfterSeconds: rl.retryAfterSeconds }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rl.retryAfterSeconds),
        },
      }
    );
  }

  const admin = createServiceRoleClient();

  // Fetch the contract
  const { data: contract, error: fetchError } = await admin
    .from('contracts')
    .select('id, landlord_id, tenant_id, raw_text_th')
    .eq('id', params.id)
    .single();

  if (fetchError || !contract) {
    return notFound('Contract not found');
  }

  // Only landlord or tenant of this contract can trigger reparse
  if (contract.landlord_id !== user.id && contract.tenant_id !== user.id) {
    return unauthorized();
  }

  if (!contract.raw_text_th) {
    return NextResponse.json({ error: 'No contract text to parse' }, { status: 400 });
  }

  try {
    const clauses = await reparseContractText(contract.raw_text_th, (usage) => {
      void logAISpend(user.id, 'reparse', usage.input_tokens, usage.output_tokens);
    });

    if (!Array.isArray(clauses) || clauses.length === 0) {
      return serverError('AI returned no clauses');
    }

    // Update the contract's structured_clauses
    const { error: updateError } = await admin
      .from('contracts')
      .update({ structured_clauses: clauses as StructuredClause[] })
      .eq('id', params.id);

    if (updateError) {
      console.error('[Reparse] Update failed:', updateError.message);
      return serverError('Failed to save reparsed clauses');
    }

    return NextResponse.json({ success: true, clause_count: clauses.length });
  } catch (e) {
    console.error('[Reparse] Failed:', e);
    return serverError('Failed to re-parse contract clauses');
  }
}

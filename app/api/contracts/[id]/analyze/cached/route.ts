import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any };

interface CachedAnalysis {
  risks: unknown;
  missing_clauses: unknown;
  summary_en: string | null;
  summary_th: string | null;
  clause_ratings: unknown;
  analyzed_at: string;
}

/**
 * GET /api/contracts/[id]/analyze/cached
 *
 * Returns the cached analysis for this contract if one exists, else 404.
 * Used by the UI on mount so the user never sees the "Run AI Analysis"
 * button for a contract that's already been analysed.
 *
 * Does NOT trigger any Claude call — purely a DB read.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Ownership check via session client (RLS-enforced)
  const { data: contract, error: contractErr } = await supabase
    .from('contracts')
    .select('id, landlord_id')
    .eq('id', params.id)
    .single();

  if (contractErr || !contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  }
  if (contract.landlord_id !== user.id) {
    return unauthorized();
  }

  const serviceClient = createServiceRoleClient();

  const { data: cached } = (await (serviceClient as unknown as AnyClient)
    .from('contract_analyses')
    .select('risks, missing_clauses, summary_en, summary_th, clause_ratings, analyzed_at')
    .eq('contract_id', params.id)
    .single()) as { data: CachedAnalysis | null };

  if (!cached) {
    return NextResponse.json({ error: 'No cached analysis' }, { status: 404 });
  }

  return NextResponse.json({
    ...cached,
    from_cache: true,
  });
}

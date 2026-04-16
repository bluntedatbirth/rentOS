import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized } from '@/lib/supabase/api';

/**
 * GET /api/contracts/[id]/parse-status
 *
 * Lightweight polling endpoint used by the client to recover from dropped
 * SSE streams (e.g. mobile screen lock kills the connection mid-parse).
 * The Vercel OCR function keeps running server-side regardless of the
 * client connection — on unlock, the browser polls this endpoint to find
 * out what actually happened.
 *
 * Returns { status: 'parsing' | 'done' | 'parse_failed', progress: number }
 * where `parsing` means the parse is still in flight, `done` means it
 * succeeded (contract status is active/expired/scheduled), and
 * `parse_failed` means it explicitly failed.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // RLS-enforced ownership check via session client
  const { data: contract, error } = await supabase
    .from('contracts')
    .select('id, landlord_id, status, structured_clauses')
    .eq('id', params.id)
    .single();

  if (error || !contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  }
  if (contract.landlord_id !== user.id) {
    return unauthorized();
  }

  const status = contract.status as string | null;
  // Terminal success states (set by OCR route on successful parse)
  const isDone = status === 'active' || status === 'expired' || status === 'scheduled';
  const isFailed = status === 'parse_failed';

  return NextResponse.json({
    status: isDone ? 'done' : isFailed ? 'parse_failed' : 'parsing',
    progress: isDone ? 100 : 0,
  });
}

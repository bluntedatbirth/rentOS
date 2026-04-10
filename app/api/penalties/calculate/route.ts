import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from '@/lib/supabase/api';
import { calculatePenalty } from '@/lib/claude/calculatePenalty';
import { checkRateLimit, logAISpend } from '@/lib/rateLimit/persistent';

const calculateSchema = z.object({
  contract_id: z.string().uuid(),
  clause_id: z.string().min(1),
  violation_description: z.string().min(1).max(5000),
});

export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Persistent rate limit: 20/hour, 50/day per user
  const rl = await checkRateLimit(user.id, 'penalty-calculate', 20, 50);
  if (!rl.allowed) {
    console.warn('[rateLimit] penalty-calculate blocked, reason:', rl.reason, 'user:', user.id);
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

  const body: unknown = await request.json();
  const parsed = calculateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { contract_id, clause_id, violation_description } = parsed.data;

  // Fetch contract and verify ownership
  const { data: contract, error: fetchError } = await supabase
    .from('contracts')
    .select('id, landlord_id, structured_clauses, monthly_rent, lease_start, lease_end')
    .eq('id', contract_id)
    .single();

  if (fetchError || !contract) {
    return notFound('Contract not found');
  }

  if (contract.landlord_id !== user.id) {
    return unauthorized();
  }

  // Find the specific clause
  const clauses = (contract.structured_clauses ?? []) as Array<{
    clause_id: string;
    title_th: string;
    title_en: string;
    text_th: string;
    text_en: string;
    penalty_defined: boolean;
    penalty_amount: number | null;
    penalty_description: string | null;
  }>;

  const clause = clauses.find((c) => c.clause_id === clause_id);
  if (!clause) {
    return badRequest('Clause not found in contract');
  }

  try {
    const result = await calculatePenalty(
      {
        clause_text_th: clause.text_th,
        clause_text_en: clause.text_en,
        clause_title_th: clause.title_th,
        clause_title_en: clause.title_en,
        penalty_amount: clause.penalty_amount,
        penalty_description: clause.penalty_description,
        violation_description,
        monthly_rent: contract.monthly_rent as number | null,
        lease_start: contract.lease_start as string | null,
        lease_end: contract.lease_end as string | null,
      },
      (usage) => {
        void logAISpend(user.id, 'penalty-calculate', usage.input_tokens, usage.output_tokens);
      }
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to calculate penalty';
    return serverError(message);
  }
}

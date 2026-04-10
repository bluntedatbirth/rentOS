import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from '@/lib/supabase/api';
import { checkRateLimit, logAISpend } from '@/lib/rateLimit/persistent';
import { answerContractQuestion, StructuredClause } from '@/lib/claude/contractQA';

const qaSchema = z.object({
  question: z.string().min(1).max(2000),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Persistent rate limit: 20/hour, 60/day per user
  const rl = await checkRateLimit(user.id, 'qa', 20, 60);
  if (!rl.allowed) {
    console.warn('[rateLimit] qa blocked, reason:', rl.reason, 'user:', user.id);
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
  const parsed = qaSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { question } = parsed.data;

  // Fetch contract — RLS ensures only landlord or tenant can see it
  const { data: contract, error: fetchError } = await supabase
    .from('contracts')
    .select('id, landlord_id, tenant_id, raw_text_th, translated_text_en, structured_clauses')
    .eq('id', params.id)
    .single();

  if (fetchError || !contract) {
    return notFound('Contract not found');
  }

  // Explicit auth check: must be landlord or tenant on this contract
  if (contract.landlord_id !== user.id && contract.tenant_id !== user.id) {
    return unauthorized();
  }

  // Determine user language from accept-language header or default to 'en'
  const acceptLang = request.headers.get('accept-language') ?? '';
  const userLanguage: 'th' | 'en' = acceptLang.startsWith('th') ? 'th' : 'en';

  const clauses = (contract.structured_clauses ?? []) as StructuredClause[];

  try {
    const result = await answerContractQuestion(
      {
        question,
        contractText_th: (contract.raw_text_th as string) ?? '',
        contractText_en: (contract.translated_text_en as string) ?? '',
        clauses,
        userLanguage,
      },
      (usage) => {
        void logAISpend(user.id, 'qa', usage.input_tokens, usage.output_tokens);
      }
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to answer question';
    return serverError(message);
  }
}

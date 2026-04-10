import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit, logAISpend } from '@/lib/rateLimit/persistent';
import { suggestClauses } from '@/lib/claude/suggestClauses';

const suggestSchema = z.object({
  propertyType: z.string().min(1),
  leaseTermMonths: z.number().int().min(1),
  monthlyRent: z.number().min(0),
  existingClauses: z.array(z.string()).default([]),
  language: z.enum(['th', 'en', 'both']).default('both'),
});

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Persistent rate limit: 10/hour, 20/day per user
  const rl = await checkRateLimit(user.id, 'suggest-clauses', 10, 20);
  if (!rl.allowed) {
    console.warn('[rateLimit] suggest-clauses blocked, reason:', rl.reason, 'user:', user.id);
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

  // Auth: must be landlord
  const adminClient = createServiceRoleClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'landlord') {
    return unauthorized();
  }

  const body: unknown = await request.json();
  const parsed = suggestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  try {
    const result = await suggestClauses(parsed.data, (usage) => {
      void logAISpend(user.id, 'suggest-clauses', usage.input_tokens, usage.output_tokens);
    });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to suggest clauses';
    return serverError(message);
  }
}

import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
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

  // Rate limit: 5 suggestions per minute
  const rl = rateLimit(`suggest-clauses:${user.id}`, 5, 60000);
  if (!rl.success) return rateLimitResponse();

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
    const result = await suggestClauses(parsed.data);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to suggest clauses';
    return serverError(message);
  }
}

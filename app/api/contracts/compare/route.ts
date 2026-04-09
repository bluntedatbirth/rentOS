import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { compareContracts } from '@/lib/claude/compareContracts';

const compareRequestSchema = z.object({
  contract1_id: z.string().uuid(),
  contract2_id: z.string().uuid(),
  language: z.enum(['th', 'en']).default('en'),
});

export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Rate limit: 3 comparisons per minute
  const { success } = rateLimit(`compare:${user.id}`, 3, 60000);
  if (!success) return rateLimitResponse();

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const parsed = compareRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { contract1_id, contract2_id, language } = parsed.data;

  if (contract1_id === contract2_id) {
    return badRequest('contract1_id and contract2_id must be different contracts');
  }

  // Check the requesting user is a landlord
  const adminClient = createServiceRoleClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'landlord') {
    return unauthorized();
  }

  // Fetch both contracts — RLS ensures the landlord can only see their own.
  // We use the user-scoped client so RLS applies; both must be owned by this landlord.
  const [result1, result2] = await Promise.all([
    supabase
      .from('contracts')
      .select('id, landlord_id, raw_text_th, translated_text_en, structured_clauses')
      .eq('id', contract1_id)
      .single(),
    supabase
      .from('contracts')
      .select('id, landlord_id, raw_text_th, translated_text_en, structured_clauses')
      .eq('id', contract2_id)
      .single(),
  ]);

  if (result1.error || !result1.data) {
    return notFound(`Contract 1 not found or access denied (id: ${contract1_id})`);
  }

  if (result2.error || !result2.data) {
    return notFound(`Contract 2 not found or access denied (id: ${contract2_id})`);
  }

  // Belt-and-suspenders: verify both contracts belong to the requesting landlord
  if (result1.data.landlord_id !== user.id || result2.data.landlord_id !== user.id) {
    return unauthorized();
  }

  try {
    const comparisonResult = await compareContracts({
      contract1: {
        text_th: result1.data.raw_text_th ?? '',
        text_en: result1.data.translated_text_en ?? '',
        clauses: Array.isArray(result1.data.structured_clauses)
          ? result1.data.structured_clauses
          : [],
      },
      contract2: {
        text_th: result2.data.raw_text_th ?? '',
        text_en: result2.data.translated_text_en ?? '',
        clauses: Array.isArray(result2.data.structured_clauses)
          ? result2.data.structured_clauses
          : [],
      },
      language,
    });

    return NextResponse.json(comparisonResult);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Contract comparison failed';
    return serverError(message);
  }
}

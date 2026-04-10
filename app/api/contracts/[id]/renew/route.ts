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
import { sendNotification } from '@/lib/notifications/send';
import { reparseContractText } from '@/lib/claude/extractContract';
import { checkRateLimit, logAISpend } from '@/lib/rateLimit/persistent';

const renewSchema = z.object({
  lease_start: z.string().min(1),
  lease_end: z.string().min(1),
  monthly_rent: z.number().positive().optional(),
  security_deposit: z.number().nonnegative().optional(),
  changes_summary: z.string().optional(),
  contract_text: z.string().max(200_000).optional(),
});

interface ContractRow {
  id: string;
  landlord_id: string;
  tenant_id: string | null;
  property_id: string;
  monthly_rent: number | null;
  security_deposit: number | null;
  lease_start: string | null;
  lease_end: string | null;
  structured_clauses: unknown;
  raw_text_th: string | null;
  translated_text_en: string | null;
  status: string;
  original_file_url: string | null;
  file_type: string | null;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = renewSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { lease_start, lease_end, monthly_rent, security_deposit, changes_summary, contract_text } =
    parsed.data;

  const admin = createServiceRoleClient();

  // Load the existing contract
  const { data: originalRaw, error: fetchError } = await admin
    .from('contracts')
    .select(
      'id, landlord_id, tenant_id, property_id, monthly_rent, security_deposit, ' +
        'lease_start, lease_end, structured_clauses, raw_text_th, translated_text_en, status, ' +
        'original_file_url, file_type'
    )
    .eq('id', params.id)
    .single();

  if (fetchError || !originalRaw) {
    return notFound('Contract not found');
  }

  const original = originalRaw as unknown as ContractRow;

  // Only the landlord may propose a renewal
  if (original.landlord_id !== user.id) {
    return unauthorized();
  }

  // Resolve final values (fall back to originals when not provided)
  const newMonthlyRent = monthly_rent ?? original.monthly_rent ?? undefined;
  const newSecurityDeposit = security_deposit ?? original.security_deposit ?? undefined;

  // Build renewal_changes — only include fields that actually differ
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  if (lease_start !== original.lease_start) {
    changes.lease_start = { old: original.lease_start, new: lease_start };
  }
  if (lease_end !== original.lease_end) {
    changes.lease_end = { old: original.lease_end, new: lease_end };
  }
  if (newMonthlyRent !== undefined && newMonthlyRent !== original.monthly_rent) {
    changes.monthly_rent = { old: original.monthly_rent, new: newMonthlyRent };
  }
  if (newSecurityDeposit !== undefined && newSecurityDeposit !== original.security_deposit) {
    changes.security_deposit = { old: original.security_deposit, new: newSecurityDeposit };
  }
  if (changes_summary) {
    changes.summary = { old: null, new: changes_summary };
  }

  // Detect contract text changes (AI fixes, added clauses, manual edits)
  if (contract_text && contract_text !== original.raw_text_th) {
    changes.contract_text = { old: null, new: 'modified' };
  }

  // If contract text was modified, re-parse structured clauses via AI
  const textChanged = contract_text && contract_text !== original.raw_text_th;
  let newClauses = original.structured_clauses;
  if (textChanged) {
    // Persistent rate limit: 5/hour, 10/day per user (matches reparse route)
    // Only gates the Claude path — unchanged-text renewals are not rate-limited.
    const rl = await checkRateLimit(user.id, 'renew', 5, 10);
    if (!rl.allowed) {
      console.warn('[rateLimit] renew blocked, reason:', rl.reason, 'user:', user.id);
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

    try {
      newClauses = await reparseContractText(contract_text, (usage) => {
        void logAISpend(user.id, 'renew', usage.input_tokens, usage.output_tokens);
      });
      if (!Array.isArray(newClauses) || newClauses.length === 0) {
        console.error('[Renew] AI returned empty clauses, failing explicitly');
        return serverError('Failed to re-parse updated contract clauses. Please try again.');
      }
    } catch (e) {
      console.error('[Renew] Failed to re-parse clauses:', e);
      return serverError('Failed to re-parse updated contract clauses. Please try again.');
    }
  }

  // Create the renewal contract (tenant must accept → status 'pending')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertPayload: Record<string, any> = {
    property_id: original.property_id,
    landlord_id: original.landlord_id,
    tenant_id: original.tenant_id,
    status: 'pending',
    renewed_from: original.id,
    renewal_changes: Object.keys(changes).length > 0 ? changes : null,
    lease_start,
    lease_end,
    monthly_rent: newMonthlyRent ?? null,
    security_deposit: newSecurityDeposit ?? null,
    structured_clauses: newClauses,
    raw_text_th: contract_text ?? original.raw_text_th,
    translated_text_en: original.translated_text_en,
    original_file_url: original.original_file_url,
    file_type: original.file_type,
  };

  const { data: renewal, error: insertError } = await admin
    .from('contracts')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(insertPayload as any)
    .select()
    .single();

  if (insertError || !renewal) {
    console.error('[Renew] Insert failed:', insertError?.message);
    return serverError('Failed to create renewal contract');
  }

  // Notify the tenant
  if (original.tenant_id) {
    const hasChanges = Object.keys(changes).length > 0;
    const changeNote = hasChanges
      ? ` (${Object.keys(changes)
          .filter((k) => k !== 'summary')
          .join(', ')} updated)`
      : '';

    await sendNotification({
      recipientId: original.tenant_id,
      type: 'lease_renewal_offer',
      titleEn: 'Lease Renewal Offer',
      titleTh: 'ข้อเสนอต่อสัญญาเช่า',
      bodyEn: `Your landlord has proposed a lease renewal${changeNote}.`,
      bodyTh: `เจ้าของห้องเสนอต่อสัญญาเช่า${changeNote}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      url: `/contracts/${(renewal as any).id}`,
    });
  }

  return NextResponse.json(renewal, { status: 201 });
}

/**
 * DELETE /api/contracts/[id]/renew
 * Withdraw (unsend) a pending renewal contract.
 * [id] is the renewal contract's own id. Only the landlord can withdraw,
 * and only while the contract is still 'pending'.
 */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const admin = createServiceRoleClient();

  const { data: contractRaw, error: fetchError } = await admin
    .from('contracts')
    .select('id, landlord_id, tenant_id, status, renewed_from')
    .eq('id', params.id)
    .single();

  if (fetchError || !contractRaw) {
    return notFound('Contract not found');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contract = contractRaw as any;

  // Only the landlord can withdraw
  if (contract.landlord_id !== user.id) {
    return unauthorized();
  }

  // Must be a pending renewal
  if (contract.status !== 'pending' || !contract.renewed_from) {
    return badRequest('This contract is not a pending renewal and cannot be withdrawn');
  }

  // Delete the renewal contract entirely — it was unsent, no need to keep it
  const { error: deleteError } = await admin.from('contracts').delete().eq('id', contract.id);

  if (deleteError) {
    console.error('[Renew] Withdraw failed:', deleteError.message);
    return serverError('Failed to withdraw renewal');
  }

  // No tenant notification — withdrawal may be an accidental send correction

  return NextResponse.json({ success: true });
}

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAuthenticatedUser, unauthorized, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requirePro } from '@/lib/tier';
import { withRetry } from '@/lib/claude/retry';
import { trackTokenUsage } from '@/lib/claude/tokenTracker';
import {
  checkRateLimit,
  incrementRateLimit,
  isRateLimitBypassed,
  logAISpend,
} from '@/lib/rateLimit/persistent';
import { getAILimits } from '@/lib/ai/limits';
import type { StructuredClause } from '@/lib/supabase/types';

// Analysis runs a single Claude call with up to 16384 output tokens — can
// take 60–120s on large contracts. Allow 5 minutes to match OCR route.
export const maxDuration = 300;

const client = new Anthropic();

// Typed shape for cached analysis row (projected columns only)
interface CachedAnalysis {
  risks: AnalysisResult['risks'];
  missing_clauses: AnalysisResult['missing_clauses'];
  summary_en: string | null;
  summary_th: string | null;
  clause_ratings: AnalysisResult['clause_ratings'];
  analyzed_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any };

interface AnalysisResult {
  risks: Array<{
    clause_id: string;
    severity: 'low' | 'medium' | 'high';
    description_en: string;
    description_th: string;
    suggested_text_th: string | null;
    suggested_text_en: string | null;
  }>;
  missing_clauses: Array<{
    title_en: string;
    title_th: string;
    clause_text_en: string;
    clause_text_th: string;
    reason_en: string;
    reason_th: string;
  }>;
  summary_en: string;
  summary_th: string;
  clause_ratings: Array<{
    clause_id: string;
    rating: string;
  }>;
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Per-user daily AI limit scales with property slots (2× slots, min 2 slots).
  // Count properties the user owns to size the budget.
  const budgetClient = createServiceRoleClient();
  const { count: propertyCount } = await budgetClient
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('landlord_id', user.id);

  const limits = getAILimits(propertyCount ?? 0);

  // Dev/test bypass — skip ALL rate limit checks
  const bypassed = isRateLimitBypassed(user.id) || isRateLimitBypassed(user.email ?? '');

  // skipIncrement so only SUCCESSFUL analyses count — we increment after the
  // analysis parses + caches cleanly.
  const rl = bypassed
    ? ({ allowed: true } as const)
    : await checkRateLimit(user.id, 'analyze', limits.hourlyAnalyze, limits.dailyAnalyze, {
        skipIncrement: true,
      });
  if (!rl.allowed) {
    console.warn('[rateLimit] analyze blocked, reason:', rl.reason, 'user:', user.id);
    return new Response(
      JSON.stringify({
        error: 'ai_unavailable',
        reason: rl.reason,
        retryAfterSeconds: rl.retryAfterSeconds,
        dailyLimit: limits.dailyAnalyze,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rl.retryAfterSeconds),
        },
      }
    );
  }

  // Pro feature gate
  const profile = await supabase.from('profiles').select('tier').eq('id', user.id).single();

  const tier = profile.data?.tier ?? 'free';
  const tierCheck = requirePro(tier, 'contract_analysis');
  if (!tierCheck.allowed) {
    return NextResponse.json(
      { error: 'Pro plan required for AI contract analysis', upgradeUrl: tierCheck.upgradeUrl },
      { status: 403 }
    );
  }

  const serviceClient = budgetClient;

  // Fetch the contract (verify ownership)
  const { data: contract, error: contractError } = await serviceClient
    .from('contracts')
    .select('id, landlord_id, structured_clauses')
    .eq('id', params.id)
    .single();

  if (contractError || !contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  }

  if (contract.landlord_id !== user.id) {
    return unauthorized();
  }

  // JSONB column populated by analyze pipeline — always StructuredClause[] when present
  const clauses: StructuredClause[] =
    (contract.structured_clauses as unknown as StructuredClause[]) ?? [];

  // Check cache first — return existing analysis if present
  const { data: cached } = (await (serviceClient as unknown as AnyClient)
    .from('contract_analyses')
    .select('risks, missing_clauses, summary_en, summary_th, clause_ratings, analyzed_at')
    .eq('contract_id', params.id)
    .single()) as { data: CachedAnalysis | null; error: unknown };

  // Idempotency: one successful analysis per contract. If a cached row
  // exists (regardless of schema vintage), always return it and never
  // re-run Claude. This prevents users from spamming the endpoint and
  // from burning AI spend on repeat requests.
  if (cached) {
    return NextResponse.json({
      risks: cached.risks,
      missing_clauses: cached.missing_clauses,
      summary_en: cached.summary_en,
      summary_th: cached.summary_th,
      clause_ratings: cached.clause_ratings,
      analyzed_at: cached.analyzed_at,
      from_cache: true,
    });
  }

  if (clauses.length === 0) {
    return NextResponse.json(
      { error: 'Contract has no structured clauses to analyze' },
      { status: 400 }
    );
  }

  // Build a compact clause summary for the prompt
  const clauseSummary = clauses
    .map(
      (c) =>
        `[${c.clause_id}] ${c.title_en ?? c.title_th ?? 'Untitled'}: ${c.text_en ?? c.text_th ?? ''}`
    )
    .join('\n\n');

  let response: Anthropic.Message;
  try {
    response = await withRetry(() =>
      client.messages.create({
        // Sonnet 4.5 was consistently hitting the Vercel 300s ceiling on
        // bilingual contracts with 10+ clauses. Haiku 4.5 completes the same
        // analysis in <60s at acceptable quality for risk/rating detection.
        model: 'claude-haiku-4-5',
        // Output can be large: full Thai+English replacement text per risk +
        // full ready-to-insert clauses per missing clause + bilingual summary.
        max_tokens: 16384,
        messages: [
          {
            role: 'user',
            content: `You are a Thai rental contract legal analyst specializing in Thai Civil and Commercial Code (Sections 537–571) and OCPB 2025 consumer protection regulations.

Analyze the following Thai rental contract clauses and return a JSON analysis object. Be thorough but fair — assess both landlord and tenant risks.

CONTRACT CLAUSES:
${clauseSummary}

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "risks": [
    {
      "clause_id": "<clause_id from above or 'general' if contract-wide>",
      "severity": "low|medium|high",
      "description_en": "<clear English description of the risk>",
      "description_th": "<คำอธิบายเป็นภาษาไทยที่ชัดเจน>",
      "suggested_text_th": "<FULL replacement Thai clause text that fixes this risk, written in formal Thai contract language. null if clause_id is 'general' or no fix needed>",
      "suggested_text_en": "<FULL replacement English clause text that fixes this risk, matching the contract's style. null if clause_id is 'general' or no fix needed>"
    }
  ],
  "missing_clauses": [
    {
      "title_en": "<name of the missing clause in English>",
      "title_th": "<ชื่อข้อสัญญาที่ขาดเป็นภาษาไทย>",
      "clause_text_th": "<FULL ready-to-insert Thai legal clause text, written in formal Thai contract language matching the style of the existing clauses above. This must be actual contract text, NOT a description.>",
      "clause_text_en": "<FULL ready-to-insert English clause text, matching the style and formality of the existing English clauses above. This must be actual contract text, NOT a description.>",
      "reason_en": "<1 sentence: why this clause is important>",
      "reason_th": "<1 ประโยค: ทำไมข้อสัญญานี้จึงสำคัญ>"
    }
  ],
  "summary_en": "<3-5 sentence plain-language summary of what this contract covers, its key terms, and overall balance>",
  "summary_th": "<สรุปสัญญา 3-5 ประโยคในภาษาไทยที่เข้าใจง่าย>",
  "clause_ratings": [
    {
      "clause_id": "<clause_id>",
      "rating": "standard|favorable_landlord|favorable_tenant|unusual"
    }
  ]
}

Risk detection guidelines:
- Flag clauses with unusual, one-sided, or potentially illegal terms under Thai law
- HIGH severity: violates OCPB 2025 mandatory tenant rights, illegal penalty amounts, no deposit return timeline
- MEDIUM severity: vague maintenance responsibilities, missing notice periods, unclear utility billing
- LOW severity: minor ambiguities, missing but non-critical terms
- Missing standard clauses to check: security deposit return timeline, maintenance responsibility division, termination conditions, force majeure, dispute resolution, governing law, move-in inspection

IMPORTANT for risks:
- suggested_text_th and suggested_text_en must be COMPLETE replacement clause text that fixes the identified risk
- The replacement text should keep the original clause's intent but fix the problematic parts
- Write in the same formal legal style as the existing clause
- Set to null only for 'general' risks that don't apply to a specific clause
- The text should be the FULL clause body (not just the changed part), ready to replace the original clause text entirely

IMPORTANT for missing_clauses:
- clause_text_th and clause_text_en must be ACTUAL contract clause text ready to insert into the contract, NOT descriptions or recommendations
- Write them in the same formal legal style as the existing clauses
- They should be complete, enforceable clause text that a landlord can add directly to the contract
- Match the tone and formality of the existing clauses above`,
          },
        ],
      })
    );
  } catch (err) {
    console.error('[analyzeContract] Claude API error:', err);
    return serverError('Failed to analyze contract with AI');
  }

  if (response.usage) {
    trackTokenUsage('analyzeContract', {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    });
    void logAISpend(user.id, 'analyze', response.usage.input_tokens, response.usage.output_tokens);
  }

  // If Claude hit the max_tokens ceiling, the JSON is almost certainly
  // truncated mid-object and JSON.parse will fail. Surface a specific
  // error so we can tell truncation apart from genuine malformed output.
  if (response.stop_reason === 'max_tokens') {
    console.error(
      '[analyzeContract] Response truncated at max_tokens',
      'output_tokens=',
      response.usage?.output_tokens
    );
    return serverError(
      'Analysis result was too long to complete. Please try again — if this keeps happening the contract may be too large.'
    );
  }

  const textContent = response.content.find((b) => b.type === 'text');
  const rawText = textContent && 'text' in textContent ? textContent.text.trim() : '';

  let analysis: AnalysisResult;
  try {
    // Strip markdown code fences and any surrounding text
    let jsonText = rawText;
    // Remove ```json ... ``` wrappers (greedy across lines)
    const fenceMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/i);
    if (fenceMatch?.[1]) {
      jsonText = fenceMatch[1];
    }
    // If still not valid JSON, try to extract the first { ... } block
    if (!jsonText.trimStart().startsWith('{')) {
      const braceStart = jsonText.indexOf('{');
      const braceEnd = jsonText.lastIndexOf('}');
      if (braceStart !== -1 && braceEnd > braceStart) {
        jsonText = jsonText.slice(braceStart, braceEnd + 1);
      }
    }
    analysis = JSON.parse(jsonText) as AnalysisResult;
  } catch (parseErr) {
    // Log the FULL raw response (not sliced) so we can see whether Claude
    // was truncated, wrapped its JSON in unexpected prose, or produced
    // invalid Thai-escaping. Vercel keeps function logs for a few days.
    console.error('[analyzeContract] Failed to parse Claude response');
    console.error('[analyzeContract] stop_reason:', response.stop_reason);
    console.error('[analyzeContract] output_tokens:', response.usage?.output_tokens);
    console.error('[analyzeContract] parse error:', parseErr);
    console.error('[analyzeContract] raw text (full):', rawText);
    return serverError('AI returned an invalid analysis format. Please try again.');
  }

  // Persist to cache (contract_analyses not yet in generated Database type, cast to bypass)
  const { error: insertError } = (await (serviceClient as unknown as AnyClient)
    .from('contract_analyses')
    .upsert({
      contract_id: params.id,
      risks: analysis.risks,
      missing_clauses: analysis.missing_clauses,
      summary_en: analysis.summary_en,
      summary_th: analysis.summary_th,
      clause_ratings: analysis.clause_ratings,
      analyzed_at: new Date().toISOString(),
    })) as { error: { message: string } | null };

  if (insertError) {
    console.error('[analyzeContract] Failed to cache analysis:', insertError.message);
    // Non-fatal — still return the result
  }

  // Count this successful analysis against the daily limit. Fire-and-forget.
  void incrementRateLimit(user.id, 'analyze');

  return NextResponse.json({
    ...analysis,
    analyzed_at: new Date().toISOString(),
    from_cache: false,
  });
}

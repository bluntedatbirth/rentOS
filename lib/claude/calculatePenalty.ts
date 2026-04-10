import Anthropic from '@anthropic-ai/sdk';
import { penaltyCalculationSchema } from './schemas';
import { withRetry } from './retry';
import { trackTokenUsage } from './tokenTracker';

const client = new Anthropic();

export interface PenaltyCalculationInput {
  clause_text_th: string;
  clause_text_en: string;
  clause_title_th: string;
  clause_title_en: string;
  penalty_amount: number | null;
  penalty_description: string | null;
  violation_description: string;
  monthly_rent: number | null;
  lease_start: string | null;
  lease_end: string | null;
}

export interface PenaltyCalculationResult {
  calculated_amount: number;
  calculation_basis_th: string;
  calculation_basis_en: string;
  severity: 'minor' | 'moderate' | 'severe';
  manual_review_required?: boolean;
  warnings?: string[];
}

export async function calculatePenalty(
  input: PenaltyCalculationInput,
  onUsage?: (usage: { input_tokens: number; output_tokens: number }) => void
): Promise<PenaltyCalculationResult> {
  let response: Anthropic.Message;
  try {
    response = await withRetry(() =>
      client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a Thai rental contract penalty calculation specialist.

Given a contract clause and a violation description, calculate the appropriate penalty amount.

CONTRACT DETAILS:
- Monthly Rent: ${input.monthly_rent ? `${input.monthly_rent} THB` : 'Not specified'}
- Lease Period: ${input.lease_start ?? 'N/A'} to ${input.lease_end ?? 'N/A'}

CLAUSE (Thai): ${input.clause_title_th}
${input.clause_text_th}

CLAUSE (English): ${input.clause_title_en}
${input.clause_text_en}

${input.penalty_amount ? `Defined Penalty Amount: ${input.penalty_amount} THB` : ''}
${input.penalty_description ? `Penalty Description: ${input.penalty_description}` : ''}

VIOLATION DESCRIPTION:
${input.violation_description}

Calculate the penalty based on:
1. If a specific penalty amount is defined in the clause, use that as the basis
2. If no specific amount, calculate based on the severity and standard Thai rental law practices
3. Consider the monthly rent as context for proportional penalties

Return ONLY valid JSON with no markdown or preamble:
{
  "calculated_amount": <number in THB>,
  "calculation_basis_th": "<explanation in Thai of how the amount was calculated>",
  "calculation_basis_en": "<explanation in English of how the amount was calculated>",
  "severity": "<minor | moderate | severe>"
}`,
              },
            ],
          },
        ],
      })
    );
  } catch (error) {
    // Task 3 fallback: return "manual review required" instead of crashing
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[calculatePenalty] Claude API call failed:', errorMessage);
    return {
      calculated_amount: 0,
      calculation_basis_th: 'ไม่สามารถคำนวณค่าปรับอัตโนมัติได้ กรุณาตรวจสอบด้วยตนเอง',
      calculation_basis_en: 'Automatic penalty calculation failed. Manual review is required.',
      severity: 'moderate',
      manual_review_required: true,
      warnings: [`Claude API error: ${errorMessage}`],
    };
  }

  // Track token usage
  if (response.usage) {
    trackTokenUsage('calculatePenalty', {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    });
    onUsage?.({
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    });
  }

  const textContent = response.content.find((block) => block.type === 'text');
  let rawText = textContent && 'text' in textContent ? textContent.text : '{}';

  // Strip markdown code fences if present
  rawText = rawText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error('[calculatePenalty] Failed to parse Claude response as JSON');
    return {
      calculated_amount: 0,
      calculation_basis_th: 'ผลการคำนวณจาก AI อยู่ในรูปแบบที่ไม่ถูกต้อง กรุณาตรวจสอบด้วยตนเอง',
      calculation_basis_en: 'AI response was in an unexpected format. Manual review is required.',
      severity: 'moderate',
      manual_review_required: true,
      warnings: ['Failed to parse Claude response as JSON'],
    };
  }

  // Validate through Zod schema
  const result = penaltyCalculationSchema.safeParse(parsed);

  if (result.success) {
    return result.data as PenaltyCalculationResult;
  }

  // Validation failed -- attempt partial extraction with manual review flag
  console.warn(
    '[calculatePenalty] Zod validation failed:',
    result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
  );

  const obj = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as Record<
    string,
    unknown
  >;
  const warnings = result.error.issues.map(
    (i) => `Validation error at "${i.path.join('.')}": ${i.message}`
  );

  return {
    calculated_amount: typeof obj.calculated_amount === 'number' ? obj.calculated_amount : 0,
    calculation_basis_th:
      typeof obj.calculation_basis_th === 'string'
        ? obj.calculation_basis_th
        : 'ผลการคำนวณไม่สมบูรณ์ กรุณาตรวจสอบด้วยตนเอง',
    calculation_basis_en:
      typeof obj.calculation_basis_en === 'string'
        ? obj.calculation_basis_en
        : 'Calculation result was incomplete. Manual review is required.',
    severity: isValidSeverity(obj.severity) ? obj.severity : 'moderate',
    manual_review_required: true,
    warnings,
  };
}

function isValidSeverity(value: unknown): value is 'minor' | 'moderate' | 'severe' {
  return value === 'minor' || value === 'moderate' || value === 'severe';
}

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { withRetry } from './retry';
import { trackTokenUsage } from './tokenTracker';

const client = new Anthropic();

// ─── Parameter Types ─────────────────────────────────────────────────────────

export interface CompareContractsParams {
  contract1: { text_th: string; text_en: string; clauses: unknown[] };
  contract2: { text_th: string; text_en: string; clauses: unknown[] };
  language: 'th' | 'en';
}

// ─── Return Types ────────────────────────────────────────────────────────────

export interface ContractDifference {
  category: string;
  contract1_summary_th: string;
  contract1_summary_en: string;
  contract2_summary_th: string;
  contract2_summary_en: string;
  recommendation_th: string;
  recommendation_en: string;
}

export interface CompareContractsResult {
  differences: ContractDifference[];
  overall_assessment_th: string;
  overall_assessment_en: string;
}

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const contractDifferenceSchema = z.object({
  category: z.string(),
  contract1_summary_th: z.string(),
  contract1_summary_en: z.string(),
  contract2_summary_th: z.string(),
  contract2_summary_en: z.string(),
  recommendation_th: z.string(),
  recommendation_en: z.string(),
});

const compareContractsSchema = z.object({
  differences: z.array(contractDifferenceSchema),
  overall_assessment_th: z.string(),
  overall_assessment_en: z.string(),
});

// ─── Main Function ───────────────────────────────────────────────────────────

export async function compareContracts(
  params: CompareContractsParams
): Promise<CompareContractsResult> {
  const { contract1, contract2, language } = params;

  // Prepare clause summaries for the prompt
  const summariseClauses = (clauses: unknown[]): string => {
    if (!Array.isArray(clauses) || clauses.length === 0) return 'No structured clauses available.';
    return clauses
      .map((c, i) => {
        const clause = c as Record<string, unknown>;
        const id = typeof clause.clause_id === 'string' ? clause.clause_id : `c${i + 1}`;
        const titleEn = typeof clause.title_en === 'string' ? clause.title_en : '';
        const category = typeof clause.category === 'string' ? clause.category : 'other';
        const textEn = typeof clause.text_en === 'string' ? clause.text_en.slice(0, 200) : '';
        return `[${id}] (${category}) ${titleEn}: ${textEn}${textEn.length >= 200 ? '…' : ''}`;
      })
      .join('\n');
  };

  const contract1Preview = contract1.text_en.slice(0, 3000);
  const contract2Preview = contract2.text_en.slice(0, 3000);
  const contract1Clauses = summariseClauses(contract1.clauses);
  const contract2Clauses = summariseClauses(contract2.clauses);

  const languageNote =
    language === 'th'
      ? 'The user prefers Thai. Ensure the Thai summaries and recommendations are detailed and the English versions are accurate translations.'
      : 'The user prefers English. Ensure English summaries and recommendations are detailed and the Thai versions are accurate translations.';

  let response: Anthropic.Message;
  try {
    response = await withRetry(() =>
      client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a Thai rental contract legal specialist with deep knowledge of:
- Thai Civil and Commercial Code (Book III, Title VI: Hire of Property, Sections 537-571)
- Thai Condominium Act B.E. 2522
- Thai tenant and landlord rights and obligations
- Standard Thai residential lease agreements (สัญญาเช่าที่อยู่อาศัย)

Compare the following two rental contracts clause by clause and identify all material differences.

${languageNote}

CONTRACT 1 TEXT (English preview):
${contract1Preview}

CONTRACT 1 STRUCTURED CLAUSES:
${contract1Clauses}

CONTRACT 2 TEXT (English preview):
${contract2Preview}

CONTRACT 2 STRUCTURED CLAUSES:
${contract2Clauses}

INSTRUCTIONS:
1. Identify all material differences between the two contracts across these categories:
   - payment (rent amount, due date, late fees)
   - deposit (security deposit, pet deposit, refund conditions)
   - maintenance (responsibilities, response times)
   - pets (allowance, deposits, rules)
   - subletting (permissions, conditions)
   - utilities (inclusion, sub-metering, rates)
   - noise (quiet hours, restrictions)
   - penalties (specific penalty clauses, amounts)
   - renewal (auto-renewal, notice periods, rent escalation)
   - termination (early termination, notice periods, penalties)
   - other (any other material differences)
2. For each difference found:
   - Summarise the relevant provision in BOTH contracts in Thai and English
   - Provide a recommendation referencing Thai law where relevant
   - Indicate which contract is more favourable and to whom (landlord or tenant)
3. Provide an overall assessment in both Thai and English covering:
   - Which contract is more balanced/fair overall
   - Key risks for the landlord under each contract
   - Key risks for the tenant under each contract
   - Any clauses that may be unenforceable under Thai law (cite relevant sections)

Return ONLY valid JSON — no markdown, no preamble:
{
  "differences": [
    {
      "category": "<category>",
      "contract1_summary_th": "<Thai summary of Contract 1 provision>",
      "contract1_summary_en": "<English summary of Contract 1 provision>",
      "contract2_summary_th": "<Thai summary of Contract 2 provision>",
      "contract2_summary_en": "<English summary of Contract 2 provision>",
      "recommendation_th": "<Thai recommendation citing Thai law where relevant>",
      "recommendation_en": "<English recommendation citing Thai law where relevant>"
    }
  ],
  "overall_assessment_th": "<Comprehensive Thai assessment>",
  "overall_assessment_en": "<Comprehensive English assessment>"
}`,
              },
            ],
          },
        ],
      })
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[compareContracts] Claude API call failed:', errorMessage);
    return {
      differences: [],
      overall_assessment_th: `ไม่สามารถเปรียบเทียบสัญญาได้: ${errorMessage} กรุณาลองใหม่อีกครั้ง`,
      overall_assessment_en: `Failed to compare contracts: ${errorMessage}. Please try again.`,
    };
  }

  // Track token usage
  if (response.usage) {
    trackTokenUsage('compareContracts', {
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
    console.error('[compareContracts] Failed to parse Claude response as JSON');
    return {
      differences: [],
      overall_assessment_th: 'ไม่สามารถแยกวิเคราะห์คำตอบจากระบบ AI ได้ กรุณาลองใหม่อีกครั้ง',
      overall_assessment_en: 'Failed to parse AI response. Please try again.',
    };
  }

  // Validate through Zod schema
  const result = compareContractsSchema.safeParse(parsed);

  if (result.success) {
    return result.data;
  }

  // Validation failed — attempt best-effort partial extraction
  console.warn(
    '[compareContracts] Zod validation failed:',
    result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
  );

  const obj = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as Record<
    string,
    unknown
  >;

  const differences: ContractDifference[] = [];
  if (Array.isArray(obj.differences)) {
    for (const d of obj.differences) {
      if (typeof d !== 'object' || d === null) continue;
      const diff = d as Record<string, unknown>;
      differences.push({
        category: typeof diff.category === 'string' ? diff.category : 'other',
        contract1_summary_th:
          typeof diff.contract1_summary_th === 'string' ? diff.contract1_summary_th : '',
        contract1_summary_en:
          typeof diff.contract1_summary_en === 'string' ? diff.contract1_summary_en : '',
        contract2_summary_th:
          typeof diff.contract2_summary_th === 'string' ? diff.contract2_summary_th : '',
        contract2_summary_en:
          typeof diff.contract2_summary_en === 'string' ? diff.contract2_summary_en : '',
        recommendation_th: typeof diff.recommendation_th === 'string' ? diff.recommendation_th : '',
        recommendation_en: typeof diff.recommendation_en === 'string' ? diff.recommendation_en : '',
      });
    }
  }

  return {
    differences,
    overall_assessment_th:
      typeof obj.overall_assessment_th === 'string'
        ? obj.overall_assessment_th
        : 'ไม่สามารถสร้างการประเมินโดยรวมได้',
    overall_assessment_en:
      typeof obj.overall_assessment_en === 'string'
        ? obj.overall_assessment_en
        : 'Could not generate overall assessment.',
  };
}

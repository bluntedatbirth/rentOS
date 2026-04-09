import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { withRetry } from './retry';
import { trackTokenUsage } from './tokenTracker';

const client = new Anthropic();

// ─── Types ─────────────────────────────────────────────────────────

export interface SuggestClausesParams {
  propertyType: string;
  leaseTermMonths: number;
  monthlyRent: number;
  existingClauses: string[]; // category names already covered
  language: 'th' | 'en' | 'both';
}

export interface ClauseSuggestion {
  title_th: string;
  title_en: string;
  text_th: string;
  text_en: string;
  category: string;
  rationale_th: string;
  rationale_en: string;
}

export interface SuggestClausesResult {
  suggestions: ClauseSuggestion[];
}

// ─── Zod Schema ────────────────────────────────────────────────────

const clauseSuggestionSchema = z.object({
  title_th: z.string(),
  title_en: z.string(),
  text_th: z.string(),
  text_en: z.string(),
  category: z.string(),
  rationale_th: z.string(),
  rationale_en: z.string(),
});

const suggestClausesSchema = z.object({
  suggestions: z.array(clauseSuggestionSchema),
});

// ─── Main Function ─────────────────────────────────────────────────

export async function suggestClauses(params: SuggestClausesParams): Promise<SuggestClausesResult> {
  const {
    propertyType,
    leaseTermMonths,
    monthlyRent,
    existingClauses,
    language: _language,
  } = params;

  const existingNote =
    existingClauses.length > 0
      ? `The following clause categories are ALREADY covered and should NOT be suggested again: ${existingClauses.join(', ')}`
      : 'No clauses have been added yet.';

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
                text: `You are a Thai rental contract legal specialist with expertise in:
- Thai Civil and Commercial Code (Book III, Title VI: Hire of Property, Sections 537-571)
- Thai Condominium Act B.E. 2522
- Standard Thai residential lease agreements (สัญญาเช่าที่อยู่อาศัย)

A landlord is creating a rental contract and needs clause suggestions.

PROPERTY DETAILS:
- Property Type: ${propertyType}
- Lease Term: ${leaseTermMonths} months
- Monthly Rent: ${monthlyRent.toLocaleString()} THB

${existingNote}

INSTRUCTIONS:
1. Suggest 3-6 relevant clauses that would strengthen this rental contract.
2. Each clause should be practical and legally sound under Thai law.
3. Reference relevant sections of the Thai Civil and Commercial Code where appropriate.
4. Provide each clause in BOTH Thai and English regardless of the language preference.
5. For each suggestion, explain the rationale (why this clause is important) in both Thai and English.
6. Use categories like: payment, deposit, maintenance, pets, subletting, utilities, noise, penalties, renewal, termination, insurance, inspection, modifications, parking, other.
7. Do NOT suggest clauses for categories that are already covered.

Return ONLY valid JSON with no markdown or preamble:
{
  "suggestions": [
    {
      "title_th": "<clause title in Thai>",
      "title_en": "<clause title in English>",
      "text_th": "<full clause text in formal Thai legal language>",
      "text_en": "<full clause text in formal English legal language>",
      "category": "<category>",
      "rationale_th": "<why this clause matters, in Thai>",
      "rationale_en": "<why this clause matters, in English>"
    }
  ]
}`,
              },
            ],
          },
        ],
      })
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[suggestClauses] Claude API call failed:', errorMessage);
    return { suggestions: [] };
  }

  // Track token usage
  if (response.usage) {
    trackTokenUsage('suggestClauses', {
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
    console.error('[suggestClauses] Failed to parse Claude response as JSON');
    return { suggestions: [] };
  }

  // Validate through Zod schema
  const result = suggestClausesSchema.safeParse(parsed);

  if (result.success) {
    return result.data;
  }

  // Validation failed -- attempt partial extraction
  console.warn(
    '[suggestClauses] Zod validation failed:',
    result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
  );

  const obj = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as Record<
    string,
    unknown
  >;

  if (Array.isArray(obj.suggestions)) {
    const partialSuggestions: ClauseSuggestion[] = obj.suggestions
      .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
      .map((s) => ({
        title_th: typeof s.title_th === 'string' ? s.title_th : '',
        title_en: typeof s.title_en === 'string' ? s.title_en : '',
        text_th: typeof s.text_th === 'string' ? s.text_th : '',
        text_en: typeof s.text_en === 'string' ? s.text_en : '',
        category: typeof s.category === 'string' ? s.category : 'other',
        rationale_th: typeof s.rationale_th === 'string' ? s.rationale_th : '',
        rationale_en: typeof s.rationale_en === 'string' ? s.rationale_en : '',
      }));
    return { suggestions: partialSuggestions };
  }

  return { suggestions: [] };
}

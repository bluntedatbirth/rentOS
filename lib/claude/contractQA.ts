import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { withRetry } from './retry';
import { trackTokenUsage } from './tokenTracker';

const client = new Anthropic();

// ─── Types ─────────────────────────────────────────────────────────

export interface StructuredClause {
  clause_id: string;
  title_th: string;
  title_en: string;
  text_th: string;
  text_en: string;
  category: string;
}

export interface ContractQAParams {
  question: string;
  contractText_th: string;
  contractText_en: string;
  clauses: StructuredClause[];
  userLanguage: 'th' | 'en';
}

export interface ContractQAResult {
  answer_th: string;
  answer_en: string;
  relevant_clauses: string[]; // clause IDs
  confidence: 'high' | 'medium' | 'low';
}

// ─── Zod Schema ────────────────────────────────────────────────────

const contractQASchema = z.object({
  answer_th: z.string(),
  answer_en: z.string(),
  relevant_clauses: z.array(z.string()),
  confidence: z.enum(['high', 'medium', 'low']),
});

// ─── Main Function ─────────────────────────────────────────────────

export async function answerContractQuestion(params: ContractQAParams): Promise<ContractQAResult> {
  const { question, contractText_th, contractText_en, clauses, userLanguage } = params;

  const clausesSummary = clauses
    .map(
      (c) =>
        `[${c.clause_id}] ${c.title_th} / ${c.title_en}\n  TH: ${c.text_th}\n  EN: ${c.text_en}`
    )
    .join('\n\n');

  let response: Anthropic.Message;
  try {
    response = await withRetry(() =>
      client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a bilingual Thai/English rental contract expert. A tenant or landlord is asking a question about their rental contract.

FULL CONTRACT TEXT (Thai):
${contractText_th}

FULL CONTRACT TEXT (English):
${contractText_en}

STRUCTURED CLAUSES:
${clausesSummary}

USER'S PREFERRED LANGUAGE: ${userLanguage === 'th' ? 'Thai' : 'English'}

QUESTION:
${question}

Instructions:
1. Answer the question based ONLY on the contract text and clauses provided above.
2. Provide the answer in BOTH Thai and English regardless of the user's preferred language.
3. Cite specific clause IDs (e.g., "c1", "c2") that are relevant to your answer.
4. Indicate your confidence level:
   - "high" if the contract clearly addresses the question
   - "medium" if the contract partially addresses it or requires interpretation
   - "low" if the contract does not directly address it and the answer is inferred
5. If the contract does not address the question at all, say so clearly and set confidence to "low".

Return ONLY valid JSON with no markdown or preamble:
{
  "answer_th": "<answer in Thai>",
  "answer_en": "<answer in English>",
  "relevant_clauses": ["c1", "c3"],
  "confidence": "high"
}`,
              },
            ],
          },
        ],
      })
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[contractQA] Claude API call failed:', errorMessage);
    return {
      answer_th: 'ไม่สามารถตอบคำถามได้ในขณะนี้ กรุณาลองใหม่อีกครั้งหรือติดต่อเจ้าของห้อง',
      answer_en:
        'Unable to answer your question at this time. Please try again or contact your landlord.',
      relevant_clauses: [],
      confidence: 'low',
    };
  }

  // Track token usage
  if (response.usage) {
    trackTokenUsage('contractQA', {
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
    console.error('[contractQA] Failed to parse Claude response as JSON');
    return {
      answer_th: 'ผลตอบกลับจาก AI อยู่ในรูปแบบที่ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง',
      answer_en: 'AI response was in an unexpected format. Please try again.',
      relevant_clauses: [],
      confidence: 'low',
    };
  }

  // Validate through Zod schema
  const result = contractQASchema.safeParse(parsed);

  if (result.success) {
    return result.data;
  }

  // Validation failed -- attempt partial extraction
  console.warn(
    '[contractQA] Zod validation failed:',
    result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
  );

  const obj = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as Record<
    string,
    unknown
  >;

  return {
    answer_th: typeof obj.answer_th === 'string' ? obj.answer_th : 'ไม่สามารถตอบคำถามได้',
    answer_en: typeof obj.answer_en === 'string' ? obj.answer_en : 'Unable to answer question.',
    relevant_clauses: Array.isArray(obj.relevant_clauses)
      ? obj.relevant_clauses.filter((c): c is string => typeof c === 'string')
      : [],
    confidence:
      obj.confidence === 'high' || obj.confidence === 'medium' || obj.confidence === 'low'
        ? obj.confidence
        : 'low',
  };
}

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export interface ExtractedContract {
  raw_text_th: string;
  translated_text_en: string;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  security_deposit: number | null;
  clauses: {
    clause_id: string;
    title_th: string;
    title_en: string;
    text_th: string;
    text_en: string;
    category:
      | 'payment'
      | 'deposit'
      | 'maintenance'
      | 'pets'
      | 'subletting'
      | 'utilities'
      | 'noise'
      | 'penalties'
      | 'renewal'
      | 'termination'
      | 'other';
    penalty_defined: boolean;
    penalty_amount: number | null;
    penalty_currency: string | null;
    penalty_description: string | null;
  }[];
}

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp';

export async function extractAndTranslateContract(
  fileBase64: string,
  mimeType: ImageMediaType | 'application/pdf'
): Promise<ExtractedContract> {
  const contentBlock: Anthropic.ContentBlockParam =
    mimeType === 'application/pdf'
      ? {
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: 'application/pdf' as const,
            data: fileBase64,
          },
        }
      : {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: mimeType,
            data: fileBase64,
          },
        };

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          contentBlock,
          {
            type: 'text',
            text: `You are a Thai rental contract specialist and legal translator.

Extract ALL text from this contract. Then:
1. Return the full raw Thai text exactly as written.
2. Translate it accurately to English (legal register, precise).
3. Parse into individual clauses. For each clause return:
   - clause_id: "c1", "c2", etc.
   - title_th / title_en
   - text_th / text_en
   - category: payment | deposit | maintenance | pets | subletting |
               utilities | noise | penalties | renewal | termination | other
   - penalty_defined: boolean
   - penalty_amount: number (THB) or null
   - penalty_currency: "THB" or null
   - penalty_description: string or null

Return ONLY valid JSON — no markdown, no preamble:
{
  "raw_text_th": "...",
  "translated_text_en": "...",
  "lease_start": "YYYY-MM-DD or null",
  "lease_end": "YYYY-MM-DD or null",
  "monthly_rent": number or null,
  "security_deposit": number or null,
  "clauses": [...]
}`,
          },
        ],
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === 'text');
  const rawText = textContent && 'text' in textContent ? textContent.text : '{}';

  return JSON.parse(rawText) as ExtractedContract;
}

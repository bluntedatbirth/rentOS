import Anthropic from '@anthropic-ai/sdk';
import { extractedContractSchema, type FieldConfidence, type DocumentComplexity } from './schemas';
import { withRetry } from './retry';
import { trackTokenUsage } from './tokenTracker';

/**
 * Thrown when the uploaded document fails input validation before or after OCR.
 * The OCR route catches this and emits a specific SSE error code instead of
 * treating it as an unexpected exception.
 */
export class ContractValidationError extends Error {
  constructor(
    public readonly code: 'ocr_insufficient_text' | 'ocr_no_thai_text' | 'not_a_contract'
  ) {
    super(code);
    this.name = 'ContractValidationError';
  }
}

const client = new Anthropic();

export interface ExtractedProperty {
  name_th: string | null;
  name_en: string | null;
  address_th: string | null;
  address_en: string | null;
  unit_number: string | null;
  landlord_name: string | null;
  tenant_name: string | null;
}

export interface ExtractedContract {
  raw_text_th: string;
  translated_text_en: string;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  security_deposit: number | null;
  property: ExtractedProperty;
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
  /** Complexity indicator: simple (1-2 pages, clear structure) vs complex (multi-page, dense layout) */
  complexity?: DocumentComplexity;
  /** Per-field OCR confidence scores (0.0–1.0). Only populated when image quality is poor. */
  field_confidence?: FieldConfidence;
  warnings?: string[];
}

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp';

// ─── Complexity Heuristics ───────────────────────────────────────────────────

/**
 * Estimate document complexity from pass-1 structural metadata.
 * Complex = multi-page, many section headers, or dense/poor-quality layout.
 */
function estimateComplexity(pass1: Pass1Result): DocumentComplexity {
  const wordCount = pass1.raw_text.split(/\s+/).length;
  const sectionCount = pass1.section_headers.length;
  // Heuristic: >1500 words or >8 distinct sections → complex
  return wordCount > 1500 || sectionCount > 8 || pass1.is_multi_page ? 'complex' : 'simple';
}

// ─── Pass-1 Types ────────────────────────────────────────────────────────────

interface Pass1Result {
  raw_text: string;
  section_headers: string[];
  is_multi_page: boolean;
  estimated_clause_count: number;
  image_quality: 'good' | 'fair' | 'poor';
}

/** Sentinel returned by runPass1 when the document is not a contract. */
interface Pass1Refusal {
  is_contract: false;
  reason: string;
}

// ─── Pre-screen: Cheap Haiku gate (prevents wasting Sonnet tokens) ──────────

async function preScreenDocument(
  contentBlock: Anthropic.ContentBlockParam,
  onUsage?: (usage: { input_tokens: number; output_tokens: number }) => void
): Promise<boolean> {
  const response = await client.messages.create(
    {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 20,
      messages: [
        {
          role: 'user',
          content: [
            contentBlock,
            {
              type: 'text',
              text: 'Is this document a residential rental/lease contract or agreement? Reply with ONLY "yes" or "no".',
            },
          ],
        },
      ],
    },
    { timeout: 15_000 }
  );

  if (response.usage) {
    trackTokenUsage('extractContract:prescreen', {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    });
    onUsage?.({
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    });
  }

  const text = response.content.find((b) => b.type === 'text');
  const answer = text && 'text' in text ? text.text.trim().toLowerCase() : '';
  return answer.startsWith('yes');
}

// ─── Pass 1: Structural Analysis ────────────────────────────────────────────

async function runPass1(
  contentBlock: Anthropic.ContentBlockParam,
  onUsage?: (usage: { input_tokens: number; output_tokens: number }) => void
): Promise<Pass1Result | Pass1Refusal> {
  const response = await withRetry(() =>
    client.messages.create(
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: [
              contentBlock,
              {
                type: 'text',
                text: `You are a Thai rental contract OCR specialist.

BEFORE doing anything else: verify this document is an actual Thai residential rental contract.
If the document is blank, contains no meaningful text, is random noise, is a receipt, ID card, menu,
photo, or any document that does NOT contain the typical elements of a rental contract
(parties/names, rent amount, lease dates, property description), respond with EXACTLY this JSON
and nothing else:
{"is_contract": false, "reason": "<brief reason in English>"}

If it IS a rental contract, proceed with PASS 1 — STRUCTURAL ANALYSIS:

Your tasks:
1. Extract ALL raw text from the document exactly as it appears.
2. Identify all section/clause headers (numbered or titled sections).
3. Assess whether this is a multi-page document.
4. Count the approximate number of distinct clauses or numbered sections.
5. Assess the image/scan quality: "good" (crisp, clear), "fair" (readable but some blur/noise), "poor" (significant blur, low resolution, or heavy watermarks).

Return ONLY valid JSON — no markdown, no preamble:
{
  "raw_text": "<full verbatim text from the document>",
  "section_headers": ["<header 1>", "<header 2>", ...],
  "is_multi_page": true | false,
  "estimated_clause_count": <number>,
  "image_quality": "good" | "fair" | "poor"
}`,
              },
            ],
          },
        ],
      },
      { timeout: 90_000 }
    )
  );

  if (response.usage) {
    trackTokenUsage('extractContract:pass1', {
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
  rawText = rawText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  try {
    const obj = JSON.parse(rawText) as Record<string, unknown>;

    // Contract-verification refusal from Claude
    if (obj.is_contract === false) {
      return {
        is_contract: false,
        reason: typeof obj.reason === 'string' ? obj.reason : 'not a contract',
      };
    }

    return {
      raw_text: typeof obj.raw_text === 'string' ? obj.raw_text : rawText,
      section_headers: Array.isArray(obj.section_headers)
        ? (obj.section_headers as unknown[]).filter((h): h is string => typeof h === 'string')
        : [],
      is_multi_page: obj.is_multi_page === true,
      estimated_clause_count:
        typeof obj.estimated_clause_count === 'number' ? obj.estimated_clause_count : 0,
      image_quality:
        obj.image_quality === 'good' || obj.image_quality === 'fair' || obj.image_quality === 'poor'
          ? obj.image_quality
          : 'fair',
    };
  } catch {
    // Fallback: treat entire response as raw text
    return {
      raw_text: rawText,
      section_headers: [],
      is_multi_page: false,
      estimated_clause_count: 0,
      image_quality: 'fair',
    };
  }
}

// ─── Pass 2: Deep Clause Parsing ────────────────────────────────────────────

async function runPass2(
  contentBlock: Anthropic.ContentBlockParam,
  pass1: Pass1Result,
  onUsage?: (usage: { input_tokens: number; output_tokens: number }) => void
): Promise<{ parsed: unknown; needsConfidence: boolean }> {
  const confidenceInstruction =
    pass1.image_quality === 'poor'
      ? `
CONFIDENCE SCORES (required because image quality is poor):
For each of these fields include a "field_confidence" object with scores from 0.0 (uncertain) to 1.0 (certain):
  lease_start, lease_end, monthly_rent, security_deposit, landlord_name, tenant_name, property_address

Add to the top-level JSON:
"field_confidence": {
  "lease_start": <0.0-1.0>,
  "lease_end": <0.0-1.0>,
  "monthly_rent": <0.0-1.0>,
  "security_deposit": <0.0-1.0>,
  "landlord_name": <0.0-1.0>,
  "tenant_name": <0.0-1.0>,
  "property_address": <0.0-1.0>
}`
      : '';

  const response = await withRetry(() =>
    client.messages.create(
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16384,
        messages: [
          {
            role: 'user',
            content: [
              contentBlock,
              {
                type: 'text',
                text: `You are a Thai rental contract specialist and legal translator.

PASS 2 — FULL EXTRACTION WITH CONTEXT

The document has approximately ${pass1.estimated_clause_count} clauses across ${pass1.section_headers.length} sections.
${pass1.is_multi_page ? 'This is a MULTI-PAGE document — ensure ALL pages are extracted.' : ''}
Image quality assessment from Pass 1: ${pass1.image_quality}.

Use the following raw text captured in Pass 1 as additional context to improve accuracy:
--- PASS 1 RAW TEXT ---
${pass1.raw_text.slice(0, 4000)}
--- END PASS 1 RAW TEXT ---

Now perform a full, high-accuracy extraction:
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

4. Extract property information:
   - name_th / name_en: property or building name
   - address_th / address_en: full address
   - unit_number: room/unit number if mentioned
   - landlord_name: lessor's name
   - tenant_name: lessee's name
${confidenceInstruction}

Return ONLY valid JSON — no markdown, no preamble:
{
  "raw_text_th": "...",
  "translated_text_en": "...",
  "lease_start": "YYYY-MM-DD or null",
  "lease_end": "YYYY-MM-DD or null",
  "monthly_rent": number or null,
  "security_deposit": number or null,
  "property": {
    "name_th": "...", "name_en": "...",
    "address_th": "...", "address_en": "...",
    "unit_number": "..." or null,
    "landlord_name": "...", "tenant_name": "..."
  },
  "clauses": [...]${pass1.image_quality === 'poor' ? ',\n  "field_confidence": {...}' : ''}
}`,
              },
            ],
          },
        ],
      },
      { timeout: 180_000 }
    )
  );

  if (response.usage) {
    trackTokenUsage('extractContract:pass2', {
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
  rawText = rawText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    parsed = null;
  }

  return { parsed, needsConfidence: pass1.image_quality === 'poor' };
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export async function extractAndTranslateContract(
  fileBase64: string,
  mimeType: ImageMediaType | 'application/pdf'
): Promise<ExtractedContract> {
  return extractContractWithProgress(fileBase64, mimeType);
}

export async function extractContractWithProgress(
  fileBase64: string,
  mimeType: ImageMediaType | 'application/pdf',
  onProgress?: (step: 'pass1_done' | 'pass2_done') => void,
  onUsage?: (usage: { input_tokens: number; output_tokens: number }) => void
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

  // ── Pre-screen: cheap Haiku gate ─────────────────────────────────────────
  try {
    const isContract = await preScreenDocument(contentBlock, onUsage);
    if (!isContract) {
      console.warn('[extractContract] Haiku pre-screen rejected document as non-contract');
      throw new ContractValidationError('not_a_contract');
    }
  } catch (error) {
    if (error instanceof ContractValidationError) throw error;
    // If pre-screen fails (timeout, network), proceed to Pass 1 anyway — don't block
    console.warn('[extractContract] Pre-screen failed, proceeding to Pass 1:', error);
  }

  // ── Pass 1: structural analysis ──────────────────────────────────────────
  let pass1: Pass1Result;
  try {
    const pass1Result = await runPass1(contentBlock, onUsage);

    // Layer 2: Claude refused — document is not a contract
    if ('is_contract' in pass1Result && pass1Result.is_contract === false) {
      console.warn(
        '[extractContract] Claude refused document as non-contract:',
        pass1Result.reason
      );
      throw new ContractValidationError('not_a_contract');
    }

    pass1 = pass1Result as Pass1Result;
  } catch (error) {
    if (error instanceof ContractValidationError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[extractContract] Pass 1 failed:', errorMessage);
    return buildPartialResult('', [`Pass 1 structural analysis failed: ${errorMessage}`]);
  }

  // ── Layer 1: OCR output gates ─────────────────────────────────────────────
  // Gate 1: minimum text length
  if (pass1.raw_text.length < 200) {
    console.warn('[extractContract] OCR text too short:', pass1.raw_text.length, 'chars');
    throw new ContractValidationError('ocr_insufficient_text');
  }

  // Gate 2: Thai character presence
  const thaiCount = (pass1.raw_text.match(/[\u0E00-\u0E7F]/g) ?? []).length;
  if (thaiCount < 50) {
    console.warn('[extractContract] Insufficient Thai characters:', thaiCount);
    throw new ContractValidationError('ocr_no_thai_text');
  }

  // Note: The OCR provider (Claude) does not expose a separate numeric confidence score
  // for Pass 1 text extraction; image_quality is a categorical enum ('good'|'fair'|'poor'),
  // not a numeric float — no ocr_low_confidence gate is applicable here.

  onProgress?.('pass1_done');
  const complexity = estimateComplexity(pass1);

  // ── Pass 2: full extraction with context ─────────────────────────────────
  let parsed: unknown;
  let needsConfidence: boolean;
  try {
    ({ parsed, needsConfidence } = await runPass2(contentBlock, pass1, onUsage));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[extractContract] Pass 2 failed:', errorMessage);
    return buildPartialResult(pass1.raw_text, [`Pass 2 clause parsing failed: ${errorMessage}`]);
  }

  onProgress?.('pass2_done');

  if (parsed === null) {
    console.error('[extractContract] Failed to parse Pass 2 response as JSON');
    return buildPartialResult(pass1.raw_text, ['Failed to parse Claude response as JSON']);
  }

  // Inject complexity before Zod validation
  if (typeof parsed === 'object' && parsed !== null) {
    (parsed as Record<string, unknown>).complexity = complexity;
  }

  // ── Zod validation ────────────────────────────────────────────────────────
  const result = extractedContractSchema.safeParse(parsed);

  if (result.success) {
    const contract = result.data as ExtractedContract;
    contract.complexity = complexity;
    // Attach field_confidence only when image quality was poor
    if (needsConfidence && typeof parsed === 'object' && parsed !== null) {
      const raw = parsed as Record<string, unknown>;
      if (typeof raw.field_confidence === 'object' && raw.field_confidence !== null) {
        contract.field_confidence = raw.field_confidence as FieldConfidence;
      }
    }
    return contract;
  }

  // Validation failed — attempt graceful partial extraction
  console.warn(
    '[extractContract] Zod validation failed:',
    result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
  );

  const partial = buildPartialFromRaw(
    parsed,
    result.error.issues.map((i) => ({
      path: i.path.filter((p): p is string | number => typeof p !== 'symbol'),
      message: i.message,
    }))
  );
  partial.complexity = complexity;

  // Attach confidence even on partial result if image was poor quality
  if (needsConfidence && typeof parsed === 'object' && parsed !== null) {
    const raw = parsed as Record<string, unknown>;
    if (typeof raw.field_confidence === 'object' && raw.field_confidence !== null) {
      partial.field_confidence = raw.field_confidence as FieldConfidence;
    }
  }

  return partial;
}

// ─── Text-Only Re-parse (for renewals with edited text) ─────────────────────

/**
 * Re-parse contract text (no image needed) into structured clauses.
 * Used when a landlord edits the raw contract text during renewal.
 * Single-pass: sends the text to Claude and gets structured clauses back.
 */
export async function reparseContractText(
  rawText: string,
  onUsage?: (usage: { input_tokens: number; output_tokens: number }) => void
): Promise<ExtractedContract['clauses']> {
  const response = await withRetry(() =>
    client.messages.create(
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16384,
        messages: [
          {
            role: 'user',
            content: `You are a Thai rental contract specialist and legal translator.

Given the following Thai rental contract text, parse it into structured clauses.

For each clause return:
- clause_id: "c1", "c2", etc. If a clause starts with [c1], [NC1], etc., preserve that ID.
- title_th: Thai title
- title_en: English translation of title
- text_th: Thai clause body
- text_en: English translation of clause body
- category: payment | deposit | maintenance | pets | subletting | utilities | noise | penalties | renewal | termination | other
- penalty_defined: boolean
- penalty_amount: number (THB) or null
- penalty_currency: "THB" or null
- penalty_description: string or null

Contract text:
---
${rawText}
---

Return ONLY valid JSON — no markdown, no preamble:
{
  "clauses": [...]
}`,
          },
        ],
      },
      { timeout: 180_000 }
    )
  );

  if (response.usage) {
    trackTokenUsage('reparseContractText', {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    });
    onUsage?.({
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    });
  }

  const textContent = response.content.find((block) => block.type === 'text');
  let raw = textContent && 'text' in textContent ? textContent.text : '{}';
  raw = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    if (Array.isArray(obj.clauses)) {
      return obj.clauses
        .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
        .map((c, i) => ({
          clause_id: typeof c.clause_id === 'string' ? c.clause_id : `c${i + 1}`,
          title_th: typeof c.title_th === 'string' ? c.title_th : '',
          title_en: typeof c.title_en === 'string' ? c.title_en : '',
          text_th: typeof c.text_th === 'string' ? c.text_th : '',
          text_en: typeof c.text_en === 'string' ? c.text_en : '',
          category:
            typeof c.category === 'string'
              ? (c.category as ExtractedContract['clauses'][0]['category'])
              : 'other',
          penalty_defined: c.penalty_defined === true,
          penalty_amount: typeof c.penalty_amount === 'number' ? c.penalty_amount : null,
          penalty_currency: typeof c.penalty_currency === 'string' ? c.penalty_currency : null,
          penalty_description:
            typeof c.penalty_description === 'string' ? c.penalty_description : null,
        }));
    }
  } catch (e) {
    console.error('[reparseContractText] Failed to parse response:', e);
  }

  return [];
}

/**
 * Fallback: build a partial result from whatever could be parsed,
 * with a warnings array describing what was missing/invalid.
 */
function buildPartialFromRaw(
  raw: unknown,
  issues: { path: (string | number)[]; message: string }[]
): ExtractedContract {
  const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const warnings: string[] = issues.map(
    (i) => `Validation error at "${i.path.join('.')}": ${i.message}`
  );

  const property = (
    typeof obj.property === 'object' && obj.property !== null ? obj.property : {}
  ) as Record<string, unknown>;

  // Best-effort extraction of clauses
  let clauses: ExtractedContract['clauses'] = [];
  if (Array.isArray(obj.clauses)) {
    clauses = obj.clauses
      .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
      .map((c, i) => ({
        clause_id: typeof c.clause_id === 'string' ? c.clause_id : `c${i + 1}`,
        title_th: typeof c.title_th === 'string' ? c.title_th : '',
        title_en: typeof c.title_en === 'string' ? c.title_en : '',
        text_th: typeof c.text_th === 'string' ? c.text_th : '',
        text_en: typeof c.text_en === 'string' ? c.text_en : '',
        category: isValidCategory(c.category) ? c.category : 'other',
        penalty_defined: typeof c.penalty_defined === 'boolean' ? c.penalty_defined : false,
        penalty_amount: typeof c.penalty_amount === 'number' ? c.penalty_amount : null,
        penalty_currency: typeof c.penalty_currency === 'string' ? c.penalty_currency : null,
        penalty_description:
          typeof c.penalty_description === 'string' ? c.penalty_description : null,
      }));
  }

  return {
    raw_text_th: typeof obj.raw_text_th === 'string' ? obj.raw_text_th : '',
    translated_text_en: typeof obj.translated_text_en === 'string' ? obj.translated_text_en : '',
    lease_start: typeof obj.lease_start === 'string' ? obj.lease_start : null,
    lease_end: typeof obj.lease_end === 'string' ? obj.lease_end : null,
    monthly_rent: typeof obj.monthly_rent === 'number' ? obj.monthly_rent : null,
    security_deposit: typeof obj.security_deposit === 'number' ? obj.security_deposit : null,
    property: {
      name_th: typeof property.name_th === 'string' ? property.name_th : null,
      name_en: typeof property.name_en === 'string' ? property.name_en : null,
      address_th: typeof property.address_th === 'string' ? property.address_th : null,
      address_en: typeof property.address_en === 'string' ? property.address_en : null,
      unit_number: typeof property.unit_number === 'string' ? property.unit_number : null,
      landlord_name: typeof property.landlord_name === 'string' ? property.landlord_name : null,
      tenant_name: typeof property.tenant_name === 'string' ? property.tenant_name : null,
    },
    clauses,
    warnings,
  };
}

function buildPartialResult(rawText: string, warnings: string[]): ExtractedContract {
  return {
    raw_text_th: rawText,
    translated_text_en: '',
    lease_start: null,
    lease_end: null,
    monthly_rent: null,
    security_deposit: null,
    property: {
      name_th: null,
      name_en: null,
      address_th: null,
      address_en: null,
      unit_number: null,
      landlord_name: null,
      tenant_name: null,
    },
    clauses: [],
    warnings,
  };
}

const VALID_CATEGORIES = new Set([
  'payment',
  'deposit',
  'maintenance',
  'pets',
  'subletting',
  'utilities',
  'noise',
  'penalties',
  'renewal',
  'termination',
  'other',
]);

function isValidCategory(
  value: unknown
): value is ExtractedContract['clauses'][number]['category'] {
  return typeof value === 'string' && VALID_CATEGORIES.has(value);
}

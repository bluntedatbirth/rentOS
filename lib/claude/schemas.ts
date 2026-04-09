import { z } from 'zod';

// ─── OCR Extraction Response Schema ─────────────────────────────────

const clauseCategorySchema = z.enum([
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

const extractedClauseSchema = z.object({
  clause_id: z.string(),
  title_th: z.string(),
  title_en: z.string(),
  text_th: z.string(),
  text_en: z.string(),
  category: clauseCategorySchema,
  penalty_defined: z.boolean(),
  penalty_amount: z.number().nullable(),
  penalty_currency: z.string().nullable(),
  penalty_description: z.string().nullable(),
});

const extractedPropertySchema = z.object({
  name_th: z.string().nullable(),
  name_en: z.string().nullable(),
  address_th: z.string().nullable(),
  address_en: z.string().nullable(),
  unit_number: z.string().nullable(),
  landlord_name: z.string().nullable(),
  tenant_name: z.string().nullable(),
});

// ─── OCR Confidence & Complexity (Task 3) ───────────────────────────

export const complexitySchema = z.enum(['simple', 'complex']);

// Per-field confidence score for low-quality images (0.0 – 1.0)
export const fieldConfidenceSchema = z.object({
  lease_start: z.number().min(0).max(1).optional(),
  lease_end: z.number().min(0).max(1).optional(),
  monthly_rent: z.number().min(0).max(1).optional(),
  security_deposit: z.number().min(0).max(1).optional(),
  landlord_name: z.number().min(0).max(1).optional(),
  tenant_name: z.number().min(0).max(1).optional(),
  property_address: z.number().min(0).max(1).optional(),
});

export const extractedContractSchema = z.object({
  raw_text_th: z.string(),
  translated_text_en: z.string(),
  lease_start: z.string().nullable(),
  lease_end: z.string().nullable(),
  monthly_rent: z.number().nullable(),
  security_deposit: z.number().nullable(),
  property: extractedPropertySchema,
  clauses: z.array(extractedClauseSchema),
  // Optional fields added in Phase 3
  complexity: complexitySchema.optional(),
  field_confidence: fieldConfidenceSchema.optional(),
});

export type ExtractedContractParsed = z.infer<typeof extractedContractSchema>;
export type FieldConfidence = z.infer<typeof fieldConfidenceSchema>;
export type DocumentComplexity = z.infer<typeof complexitySchema>;

// ─── Contract Generation Response Schema ────────────────────────────

export const generatedContractSchema = z.object({
  contract_text: z.string().min(1),
  clause_count: z.number().int().min(0),
  language: z.string(),
});

export type GeneratedContractParsed = z.infer<typeof generatedContractSchema>;

// ─── Penalty Calculation Response Schema ────────────────────────────

const severitySchema = z.enum(['minor', 'moderate', 'severe']);

export const penaltyCalculationSchema = z.object({
  calculated_amount: z.number(),
  calculation_basis_th: z.string(),
  calculation_basis_en: z.string(),
  severity: severitySchema,
});

export type PenaltyCalculationParsed = z.infer<typeof penaltyCalculationSchema>;

// ─── Validation Error ───────────────────────────────────────────────

export class ClaudeValidationError extends Error {
  public readonly issues: z.core.$ZodIssue[];
  public readonly rawData: unknown;

  constructor(message: string, issues: z.core.$ZodIssue[], rawData: unknown) {
    super(message);
    this.name = 'ClaudeValidationError';
    this.issues = issues;
    this.rawData = rawData;
  }
}

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// TODO: DELETE during scale-back cleanup (see SIMPLIFICATION_PROGRESS.md). This route is dead code from the cut feature set.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit, logAISpend } from '@/lib/rateLimit/persistent';
import { generateContract, ContractWizardInput } from '@/lib/claude/generateContract';
import { requirePro } from '@/lib/tier';
import { sendNotification } from '@/lib/notifications/send';

const customPenaltySchema = z.object({
  description: z.string().max(500),
  penalty_amount: z.number().nonnegative(),
  conditions: z.string().max(500),
});

const autoRenewalSchema = z.object({
  renewal_period_months: z.number().int().positive(),
  notice_required_days: z.number().int().nonnegative(),
  rent_increase_percent: z.number().nonnegative().optional(),
});

const earlyTerminationSchema = z.object({
  minimum_occupancy_months: z.number().int().nonnegative(),
  penalty_months_rent: z.number().nonnegative(),
  allowed_reasons: z.array(z.string().max(500)).max(20).optional(),
});

const utilitySubmeteringSchema = z.object({
  electricity_rate_per_unit: z.number().nonnegative(),
  water_rate_per_unit: z.number().nonnegative(),
  billing_cycle: z.enum(['monthly', 'bimonthly']),
  meter_reading_day: z.number().int().min(1).max(31),
  surcharge_percent: z.number().nonnegative().optional(),
});

const petDepositSchema = z.object({
  deposit_amount: z.number().nonnegative(),
  allowed_pet_types: z.array(z.string().max(100)).max(20),
  max_pets: z.number().int().positive(),
  monthly_pet_fee: z.number().nonnegative().optional(),
  damage_liability: z.string().max(500),
});

const contractWizardInputSchema = z.object({
  // Step 1: Property & Parties
  property_name: z.string().min(1).max(500),
  property_address: z.string().max(500),
  property_unit: z.string().max(500),
  property_type: z.enum(['condo', 'house', 'apartment']),
  landlord_name: z.string().max(500),
  landlord_id_number: z.string().max(500),
  tenant_nationality: z.enum(['thai', 'foreign']).optional(),
  tenant_passport_number: z.string().max(500).optional(),
  tenant_visa_type: z.string().max(500).optional(),

  // Step 2: Financial Terms
  monthly_rent: z.number().positive(),
  security_deposit_months: z.number().int().nonnegative().max(12),
  payment_due_day: z.number().int().min(1).max(31),
  late_penalty_percent: z.number().nonnegative().max(100),
  utilities_included: z.boolean(),
  utility_details: z.string().max(500),

  // Step 3: Property Rules
  pets_allowed: z.enum(['yes', 'no', 'with_deposit']),
  pet_deposit: z.number().nonnegative().optional(),
  subletting_allowed: z.boolean(),
  smoking_allowed: z.enum(['yes', 'no', 'outdoor_only']),
  overnight_guests: z.enum(['allowed', 'notify_landlord', 'max_days']),
  max_guest_days: z.number().int().positive().optional(),
  quiet_hours_start: z.string().max(500),
  quiet_hours_end: z.string().max(500),

  // Step 4: Maintenance & Responsibilities
  landlord_responsibilities: z.array(z.string().max(500)).max(50),
  tenant_responsibilities: z.array(z.string().max(500)).max(50),
  maintenance_response_days: z.number().int().positive().max(365),
  emergency_contact: z.string().max(500),

  // Step 5: Termination & Safeguards
  lease_duration_months: z.number().int().positive().max(120),
  lease_start_date: z.string().max(500),
  early_termination_notice_days: z.number().int().nonnegative().max(365),
  early_termination_penalty_months: z.number().nonnegative().max(12),
  auto_renewal: z.boolean(),
  renewal_notice_days: z.number().int().nonnegative().max(365),
  dispute_resolution: z.enum(['negotiation', 'mediation', 'arbitration', 'court']),

  // Step 6: Output preferences
  output_language: z.enum(['thai', 'english', 'bilingual']),

  // Step 7: Advanced clauses (Pro feature — optional)
  advancedClauses: z
    .object({
      custom_penalties: z.array(customPenaltySchema).max(20).optional(),
      auto_renewal_terms: autoRenewalSchema.optional(),
      early_termination: earlyTerminationSchema.optional(),
      utility_submetering: utilitySubmeteringSchema.optional(),
      pet_deposit: petDepositSchema.optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Persistent rate limit: 5/hour, 10/day per user
  const rl = await checkRateLimit(user.id, 'generate', 5, 10);
  if (!rl.allowed) {
    console.warn('[rateLimit] generate blocked, reason:', rl.reason, 'user:', user.id);
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

  // Check pro tier
  const adminClient = createServiceRoleClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('tier, role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'landlord') {
    return unauthorized();
  }

  const tierCheck = requirePro(profile.tier, 'Contract generation requires a Pro plan.');
  if (!tierCheck.allowed) {
    return NextResponse.json(tierCheck, { status: 403 });
  }

  try {
    const rawBody: unknown = await request.json();
    const parsed = contractWizardInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }
    const body: ContractWizardInput = parsed.data;

    const result = await generateContract(body, (usage) => {
      void logAISpend(user.id, 'generate', usage.input_tokens, usage.output_tokens);
    });

    // Send TM.30 reminder if foreign tenant
    if (body.tenant_nationality === 'foreign') {
      sendNotification({
        recipientId: user.id,
        type: 'custom',
        titleEn: 'TM.30 Filing Required',
        titleTh: 'ต้องยื่นแบบ ตม.30',
        bodyEn: `File TM.30 with Immigration within 24 hours of your foreign tenant moving into ${body.property_name}. File online at tm30.immigration.go.th or visit your local immigration office.`,
        bodyTh: `ยื่นแบบ ตม.30 ต่อสำนักงานตรวจคนเข้าเมืองภายใน 24 ชม. หลังผู้เช่าต่างชาติเข้าพักที่ ${body.property_name} ยื่นออนไลน์ที่ tm30.immigration.go.th หรือสำนักงานใกล้บ้าน`,
        url: '/landlord/documents/tm30',
      }).catch(() => {}); // Non-blocking
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Contract generation failed';
    return serverError(message);
  }
}

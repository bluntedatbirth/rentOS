import Anthropic from '@anthropic-ai/sdk';
import { withRetry } from './retry';
import { trackTokenUsage } from './tokenTracker';

const client = new Anthropic();

// ─── Advanced Clause Types (Pro Feature) ────────────────────────────────────

export interface CustomPenaltyClause {
  description: string; // e.g. "Unauthorized subletting"
  penalty_amount: number; // THB
  conditions: string; // When this penalty applies
}

export interface AutoRenewalTerms {
  renewal_period_months: number; // Length of each renewal
  notice_required_days: number; // Days notice to prevent renewal
  rent_increase_percent?: number; // Optional automatic rent escalation
}

export interface EarlyTerminationClause {
  minimum_occupancy_months: number; // Must stay at least this long
  penalty_months_rent: number; // Penalty in months of rent
  allowed_reasons?: string[]; // Reasons that waive the penalty
}

export interface UtilitySubMetering {
  electricity_rate_per_unit: number; // THB per kWh
  water_rate_per_unit: number; // THB per cubic metre
  billing_cycle: 'monthly' | 'bimonthly';
  meter_reading_day: number; // Day of month meter is read
  surcharge_percent?: number; // Admin surcharge on top of utility cost
}

export interface PetDepositClause {
  deposit_amount: number; // THB
  allowed_pet_types: string[]; // e.g. ["cat", "small dog"]
  max_pets: number;
  monthly_pet_fee?: number; // Recurring pet fee
  damage_liability: string; // Description of tenant liability
}

export interface AdvancedClauses {
  custom_penalties?: CustomPenaltyClause[];
  auto_renewal_terms?: AutoRenewalTerms;
  early_termination?: EarlyTerminationClause;
  utility_submetering?: UtilitySubMetering;
  pet_deposit?: PetDepositClause;
}

// ─── Contract Wizard Input ───────────────────────────────────────────────────

export interface ContractWizardInput {
  // Step 1: Property & Parties
  property_name: string;
  property_address: string;
  property_unit: string;
  property_type: 'condo' | 'house' | 'apartment';
  landlord_name: string;
  landlord_id_number: string;
  tenant_nationality?: 'thai' | 'foreign';
  tenant_passport_number?: string;
  tenant_visa_type?: string;

  // Step 2: Financial Terms
  monthly_rent: number;
  security_deposit_months: number;
  payment_due_day: number;
  late_penalty_percent: number;
  utilities_included: boolean;
  utility_details: string;

  // Step 3: Property Rules
  pets_allowed: 'yes' | 'no' | 'with_deposit';
  pet_deposit?: number;
  subletting_allowed: boolean;
  smoking_allowed: 'yes' | 'no' | 'outdoor_only';
  overnight_guests: 'allowed' | 'notify_landlord' | 'max_days';
  max_guest_days?: number;
  quiet_hours_start: string;
  quiet_hours_end: string;

  // Step 4: Maintenance & Responsibilities
  landlord_responsibilities: string[];
  tenant_responsibilities: string[];
  maintenance_response_days: number;
  emergency_contact: string;

  // Step 5: Termination & Safeguards
  lease_duration_months: number;
  lease_start_date: string;
  early_termination_notice_days: number;
  early_termination_penalty_months: number;
  auto_renewal: boolean;
  renewal_notice_days: number;
  dispute_resolution: 'negotiation' | 'mediation' | 'arbitration' | 'court';

  // Step 6: Output preferences
  output_language: 'thai' | 'english' | 'bilingual';

  // Step 7: Advanced clauses (Pro feature — optional)
  advancedClauses?: AdvancedClauses;
}

export interface GeneratedContract {
  contract_text: string;
  clause_count: number;
  language: string;
  error_th?: string;
  error_en?: string;
}

export async function generateContract(input: ContractWizardInput): Promise<GeneratedContract> {
  const securityDeposit = input.monthly_rent * input.security_deposit_months;
  const leaseEnd = calculateLeaseEnd(input.lease_start_date, input.lease_duration_months);

  const languageInstruction =
    input.output_language === 'thai'
      ? 'Write the ENTIRE contract in formal Thai legal language (ภาษากฎหมายไทย). Use proper Thai legalese, formal register, and standard Thai contract formatting with ข้อ numbering.'
      : input.output_language === 'english'
        ? 'Write the ENTIRE contract in formal English legal language. Use proper legal register and standard contract clause numbering.'
        : 'Write the contract as a BILINGUAL document. Each clause should appear first in formal Thai legal language (ภาษากฎหมายไทย) followed immediately by its English translation. Use ข้อ numbering for Thai and Clause numbering for English.';

  let response: Anthropic.Message;
  try {
    response = await withRetry(() =>
      client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16384,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a Thai rental contract legal specialist with deep knowledge of:
- Thai Civil and Commercial Code (Book III, Title VI: Hire of Property, Sections 537-571)
- Typical Thai residential lease agreements (สัญญาเช่าที่อยู่อาศัย)
- Thai Condominium Act B.E. 2522
- 2025 Consumer Protection Board (OCPB) Regulation B.E. 2568 on residential lease contracts
- Non-waivable tenant rights under OCPB regulations
- Thai tenant and landlord rights and obligations under Thai law
- Immigration Act B.E. 2522 (1979) — TM.30 filing requirements for landlords renting to foreigners

Generate a complete, legally-sound Thai residential rental contract based on the following terms.

IMPORTANT INSTRUCTIONS:
- Leave the TENANT NAME as "____________________" (blank line) for paper fill-in
- Leave the TENANT ID NUMBER as "____________________" (blank line) for paper fill-in
- Include a bank payment section with bank name, account name, and account number as "____________________" (one long continuous underscore line, NO dashes or formatting)
- For ALL blank fill-in fields, use one long continuous underscore "____________________" — never use dashes, slashes, or segmented blanks
- Include proper legal headers and contract title
- Number all clauses sequentially using "1.", "2.", "3." format (not "ข้อ" or "Clause" prefix)
- Include signature blocks at the end with spaces for both parties and witnesses
- Include date and location of signing
- Ensure all penalty clauses comply with Thai law (penalties must be reasonable and proportional)
- Include standard force majeure clause
- Reference relevant sections of Thai Civil and Commercial Code where appropriate
- Include mandatory non-waivable tenant rights per OCPB 2025:
  * Tenant may terminate with 30-day notice after occupying 50% of the lease term
  * Utilities must be charged at government tariff rates (MEA/PEA) — no markup
  * Security deposit must be returned within 7 days (no damage) or 14 days (with itemized deductions)
  * Landlord cannot lock out tenant or seize property without court order
  * Landlord must provide written invoice at least 3 days before payment due
- Total security deposit + advance rent must not exceed 3 months' rent
- Include a move-in property condition inspection clause (both parties sign)

${languageInstruction}

CONTRACT TERMS:
=================
PROPERTY:
- Name: ${input.property_name}
- Address: ${input.property_address}
- Unit: ${input.property_unit || 'N/A'}
- Property Type: ${input.property_type === 'condo' ? 'Condominium (governed by Condominium Act B.E. 2522 in addition to CCC)' : input.property_type === 'apartment' ? 'Apartment' : 'House/Townhouse'}
${
  input.property_type === 'condo'
    ? `
CONDOMINIUM-SPECIFIC REQUIREMENTS:
- Reference Thai Condominium Act B.E. 2522 for common area obligations
- Include clause about compliance with condominium juristic person regulations
- Note that short-term rentals (<30 days) are prohibited unless building holds hotel license
- Include clause about common area fees and building rules compliance
`
    : ''
}
LANDLORD (ผู้ให้เช่า):
- Name: ${input.landlord_name}
- ID Number: ${input.landlord_id_number}

TENANT (ผู้เช่า):
- Name: ____________________ (to be filled in)
- ${input.tenant_nationality === 'foreign' ? 'Passport Number: ____________________ (to be filled in)' : 'ID Number: ____________________ (to be filled in)'}
- Nationality: ${input.tenant_nationality === 'foreign' ? 'Foreign national' : 'Thai national'}
${
  input.tenant_nationality === 'foreign'
    ? `- Visa Type: ${input.tenant_visa_type || '____________________'}

FOREIGN TENANT REQUIREMENTS (MANDATORY — Immigration Act B.E. 2522):
Include a dedicated clause covering ALL of the following foreign tenant obligations:
1. TM.30 FILING (แบบ ตม.30): The LANDLORD is legally obligated to file a TM.30 "Notification of Residence for Foreigners" with the Immigration Bureau within 24 hours of the tenant moving in, per Section 38 of the Immigration Act B.E. 2522 (1979). State that:
   - Landlord will file TM.30 online or at the local immigration office within 24 hours of move-in
   - Landlord must RE-FILE TM.30 each time the tenant re-enters Thailand after international travel
   - Landlord must provide tenant with a copy/receipt of the TM.30 filing (tenant needs this for visa extensions and 90-day reporting)
   - Failure to file carries fines up to 10,000 THB for the landlord
2. REQUIRED DOCUMENTS: Tenant must provide landlord with:
   - Copy of valid passport (photo page and current visa page)
   - Copy of arrival stamp or TM.6 card (if applicable)
   - Notification of any change in visa status or passport renewal
   - Tenant must notify landlord BEFORE any international travel (for TM.30 re-filing)
3. 90-DAY REPORTING: Note that the tenant is responsible for their own 90-day reporting to immigration, but landlord's TM.30 filing is a prerequisite for this.
4. VISA VALIDITY: Tenant must maintain a valid visa throughout the lease term. If visa expires and cannot be renewed, this constitutes grounds for early termination.
5. LEASE DURATION LIMIT: Per Thai law, leases over 3 years must be registered at the Land Department. Include this note if applicable.
`
    : ''
}
FINANCIAL TERMS:
- Monthly Rent: ${input.monthly_rent.toLocaleString()} THB
- Security Deposit: ${securityDeposit.toLocaleString()} THB (${input.security_deposit_months} month(s))
- Payment Due: Day ${input.payment_due_day} of each month
- Late Payment Penalty: ${input.late_penalty_percent}% per day of overdue amount
- Utilities: ${input.utilities_included ? `Included in rent. ${input.utility_details}` : `Separate. ${input.utility_details}`}

LEASE PERIOD:
- Duration: ${input.lease_duration_months} months
- Start Date: ${input.lease_start_date}
- End Date: ${leaseEnd}
- Auto-renewal: ${input.auto_renewal ? `Yes, with ${input.renewal_notice_days}-day notice required to terminate` : 'No'}

PROPERTY RULES:
- Pets: ${input.pets_allowed === 'yes' ? 'Allowed' : input.pets_allowed === 'with_deposit' ? `Allowed with ${input.pet_deposit?.toLocaleString() ?? '0'} THB pet deposit` : 'Not allowed'}
- Subletting: ${input.subletting_allowed ? 'Allowed with written landlord consent' : 'Not allowed'}
- Smoking: ${input.smoking_allowed === 'yes' ? 'Allowed' : input.smoking_allowed === 'outdoor_only' ? 'Outdoor areas only' : 'Not allowed'}
- Overnight Guests: ${input.overnight_guests === 'allowed' ? 'Allowed' : input.overnight_guests === 'notify_landlord' ? 'Allowed, must notify landlord' : `Max ${input.max_guest_days ?? 7} consecutive days`}
- Quiet Hours: ${input.quiet_hours_start} to ${input.quiet_hours_end}

MAINTENANCE:
- Landlord Responsibilities: ${input.landlord_responsibilities.join(', ')}
- Tenant Responsibilities: ${input.tenant_responsibilities.join(', ')}
- Maintenance Response Time: ${input.maintenance_response_days} business days
- Emergency Contact: ${input.emergency_contact}

TERMINATION & SAFEGUARDS:
- Early Termination Notice: ${input.early_termination_notice_days} days
- Early Termination Penalty: ${input.early_termination_penalty_months} month(s) rent
- Dispute Resolution: ${input.dispute_resolution}
${buildAdvancedClausesSection(input.advancedClauses)}
Return ONLY the contract text. No JSON wrapping, no markdown code fences. Just the complete contract document ready to print.`,
              },
            ],
          },
        ],
      })
    );
  } catch (error) {
    // Task 3 fallback: return bilingual error message instead of crashing
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[generateContract] Claude API call failed:', errorMessage);
    return {
      contract_text: '',
      clause_count: 0,
      language:
        input.output_language === 'thai'
          ? 'Thai'
          : input.output_language === 'english'
            ? 'English'
            : 'Bilingual (Thai/English)',
      error_th: `ไม่สามารถสร้างสัญญาได้: ${errorMessage} กรุณาลองใหม่อีกครั้งหรือติดต่อฝ่ายสนับสนุน`,
      error_en: `Failed to generate contract: ${errorMessage}. Please try again or contact support.`,
    };
  }

  // Track token usage
  if (response.usage) {
    trackTokenUsage('generateContract', {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    });
  }

  const textContent = response.content.find((block) => block.type === 'text');
  const contractText = textContent && 'text' in textContent ? textContent.text : '';

  // Validate: contract text must be non-empty
  if (!contractText.trim()) {
    console.error('[generateContract] Claude returned empty contract text');
    return {
      contract_text: '',
      clause_count: 0,
      language:
        input.output_language === 'thai'
          ? 'Thai'
          : input.output_language === 'english'
            ? 'English'
            : 'Bilingual (Thai/English)',
      error_th: 'ระบบสร้างสัญญาส่งกลับเอกสารเปล่า กรุณาลองใหม่อีกครั้งหรือติดต่อฝ่ายสนับสนุน',
      error_en:
        'Contract generation returned an empty document. Please try again or contact support.',
    };
  }

  // Count clauses (look for numbered patterns)
  const clauseMatches = contractText.match(/(?:ข้อ|Clause|Article)\s*\d+/gi);
  const clauseCount = clauseMatches ? new Set(clauseMatches).size : 0;

  return {
    contract_text: contractText,
    clause_count: clauseCount,
    language:
      input.output_language === 'thai'
        ? 'Thai'
        : input.output_language === 'english'
          ? 'English'
          : 'Bilingual (Thai/English)',
  };
}

// ─── Advanced Clauses Prompt Builder ────────────────────────────────────────

function buildAdvancedClausesSection(adv: AdvancedClauses | undefined): string {
  if (!adv) return '';

  const lines: string[] = ['\nADVANCED CLAUSES (Pro — include all sections listed below):'];

  if (adv.custom_penalties && adv.custom_penalties.length > 0) {
    lines.push('\nCUSTOM PENALTY CLAUSES:');
    adv.custom_penalties.forEach((p, i) => {
      lines.push(
        `  ${i + 1}. Violation: ${p.description}` +
          ` | Penalty: ${p.penalty_amount.toLocaleString()} THB` +
          ` | Conditions: ${p.conditions}`
      );
    });
    lines.push(
      '  → Draft a numbered penalty clause for each item above. Ensure amounts are reasonable and proportional under Thai Civil and Commercial Code Section 383 (court may reduce excessive penalties).'
    );
  }

  if (adv.auto_renewal_terms) {
    const ar = adv.auto_renewal_terms;
    lines.push('\nAUTO-RENEWAL TERMS:');
    lines.push(`  - Renewal Period: ${ar.renewal_period_months} month(s)`);
    lines.push(`  - Non-Renewal Notice Required: ${ar.notice_required_days} days before expiry`);
    if (ar.rent_increase_percent !== undefined) {
      lines.push(`  - Automatic Rent Escalation on Renewal: ${ar.rent_increase_percent}%`);
    }
    lines.push(
      '  → Draft an auto-renewal clause stating the contract renews automatically for the specified period unless written notice is given. Reference Thai Civil and Commercial Code Section 570 (implied renewal).'
    );
  }

  if (adv.early_termination) {
    const et = adv.early_termination;
    lines.push('\nEARLY TERMINATION CLAUSE:');
    lines.push(`  - Minimum Occupancy Before Termination: ${et.minimum_occupancy_months} month(s)`);
    lines.push(`  - Early Termination Fee: ${et.penalty_months_rent} month(s) rent`);
    if (et.allowed_reasons && et.allowed_reasons.length > 0) {
      lines.push(`  - Fee-Waived Reasons: ${et.allowed_reasons.join('; ')}`);
    }
    lines.push(
      '  → Draft an early termination clause with the conditions above. Specify required written notice, penalty calculation, and any fee-waiver grounds.'
    );
  }

  if (adv.utility_submetering) {
    const us = adv.utility_submetering;
    lines.push('\nUTILITY SUB-METERING:');
    lines.push(`  - Electricity Rate: ${us.electricity_rate_per_unit} THB/kWh`);
    lines.push(`  - Water Rate: ${us.water_rate_per_unit} THB/m³`);
    lines.push(`  - Billing Cycle: ${us.billing_cycle}`);
    lines.push(`  - Meter Reading Day: ${us.meter_reading_day} of each month`);
    if (us.surcharge_percent !== undefined) {
      lines.push(`  - Admin Surcharge: ${us.surcharge_percent}% on top of utility cost`);
    }
    lines.push(
      '  → Draft a detailed utility sub-metering clause. Include meter reading procedure, billing timeline, dispute process, and note that rates must not exceed legally permitted maximums under Thai regulations.'
    );
  }

  if (adv.pet_deposit) {
    const pd = adv.pet_deposit;
    lines.push('\nPET DEPOSIT & RULES:');
    lines.push(`  - Pet Deposit Amount: ${pd.deposit_amount.toLocaleString()} THB`);
    lines.push(`  - Allowed Pet Types: ${pd.allowed_pet_types.join(', ')}`);
    lines.push(`  - Maximum Number of Pets: ${pd.max_pets}`);
    if (pd.monthly_pet_fee !== undefined) {
      lines.push(`  - Monthly Pet Fee: ${pd.monthly_pet_fee.toLocaleString()} THB`);
    }
    lines.push(`  - Damage Liability: ${pd.damage_liability}`);
    lines.push(
      '  → Draft a pet clause covering the deposit (refundable conditions), permitted pets, monthly fee if applicable, and full liability for damages caused by pets.'
    );
  }

  return lines.join('\n');
}

function calculateLeaseEnd(startDate: string, months: number): string {
  const date = new Date(startDate);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0] ?? '';
}

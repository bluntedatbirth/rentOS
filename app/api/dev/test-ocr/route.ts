import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import type { Database } from '@/lib/supabase/types';

// DEV ONLY — test the OCR pipeline with a sample Thai contract
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const anthropic = new Anthropic();

  const adminClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // First, get or create a test property + contract
  const { data: properties } = await adminClient.from('properties').select('id').limit(1);

  // Get landlord user
  const { data: landlord } = await adminClient
    .from('profiles')
    .select('id')
    .eq('role', 'landlord')
    .limit(1)
    .single();

  if (!landlord) {
    return NextResponse.json({ error: 'No landlord found. Seed users first.' }, { status: 400 });
  }

  let propertyId: string;

  if (properties && properties.length > 0) {
    propertyId = properties[0]!.id;
  } else {
    const { data: newProp } = await adminClient
      .from('properties')
      .insert({
        landlord_id: landlord.id,
        name: 'Condo Sukhumvit 24',
        address: '123 Sukhumvit Soi 24, Bangkok',
        unit_number: '8A',
      })
      .select()
      .single();

    propertyId = newProp!.id;
  }

  // Create a contract record
  const { data: contract } = await adminClient
    .from('contracts')
    .insert({
      property_id: propertyId,
      landlord_id: landlord.id,
      status: 'active',
      original_file_url: 'test/sample-contract.txt',
    })
    .select()
    .single();

  if (!contract) {
    return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 });
  }

  // Sample 5-clause Thai contract text
  const contractText = `สัญญาเช่าอสังหาริมทรัพย์

ทำที่ กรุงเทพมหานคร
วันที่ 1 มกราคม 2569

ข้อ 1: การชำระค่าเช่า
ผู้เช่าตกลงชำระค่าเช่ารายเดือน จำนวน 15,000 บาท (หนึ่งหมื่นห้าพันบาทถ้วน) ภายในวันที่ 5 ของทุกเดือน โดยโอนเข้าบัญชีธนาคารที่ผู้ให้เช่ากำหนด หากชำระล่าช้า ผู้เช่าต้องจ่ายค่าปรับ 500 บาทต่อวัน

ข้อ 2: เงินประกัน
ผู้เช่าวางเงินประกัน จำนวน 30,000 บาท (สามหมื่นบาทถ้วน) เท่ากับค่าเช่า 2 เดือน เงินประกันจะคืนให้ภายใน 30 วันหลังสิ้นสุดสัญญา หักค่าเสียหาย (ถ้ามี)

ข้อ 3: การบำรุงรักษา
ผู้เช่ามีหน้าที่ดูแลรักษาทรัพย์สินที่เช่าให้อยู่ในสภาพดี การซ่อมแซมเล็กน้อยไม่เกิน 2,000 บาท ผู้เช่ารับผิดชอบเอง การซ่อมแซมใหญ่เป็นความรับผิดชอบของผู้ให้เช่า

ข้อ 4: การเลี้ยงสัตว์
ห้ามเลี้ยงสัตว์ทุกชนิดภายในห้องเช่า หากฝ่าฝืนจะถูกปรับ 5,000 บาท และอาจถูกบอกเลิกสัญญาทันที

ข้อ 5: การยกเลิกสัญญา
หากผู้เช่าต้องการยกเลิกสัญญาก่อนกำหนด ต้องแจ้งล่วงหน้าอย่างน้อย 60 วัน และจะถูกหักเงินประกันเป็นค่าชดเชย ระยะเวลาเช่าเริ่มตั้งแต่ 1 มกราคม 2569 ถึง 31 ธันวาคม 2569`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `You are a Thai rental contract specialist and legal translator.

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
}

Here is the contract text:

${contractText}`,
        },
      ],
    });

    const textContent = response.content.find((block) => block.type === 'text');
    const rawText = textContent && 'text' in textContent ? textContent.text : '{}';
    const extracted = JSON.parse(rawText);

    // Save to the contract record
    await adminClient
      .from('contracts')
      .update({
        raw_text_th: extracted.raw_text_th,
        translated_text_en: extracted.translated_text_en,
        structured_clauses: extracted.clauses,
        lease_start: extracted.lease_start,
        lease_end: extracted.lease_end,
        monthly_rent: extracted.monthly_rent,
        security_deposit: extracted.security_deposit,
      })
      .eq('id', contract.id);

    return NextResponse.json({
      success: true,
      contract_id: contract.id,
      property_id: propertyId,
      clauses_count: extracted.clauses.length,
      extracted,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OCR failed';
    return NextResponse.json({ error: message, contract_id: contract.id }, { status: 500 });
  }
}

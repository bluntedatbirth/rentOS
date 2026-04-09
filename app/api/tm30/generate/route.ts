import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, badRequest } from '@/lib/supabase/api';

/**
 * POST /api/tm30/generate
 *
 * Generates a pre-filled TM.30 form as structured data.
 * The client renders this into a printable document.
 *
 * TM.30 = "Notification of Residence for Foreigners" (แบบ ตม.30)
 * Required under Immigration Act B.E. 2522, Section 38
 * Must be filed by the property owner within 24 hours of a foreigner moving in.
 */
export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const {
    // Owner/notifier info
    owner_name,
    owner_nationality,
    owner_id_number,
    owner_address,
    owner_phone,
    owner_relationship, // owner, lessee, manager
    // Accommodation info
    place_name,
    place_address,
    place_type, // condo, apartment, house
    place_phone,
    // Foreigner info
    foreigner_name,
    foreigner_nationality,
    foreigner_passport_number,
    foreigner_arrival_date,
    foreigner_arrival_from,
    foreigner_stay_date,
    foreigner_visa_type,
    foreigner_visa_expiry,
  } = body as Record<string, string>;

  if (!owner_name || !place_name || !foreigner_name) {
    return badRequest('owner_name, place_name, and foreigner_name are required');
  }

  // Return structured TM.30 data for client-side rendering
  const tm30Data = {
    form_title_th: 'แบบ ตม.30',
    form_title_en: 'TM.30 — Notification of Residence for Foreigners',
    form_subtitle_th: 'แบบแจ้งที่พักอาศัยของคนต่างด้าว',
    form_subtitle_en: 'Under Immigration Act B.E. 2522 (1979), Section 38',
    filed_date: new Date().toLocaleDateString('en-GB'), // DD/MM/YYYY

    section1_title: 'Section 1: Notifier / House Owner (ผู้แจ้ง)',
    owner: {
      name: owner_name || '',
      nationality: owner_nationality || 'Thai',
      id_number: owner_id_number || '',
      address: owner_address || '',
      phone: owner_phone || '',
      relationship: owner_relationship || 'owner',
    },

    section2_title: 'Section 2: Accommodation (สถานที่พัก)',
    accommodation: {
      name: place_name || '',
      address: place_address || '',
      type: place_type || '',
      phone: place_phone || '',
    },

    section3_title: 'Section 3: Foreigner Details (คนต่างด้าว)',
    foreigner: {
      name: foreigner_name || '',
      nationality: foreigner_nationality || '',
      passport_number: foreigner_passport_number || '',
      arrival_date: foreigner_arrival_date || '',
      arrival_from: foreigner_arrival_from || '',
      stay_date: foreigner_stay_date || '',
      visa_type: foreigner_visa_type || '',
      visa_expiry: foreigner_visa_expiry || '',
    },

    notes: [
      'File within 24 hours of foreigner moving in (ยื่นภายใน 24 ชั่วโมงหลังเข้าพัก)',
      'Re-file after each re-entry to Thailand (ยื่นใหม่ทุกครั้งที่เดินทางกลับเข้าประเทศ)',
      'Failure to file: fine up to 10,000 THB (ไม่ยื่น: ปรับสูงสุด 10,000 บาท)',
      'File online: tm30.immigration.go.th (ยื่นออนไลน์: tm30.immigration.go.th)',
    ],
  };

  return NextResponse.json(tm30Data);
}

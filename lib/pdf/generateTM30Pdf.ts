import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

// ─── A4 Layout ──────────────────────────────────────────────────────────────
const W = 595.28;
const H = 841.89;
const ML = 50; // margin left
const MR = 50;
const MT = 50;
const MB = 60;
const CW = W - ML - MR; // content width

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

async function loadFonts(doc: PDFDocument): Promise<Fonts> {
  doc.registerFontkit(fontkit);
  try {
    const [rb, bb] = await Promise.all([
      fetch('/fonts/Sarabun-Regular.ttf').then((r) => r.arrayBuffer()),
      fetch('/fonts/Sarabun-Bold.ttf').then((r) => r.arrayBuffer()),
    ]);
    return { regular: await doc.embedFont(rb), bold: await doc.embedFont(bb) };
  } catch {
    return {
      regular: await doc.embedFont(StandardFonts.Helvetica),
      bold: await doc.embedFont(StandardFonts.HelveticaBold),
    };
  }
}

// ─── Drawing helpers ────────────────────────────────────────────────────────

function centerText(page: PDFPage, text: string, font: PDFFont, size: number, y: number) {
  const tw = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: W / 2 - tw / 2, y, size, font, color: rgb(0.1, 0.1, 0.1) });
}

function drawLabel(
  page: PDFPage,
  label: string,
  value: string,
  x: number,
  y: number,
  fonts: Fonts,
  maxW = 200
) {
  page.drawText(label, { x, y, size: 9, font: fonts.regular, color: rgb(0.35, 0.35, 0.35) });
  const valY = y - 14;
  // Wrap value if too long
  const lines = wrapText(value || '____________________', fonts.bold, 10, maxW);
  lines.forEach((line, i) => {
    page.drawText(line, {
      x,
      y: valY - i * 13,
      size: 10,
      font: fonts.bold,
      color: rgb(0.1, 0.1, 0.1),
    });
  });
  return lines.length;
}

function wrapText(text: string, font: PDFFont, size: number, maxW: number): string[] {
  if (!text) return [''];
  if (font.widthOfTextAtSize(text, size) <= maxW) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [text];
}

function drawHr(page: PDFPage, y: number) {
  page.drawLine({
    start: { x: ML, y },
    end: { x: W - MR, y },
    thickness: 0.5,
    color: rgb(0.75, 0.75, 0.75),
  });
}

// ─── TM30 Form Data ─────────────────────────────────────────────────────────

export interface TM30PdfData {
  owner_name: string;
  owner_nationality: string;
  owner_id_number: string;
  owner_address: string;
  owner_phone: string;
  owner_relationship: string;
  place_name: string;
  place_address: string;
  place_type: string;
  place_phone: string;
  foreigner_name: string;
  foreigner_nationality: string;
  foreigner_passport_number: string;
  foreigner_arrival_date: string;
  foreigner_arrival_from: string;
  foreigner_stay_date: string;
  foreigner_visa_type: string;
  foreigner_visa_expiry: string;
}

// ─── Generate PDF ────────────────────────────────────────────────────────────

export async function generateTM30Pdf(data: TM30PdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle('TM.30 — Notification of Residence for Foreigners');
  doc.setSubject('แบบ ตม.30 แบบแจ้งที่พักอาศัยของคนต่างด้าว');
  doc.setCreator('RentOS');

  const fonts = await loadFonts(doc);
  const page = doc.addPage([W, H]);
  let y = H - MT;

  const colLeft = ML;
  const colRight = ML + CW / 2 + 10;
  const colW = CW / 2 - 10;

  // ─── Header ─────────────────────────────────────────────────────────────
  centerText(page, 'แบบ ตม.30', fonts.bold, 18, y);
  y -= 22;
  centerText(page, 'TM.30 — Notification of Residence for Foreigners', fonts.bold, 12, y);
  y -= 16;
  centerText(page, 'แบบแจ้งที่พักอาศัยของคนต่างด้าว', fonts.regular, 10, y);
  y -= 14;
  centerText(page, 'Immigration Act B.E. 2522 (1979), Section 38', fonts.regular, 8, y);
  y -= 20;

  const today = new Date().toLocaleDateString('en-GB');
  centerText(page, `Date / วันที่: ${today}`, fonts.regular, 9, y);
  y -= 25;

  drawHr(page, y);
  y -= 20;

  // ─── Section 1: Owner ───────────────────────────────────────────────────
  page.drawText('Section 1: Notifier / House Owner (ผู้แจ้ง / เจ้าของบ้าน)', {
    x: ML,
    y,
    size: 11,
    font: fonts.bold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 22;

  const relLabel =
    data.owner_relationship === 'owner'
      ? 'Owner (เจ้าของ)'
      : data.owner_relationship === 'lessee'
        ? 'Lessee (ผู้เช่า)'
        : 'Manager (ผู้จัดการ)';

  drawLabel(page, 'Name (ชื่อ-นามสกุล):', data.owner_name, colLeft, y, fonts, colW);
  drawLabel(page, 'Nationality (สัญชาติ):', data.owner_nationality, colRight, y, fonts, colW);
  y -= 38;

  drawLabel(page, 'ID Card No. (เลขประจำตัว):', data.owner_id_number, colLeft, y, fonts, colW);
  drawLabel(page, 'Phone (โทรศัพท์):', data.owner_phone, colRight, y, fonts, colW);
  y -= 38;

  const addrLines = drawLabel(
    page,
    'Address (ที่อยู่):',
    data.owner_address,
    colLeft,
    y,
    fonts,
    CW
  );
  y -= 18 + addrLines * 13;

  drawLabel(page, 'Relationship (ความสัมพันธ์):', relLabel, colLeft, y, fonts, colW);
  y -= 42;

  drawHr(page, y);
  y -= 20;

  // ─── Section 2: Accommodation ───────────────────────────────────────────
  page.drawText('Section 2: Accommodation (สถานที่พัก)', {
    x: ML,
    y,
    size: 11,
    font: fonts.bold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 22;

  drawLabel(page, 'Name (ชื่อสถานที่):', data.place_name, colLeft, y, fonts, colW);
  drawLabel(page, 'Type (ประเภท):', data.place_type, colRight, y, fonts, colW);
  y -= 38;

  const placeAddrLines = drawLabel(
    page,
    'Address (ที่อยู่):',
    data.place_address,
    colLeft,
    y,
    fonts,
    CW
  );
  y -= 18 + placeAddrLines * 13;

  drawLabel(page, 'Phone (โทรศัพท์):', data.place_phone, colLeft, y, fonts, colW);
  y -= 42;

  drawHr(page, y);
  y -= 20;

  // ─── Section 3: Foreigner ───────────────────────────────────────────────
  page.drawText('Section 3: Foreigner Details (รายละเอียดคนต่างด้าว)', {
    x: ML,
    y,
    size: 11,
    font: fonts.bold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 22;

  drawLabel(page, 'Name (ชื่อ-นามสกุล):', data.foreigner_name, colLeft, y, fonts, colW);
  drawLabel(page, 'Nationality (สัญชาติ):', data.foreigner_nationality, colRight, y, fonts, colW);
  y -= 38;

  drawLabel(
    page,
    'Passport No. (หนังสือเดินทาง):',
    data.foreigner_passport_number,
    colLeft,
    y,
    fonts,
    colW
  );
  drawLabel(
    page,
    'Arrival Date (วันที่เดินทางถึง):',
    data.foreigner_arrival_date,
    colRight,
    y,
    fonts,
    colW
  );
  y -= 38;

  drawLabel(page, 'From (เดินทางมาจาก):', data.foreigner_arrival_from, colLeft, y, fonts, colW);
  drawLabel(page, 'Stay From (พักตั้งแต่):', data.foreigner_stay_date, colRight, y, fonts, colW);
  y -= 38;

  drawLabel(page, 'Visa Type (ประเภทวีซ่า):', data.foreigner_visa_type, colLeft, y, fonts, colW);
  drawLabel(
    page,
    'Visa Expiry (วีซ่าหมดอายุ):',
    data.foreigner_visa_expiry,
    colRight,
    y,
    fonts,
    colW
  );
  y -= 50;

  drawHr(page, y);
  y -= 30;

  // ─── Signature Block ────────────────────────────────────────────────────
  // Left signature
  const sigLineW = 160;
  const sigLeftX = ML + 30;
  const sigRightX = W - MR - sigLineW - 30;

  page.drawLine({
    start: { x: sigLeftX, y },
    end: { x: sigLeftX + sigLineW, y },
    thickness: 0.5,
    color: rgb(0.3, 0.3, 0.3),
  });
  page.drawLine({
    start: { x: sigRightX, y },
    end: { x: sigRightX + sigLineW, y },
    thickness: 0.5,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 14;

  const sig1 = 'Signature of Notifier';
  const sig1th = '(ลงชื่อผู้แจ้ง)';
  const sig2 = 'Receiving Officer';
  const sig2th = '(เจ้าหน้าที่ผู้รับแจ้ง)';

  const cx1 = sigLeftX + sigLineW / 2;
  const cx2 = sigRightX + sigLineW / 2;

  centerTextAt(page, sig1, fonts.regular, 9, cx1, y);
  centerTextAt(page, sig2, fonts.regular, 9, cx2, y);
  y -= 13;
  centerTextAt(page, sig1th, fonts.regular, 8, cx1, y);
  centerTextAt(page, sig2th, fonts.regular, 8, cx2, y);
  y -= 13;
  centerTextAt(page, `Date: ${today}`, fonts.regular, 8, cx1, y);
  centerTextAt(page, 'Date: ____/____/________', fonts.regular, 8, cx2, y);
  y -= 25;

  // ─── Notes ──────────────────────────────────────────────────────────────
  const notes = [
    'File within 24 hours of foreigner moving in (ยื่นภายใน 24 ชม. หลังเข้าพัก)',
    'Re-file after each re-entry to Thailand (ยื่นใหม่ทุกครั้งที่กลับเข้าประเทศ)',
    'Failure to file: fine up to 10,000 THB (ไม่ยื่น: ปรับสูงสุด 10,000 บาท)',
    'File online: tm30.immigration.go.th',
    'Provide a copy to the tenant for visa extensions and 90-day reporting',
  ];

  page.drawText('Important Notes:', {
    x: ML,
    y,
    size: 9,
    font: fonts.bold,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 14;
  for (const note of notes) {
    page.drawText(`•  ${note}`, {
      x: ML + 8,
      y,
      size: 8,
      font: fonts.regular,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 12;
  }

  // ─── Footer ─────────────────────────────────────────────────────────────
  const footer = 'Generated by RentOS — tm30.immigration.go.th';
  const fw = fonts.regular.widthOfTextAtSize(footer, 7);
  page.drawText(footer, {
    x: W / 2 - fw / 2,
    y: MB - 20,
    size: 7,
    font: fonts.regular,
    color: rgb(0.6, 0.6, 0.6),
  });

  return await doc.save();
}

function centerTextAt(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  cx: number,
  y: number
) {
  const tw = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: cx - tw / 2, y, size, font, color: rgb(0.3, 0.3, 0.3) });
}

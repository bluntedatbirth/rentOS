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

// ─── Drawing helpers ─────────────────────────────────────────────────────────

function centerText(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  y: number,
  color = rgb(0.1, 0.1, 0.1)
) {
  const tw = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: W / 2 - tw / 2, y, size, font, color });
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
  const lines = wrapText(value || '—', fonts.bold, 10, maxW);
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

// ─── Data interfaces ─────────────────────────────────────────────────────────

export interface Payment {
  id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  payment_type: string;
  status: string;
  promptpay_ref: string | null;
  notes: string | null;
}

export interface Contract {
  id: string;
  lease_start: string;
  lease_end: string;
  property_name: string | null;
  property_address: string | null;
}

export interface Profile {
  id: string;
  full_name: string | null;
}

// ─── Generate Receipt PDF ────────────────────────────────────────────────────

export async function generatePaymentReceipt(
  payment: Payment,
  contract: Contract,
  tenant: Profile,
  landlord: Profile
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle('Payment Receipt / ใบเสร็จรับเงิน');
  doc.setSubject('RentOS Payment Receipt');
  doc.setCreator('RentOS');

  const fonts = await loadFonts(doc);
  const page = doc.addPage([W, H]);
  let y = H - MT;

  const colLeft = ML;
  const colRight = ML + CW / 2 + 10;
  const colW = CW / 2 - 10;

  // ─── Header ──────────────────────────────────────────────────────────────
  // "RentOS" centered in saffron
  centerText(page, 'RentOS', fonts.bold, 22, y, rgb(0.85, 0.55, 0.0));
  y -= 26;

  // Bilingual title
  centerText(page, 'Payment Receipt / ใบเสร็จรับเงิน', fonts.bold, 14, y);
  y -= 22;

  drawHr(page, y);
  y -= 20;

  // ─── Receipt metadata ─────────────────────────────────────────────────────
  const receiptNumber = `RCPT-${payment.id.slice(0, 8).toUpperCase()}`;
  const issuedDate = payment.paid_date
    ? new Date(payment.paid_date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';
  const dueDate = new Date(payment.due_date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  drawLabel(page, 'Receipt No. / เลขที่ใบเสร็จ:', receiptNumber, colLeft, y, fonts, colW);
  drawLabel(page, 'Date Paid / วันที่ชำระ:', issuedDate, colRight, y, fonts, colW);
  y -= 38;

  drawHr(page, y);
  y -= 20;

  // ─── Parties ─────────────────────────────────────────────────────────────
  page.drawText('Parties / คู่สัญญา', {
    x: ML,
    y,
    size: 11,
    font: fonts.bold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 22;

  drawLabel(page, 'Tenant / ผู้เช่า:', tenant.full_name ?? '—', colLeft, y, fonts, colW);
  drawLabel(page, 'Landlord / เจ้าของ:', landlord.full_name ?? '—', colRight, y, fonts, colW);
  y -= 38;

  drawHr(page, y);
  y -= 20;

  // ─── Property ─────────────────────────────────────────────────────────────
  page.drawText('Property / ที่พัก', {
    x: ML,
    y,
    size: 11,
    font: fonts.bold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 22;

  const propName = contract.property_name ?? '—';
  const propAddr = contract.property_address ?? '—';

  drawLabel(page, 'Property Name / ชื่อที่พัก:', propName, colLeft, y, fonts, colW);
  drawLabel(
    page,
    'Lease Period / ช่วงเช่า:',
    `${contract.lease_start} → ${contract.lease_end}`,
    colRight,
    y,
    fonts,
    colW
  );
  y -= 38;

  const addrLines = drawLabel(page, 'Address / ที่อยู่:', propAddr, colLeft, y, fonts, CW);
  y -= 18 + addrLines * 13;

  drawHr(page, y);
  y -= 20;

  // ─── Payment details ──────────────────────────────────────────────────────
  page.drawText('Payment Details / รายละเอียดการชำระ', {
    x: ML,
    y,
    size: 11,
    font: fonts.bold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 22;

  const typeMap: Record<string, string> = {
    rent: 'Rent / ค่าเช่า',
    utility: 'Utility / ค่าสาธารณูปโภค',
    deposit: 'Deposit / เงินประกัน',
    penalty: 'Penalty / ค่าปรับ',
  };
  const typeLabel = typeMap[payment.payment_type] ?? payment.payment_type;

  drawLabel(page, 'Payment Type / ประเภท:', typeLabel, colLeft, y, fonts, colW);
  drawLabel(page, 'Due Date / วันครบกำหนด:', dueDate, colRight, y, fonts, colW);
  y -= 38;

  if (payment.promptpay_ref) {
    drawLabel(page, 'PromptPay Ref / อ้างอิง:', payment.promptpay_ref, colLeft, y, fonts, CW);
    y -= 38;
  }

  if (payment.notes) {
    const noteLines = drawLabel(page, 'Notes / หมายเหตุ:', payment.notes, colLeft, y, fonts, CW);
    y -= 18 + noteLines * 13;
  }

  drawHr(page, y);
  y -= 25;

  // ─── Amount box ───────────────────────────────────────────────────────────
  const amountStr = `\u0E3F${payment.amount.toLocaleString('en-US')}`;
  // Draw a light saffron box behind the amount
  page.drawRectangle({
    x: ML,
    y: y - 40,
    width: CW,
    height: 56,
    color: rgb(1.0, 0.96, 0.84),
    borderColor: rgb(0.85, 0.65, 0.1),
    borderWidth: 1,
  });

  page.drawText('Amount Paid / จำนวนเงิน', {
    x: ML + 12,
    y: y - 10,
    size: 9,
    font: fonts.regular,
    color: rgb(0.45, 0.35, 0.0),
  });

  const amountW = fonts.bold.widthOfTextAtSize(amountStr, 24);
  page.drawText(amountStr, {
    x: W / 2 - amountW / 2,
    y: y - 34,
    size: 24,
    font: fonts.bold,
    color: rgb(0.6, 0.35, 0.0),
  });
  y -= 70;

  drawHr(page, y);
  y -= 20;

  // ─── Status ───────────────────────────────────────────────────────────────
  page.drawText('Status: PAID / ชำระแล้ว', {
    x: ML,
    y,
    size: 10,
    font: fonts.bold,
    color: rgb(0.1, 0.55, 0.1),
  });
  y -= 30;

  // ─── Footer ───────────────────────────────────────────────────────────────
  const timestamp = new Date().toISOString();
  const footer = `Generated by RentOS  •  ${timestamp}`;
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

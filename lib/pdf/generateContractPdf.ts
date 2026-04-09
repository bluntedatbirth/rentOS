import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

// ─── Page Layout (A4) ───────────────────────────────────────────────────────
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_TOP = 60;
const MARGIN_BOTTOM = 80; // Extra room for signing footer
const MARGIN_LEFT = 60;
const MARGIN_RIGHT = 60;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// Typography
const TITLE_SIZE = 16;
const BODY_SIZE = 11;
const SMALL_SIZE = 9;
const LINE_HEIGHT = 16;
const PARAGRAPH_GAP = 6;

interface PdfFonts {
  regular: PDFFont;
  bold: PDFFont;
}

// ─── Font Loading ───────────────────────────────────────────────────────────

async function loadFonts(doc: PDFDocument): Promise<PdfFonts> {
  doc.registerFontkit(fontkit);
  try {
    const [regularBytes, boldBytes] = await Promise.all([
      fetch('/fonts/Sarabun-Regular.ttf').then((r) => r.arrayBuffer()),
      fetch('/fonts/Sarabun-Bold.ttf').then((r) => r.arrayBuffer()),
    ]);
    return {
      regular: await doc.embedFont(regularBytes),
      bold: await doc.embedFont(boldBytes),
    };
  } catch {
    return {
      regular: await doc.embedFont(StandardFonts.Helvetica),
      bold: await doc.embedFont(StandardFonts.HelveticaBold),
    };
  }
}

// ─── Signing Footer (every page) ────────────────────────────────────────────

function drawSigningFooter(page: PDFPage, fonts: PdfFonts) {
  const y = MARGIN_BOTTOM - 30;
  const leftText = 'Landlord:________________ผู้ให้เช่า';
  const rightText = 'Tenant:________________ผู้เช่า';
  page.drawText(leftText, {
    x: MARGIN_LEFT,
    y,
    size: SMALL_SIZE,
    font: fonts.regular,
    color: rgb(0.2, 0.2, 0.2),
  });
  const rightWidth = fonts.regular.widthOfTextAtSize(rightText, SMALL_SIZE);
  page.drawText(rightText, {
    x: PAGE_WIDTH - MARGIN_RIGHT - rightWidth,
    y,
    size: SMALL_SIZE,
    font: fonts.regular,
    color: rgb(0.2, 0.2, 0.2),
  });
}

function drawPageNumber(page: PDFPage, font: PDFFont, num: number, total: number) {
  const text = `${num} / ${total}`;
  const w = font.widthOfTextAtSize(text, SMALL_SIZE);
  page.drawText(text, {
    x: PAGE_WIDTH / 2 - w / 2,
    y: MARGIN_BOTTOM - 50,
    size: SMALL_SIZE,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
}

// ─── Text Utilities ─────────────────────────────────────────────────────────

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  if (!text.trim()) return [''];
  if (font.widthOfTextAtSize(text, fontSize) <= maxWidth) return [text];

  const lines: string[] = [];
  // Check Thai density
  const thaiCount = (text.match(/[\u0E00-\u0E7F]/g) || []).length;
  const isThai = thaiCount > text.length * 0.3;

  if (isThai) {
    // Character-level wrap for Thai
    let current = '';
    for (const ch of text) {
      const test = current + ch;
      if (font.widthOfTextAtSize(test, fontSize) > maxWidth && current) {
        lines.push(current);
        current = ch;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  } else {
    // Word-level wrap for English / mixed
    const words = text.split(/(\s+)/);
    let current = '';
    for (const word of words) {
      const test = current + word;
      if (font.widthOfTextAtSize(test, fontSize) > maxWidth && current.trim()) {
        lines.push(current.trimEnd());
        current = word.trimStart();
      } else {
        current = test;
      }
    }
    if (current.trim()) lines.push(current.trimEnd());
  }

  return lines.length > 0 ? lines : [text];
}

/** Detect title line (centered, bold, larger) */
function isTitleLine(line: string): boolean {
  const t = line.trim();
  if (/^(LEASE\s+AGREEMENT|สัญญาเช่า)/i.test(t)) return true;
  if (/^(RESIDENTIAL\s+LEASE|RENTAL\s+(CONTRACT|AGREEMENT))/i.test(t)) return true;
  return false;
}

/** Detect numbered clause start — bold */
function isClauseStart(line: string): boolean {
  const t = line.trim();
  // "1. ...", "12. ...", "ข้อ 1", "Clause 1"
  if (/^\d{1,2}\.\s/.test(t)) return true;
  if (/^(ข้อ|Clause|Article)\s*\d+/i.test(t)) return true;
  return false;
}

/** Detect section label lines (bold) */
function isSectionLabel(line: string): boolean {
  const t = line.trim();
  if (/^(Checklist|Landlord Name|Tenant Name|This contract|Date of Agreement|Address:)/i.test(t))
    return true;
  if (/^(ลงชื่อ|By signing|สัญญาฉบับนี้|For rental)/i.test(t)) return true;
  if (/^-\s*(Refundable|Advance|Total)/i.test(t)) return true;
  return false;
}

// ─── Render Instruction ─────────────────────────────────────────────────────

interface RenderLine {
  text: string;
  font: PDFFont;
  size: number;
  gapBefore: number; // extra vertical space before this line
  centered?: boolean;
  indent?: number; // extra left indent
}

// ─── Main PDF Generator ─────────────────────────────────────────────────────

export async function generateContractPdf(contractText: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle('Lease Agreement / สัญญาเช่า');
  doc.setSubject('Thai Residential Rental Contract');
  doc.setCreator('RentOS');
  doc.setProducer('RentOS Contract Generator');

  const fonts = await loadFonts(doc);

  const rawLines = contractText.split('\n');
  const renderLines: RenderLine[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]!;
    const trimmed = line.trim();

    // Blank line = paragraph gap
    if (!trimmed) {
      renderLines.push({
        text: '',
        font: fonts.regular,
        size: BODY_SIZE,
        gapBefore: PARAGRAPH_GAP,
      });
      continue;
    }

    // Separator lines (===, ---) → horizontal rule gap
    if (/^[=─\-]{3,}$/.test(trimmed)) {
      renderLines.push({ text: '', font: fonts.regular, size: BODY_SIZE, gapBefore: 10 });
      continue;
    }

    const isTitle = isTitleLine(trimmed);
    const isClause = !isTitle && isClauseStart(trimmed);
    const isSection = !isTitle && !isClause && isSectionLabel(trimmed);

    const font = isTitle || isClause || isSection ? fonts.bold : fonts.regular;
    const size = isTitle ? TITLE_SIZE : BODY_SIZE;
    const gapBefore = isTitle ? 12 : isClause ? 10 : 0;

    // Bullet/dash lines get a small indent
    const indent = /^[-•]/.test(trimmed) ? 12 : 0;

    const wrapped = wrapText(trimmed, font, size, CONTENT_WIDTH - indent);

    for (let j = 0; j < wrapped.length; j++) {
      renderLines.push({
        text: wrapped[j]!,
        font,
        size,
        gapBefore: j === 0 ? gapBefore : 0,
        centered: isTitle,
        indent,
      });
    }
  }

  // ─── Paginate & Draw ────────────────────────────────────────────────────
  const pages: PDFPage[] = [];
  let currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  pages.push(currentPage);
  let y = PAGE_HEIGHT - MARGIN_TOP;

  for (const rl of renderLines) {
    const needed = rl.size + rl.gapBefore + 2;

    if (y - needed < MARGIN_BOTTOM) {
      currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pages.push(currentPage);
      y = PAGE_HEIGHT - MARGIN_TOP;
    }

    y -= rl.gapBefore;

    if (rl.text) {
      const textWidth = rl.font.widthOfTextAtSize(rl.text, rl.size);
      const x = rl.centered
        ? MARGIN_LEFT + (CONTENT_WIDTH - textWidth) / 2
        : MARGIN_LEFT + (rl.indent ?? 0);

      currentPage.drawText(rl.text, {
        x,
        y,
        size: rl.size,
        font: rl.font,
        color: rgb(0.1, 0.1, 0.1),
      });
    }

    y -= LINE_HEIGHT;
  }

  // ─── Page Footers ───────────────────────────────────────────────────────
  const total = pages.length;
  pages.forEach((page, i) => {
    drawSigningFooter(page, fonts);
    drawPageNumber(page, fonts.regular, i + 1, total);
  });

  return await doc.save();
}

// ─── Browser Download Helper ────────────────────────────────────────────────

export function downloadPdf(pdfBytes: Uint8Array, filename: string) {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

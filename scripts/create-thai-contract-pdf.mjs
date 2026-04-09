import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';

async function createThaiContractPDF() {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  // Load Tahoma (supports Thai glyphs)
  const fontPath = 'C:/Windows/Fonts/tahoma.ttf';
  const fontBytes = fs.readFileSync(fontPath);
  const font = await doc.embedFont(fontBytes);
  const boldFontBytes = fs.readFileSync('C:/Windows/Fonts/tahomabd.ttf');
  const boldFont = await doc.embedFont(boldFontBytes);

  const page = doc.addPage([595.28, 841.89]); // A4
  const { height } = page.getSize();
  let y = height - 50;
  const left = 50;
  const lineHeight = 20;
  const bodySize = 11;
  const titleSize = 16;
  const headingSize = 13;

  function drawLine(text, options = {}) {
    const f = options.bold ? boldFont : font;
    const size = options.size || bodySize;
    page.drawText(text, { x: left, y, font: f, size, color: rgb(0, 0, 0) });
    y -= options.gap || lineHeight;
  }

  function drawWrapped(text, options = {}) {
    const f = options.bold ? boldFont : font;
    const size = options.size || bodySize;
    const maxWidth = 495;
    const words = text.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      const w = f.widthOfTextAtSize(test, size);
      if (w > maxWidth && line) {
        page.drawText(line, { x: left, y, font: f, size, color: rgb(0, 0, 0) });
        y -= lineHeight;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      page.drawText(line, { x: left, y, font: f, size, color: rgb(0, 0, 0) });
      y -= options.gap || lineHeight;
    }
  }

  // Title
  drawLine('สัญญาเช่าอสังหาริมทรัพย์', { bold: true, size: titleSize, gap: 30 });

  drawLine('ทำที่ กรุงเทพมหานคร', { gap: lineHeight });
  drawLine('วันที่ 1 มกราคม 2569', { gap: 30 });

  // Clause 1
  drawLine('ข้อ 1: การชำระค่าเช่า', { bold: true, size: headingSize, gap: 22 });
  drawWrapped(
    'ผู้เช่าตกลงชำระค่าเช่ารายเดือน จำนวน 15,000 บาท (หนึ่งหมื่นห้าพันบาทถ้วน) ภายในวันที่ 5 ของทุกเดือน โดยโอนเข้าบัญชีธนาคารที่ผู้ให้เช่ากำหนด หากชำระล่าช้า ผู้เช่าต้องจ่ายค่าปรับ 500 บาทต่อวัน',
    { gap: 28 }
  );

  // Clause 2
  drawLine('ข้อ 2: เงินประกัน', { bold: true, size: headingSize, gap: 22 });
  drawWrapped(
    'ผู้เช่าวางเงินประกัน จำนวน 30,000 บาท (สามหมื่นบาทถ้วน) เท่ากับค่าเช่า 2 เดือน เงินประกันจะคืนให้ภายใน 30 วันหลังสิ้นสุดสัญญา หักค่าเสียหาย (ถ้ามี)',
    { gap: 28 }
  );

  // Clause 3
  drawLine('ข้อ 3: การบำรุงรักษา', { bold: true, size: headingSize, gap: 22 });
  drawWrapped(
    'ผู้เช่ามีหน้าที่ดูแลรักษาทรัพย์สินที่เช่าให้อยู่ในสภาพดี การซ่อมแซมเล็กน้อยไม่เกิน 2,000 บาท ผู้เช่ารับผิดชอบเอง การซ่อมแซมใหญ่เป็นความรับผิดชอบของผู้ให้เช่า',
    { gap: 28 }
  );

  // Clause 4
  drawLine('ข้อ 4: การเลี้ยงสัตว์', { bold: true, size: headingSize, gap: 22 });
  drawWrapped(
    'ห้ามเลี้ยงสัตว์ทุกชนิดภายในห้องเช่า หากฝ่าฝืนจะถูกปรับ 5,000 บาท และอาจถูกบอกเลิกสัญญาทันที',
    { gap: 28 }
  );

  // Clause 5
  drawLine('ข้อ 5: การยกเลิกสัญญา', { bold: true, size: headingSize, gap: 22 });
  drawWrapped(
    'หากผู้เช่าต้องการยกเลิกสัญญาก่อนกำหนด ต้องแจ้งล่วงหน้าอย่างน้อย 60 วัน และจะถูกหักเงินประกันเป็นค่าชดเชย ระยะเวลาเช่าเริ่มตั้งแต่ 1 มกราคม 2569 ถึง 31 ธันวาคม 2569',
    { gap: 28 }
  );

  // Signatures
  y -= 30;
  drawLine('ลงชื่อ _________________________ ผู้ให้เช่า', { gap: 30 });
  drawLine('ลงชื่อ _________________________ ผู้เช่า', { gap: 20 });

  const pdfBytes = await doc.save();
  const outPath = path.join(process.cwd(), 'public', 'test-contract.pdf');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, pdfBytes);
  console.log(`PDF created: ${outPath} (${pdfBytes.length} bytes)`);
}

createThaiContractPDF().catch(console.error);

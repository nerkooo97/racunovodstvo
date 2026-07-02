const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function main() {
  const pdfPath = path.join(process.cwd(), 'components/obrazci/H-1-1-PDV-prijava-h.pdf');
  const bytes = fs.readFileSync(pdfPath);
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPages()[0];
  
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const size = 9;

  const fmtInt = (n) => {
    return Math.round(n).toLocaleString("bs-BA");
  };

  const drawLeftAlign = (text, x, y) => {
    page.drawText(String(text), { x, y, size, font, color: rgb(0, 0, 0.5) });
  };

  const drawRightAlignLeftCol = (val, y) => {
    const text = fmtInt(val);
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: 312 - textWidth,
      y,
      size,
      font,
      color: rgb(0, 0, 0.5),
    });
  };

  const drawRightAlignRightCol = (val, y) => {
    const text = fmtInt(val);
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: 522 - textWidth,
      y,
      size,
      font,
      color: rgb(0, 0, 0.5),
    });
  };

  // Header info
  drawLeftAlign("TEST OBRT d.o.o.", 75, 716);
  drawLeftAlign("Adresa bb, Sarajevo", 75, 680);
  
  // Digit boxes
  const vat = "123456789012";
  for (let i = 0; i < vat.length; i++) {
    page.drawText(vat[i], { x: 381 + i * 14.2, y: 726, size: 10, font, color: rgb(0, 0, 0.5) });
  }
  
  const zip = "71000";
  for (let i = 0; i < zip.length; i++) {
    page.drawText(zip[i], { x: 77 + i * 14.2, y: 642, size: 10, font, color: rgb(0, 0, 0.5) });
  }

  drawLeftAlign("Sarajevo", 180, 642);
  drawLeftAlign("06/2026", 400, 682);
  drawLeftAlign("RC Sarajevo", 400, 642);

  // Left Column Values (Izlazi)
  drawRightAlignLeftCol(1000, 612); // Polje 11
  drawRightAlignLeftCol(25000, 572); // Polje 12
  drawRightAlignLeftCol(0, 532); // Polje 13

  // Right Column Values (Ulazi)
  drawRightAlignRightCol(450, 612); // Polje 21
  drawRightAlignRightCol(12500, 572); // Polje 22
  drawRightAlignRightCol(0, 532); // Polje 23

  // PDV calculations
  drawRightAlignRightCol(76, 452); // Polje 41
  drawRightAlignRightCol(2125, 412); // Polje 42
  drawRightAlignRightCol(0, 372); // Polje 43
  drawRightAlignRightCol(2201, 332); // Polje 61

  drawRightAlignLeftCol(170, 372); // Polje 51
  
  // Diff (51 - 61) = 170 - 2201 = -2031 (credit)
  drawRightAlignLeftCol(2031, 292); // Polje 71
  drawLeftAlign("X", 380, 292); // Polje 80 (Zahtjev za povrat)

  // Krajnja potrošnja
  drawRightAlignLeftCol(2031, 232); // Polje 32
  drawRightAlignLeftCol(0, 192); // Polje 33
  drawRightAlignLeftCol(0, 152); // Polje 34

  // Bottom info
  drawLeftAlign("Sarajevo", 100, 110);
  drawLeftAlign("30.06.2026.", 100, 70);
  drawLeftAlign("Mujo Mujic", 420, 110);

  const outBytes = await doc.save();
  fs.writeFileSync('public/test_pdv_fill.pdf', outBytes);
  console.log('Saved public/test_pdv_fill.pdf');
}
main().catch(console.error);

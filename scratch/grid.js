const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function main() {
  const pdfPath = path.join(process.cwd(), 'components/obrazci/H-1-1-PDV-prijava-h.pdf');
  const bytes = fs.readFileSync(pdfPath);
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPages()[0];
  const { width, height } = page.getSize();

  const font = await doc.embedFont(StandardFonts.Helvetica);

  // Draw local grid lines around amount boxes
  // Y: 100 to 750 (with step 10), X: 50 to 550 (with step 10)
  
  // Horizontal lines with labels
  for (let y = 100; y <= 750; y += 10) {
    page.drawLine({
      start: { x: 50, y },
      end: { x: 550, y },
      color: rgb(1, 0, 0),
      thickness: y % 50 === 0 ? 0.6 : 0.2,
    });
    // Labels at x=50 and x=530
    page.drawText(String(y), { x: 35, y: y - 2, size: 6, font, color: rgb(1, 0, 0) });
    page.drawText(String(y), { x: 555, y: y - 2, size: 6, font, color: rgb(1, 0, 0) });
  }

  // Vertical lines with labels
  for (let x = 50; x <= 550; x += 10) {
    page.drawLine({
      start: { x, y: 100 },
      end: { x, y: 750 },
      color: rgb(0, 0, 1),
      thickness: x % 50 === 0 ? 0.6 : 0.2,
    });
    // Labels at y=90 and y=755
    page.drawText(String(x), { x: x - 4, y: 92, size: 5, font, color: rgb(0, 0, 1) });
    page.drawText(String(x), { x: x - 4, y: 755, size: 5, font, color: rgb(0, 0, 1) });
  }

  const outBytes = await doc.save();
  fs.writeFileSync('public/test_pdv_grid_dense.pdf', outBytes);
  console.log('Saved public/test_pdv_grid_dense.pdf');
}
main().catch(console.error);

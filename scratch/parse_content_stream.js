const { PDFDocument, PDFName, PDFContentStream, PDFOperator } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function main() {
  const pdfPath = path.join(process.cwd(), 'components/obrazci/916be-obrazac_1041_knjigaprihodarashoda.pdf');
  const bytes = fs.readFileSync(pdfPath);
  const doc = await PDFDocument.load(bytes);
  
  const pages = doc.getPages();
  console.log('Total pages:', pages.length);
  
  pages.forEach((page, pageIdx) => {
    console.log(`\n--- Page ${pageIdx + 1} ---`);
    const { width, height } = page.getSize();
    console.log(`Dimensions: ${width} x ${height}`);
    
    // We can access the page's content stream
    const contentStream = page.node.getContentStream();
    if (!contentStream) {
      console.log('No content stream found');
      return;
    }
    
    // For pdf-lib, page.node.getContentStream() returns a PDFStream or PDFArray of streams
    // Let's get the text using pdf-lib's internal parser or print operators
  });
}

main().catch(console.error);

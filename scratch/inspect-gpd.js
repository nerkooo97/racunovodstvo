const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function inspect() {
  const pdfBytes = fs.readFileSync('/Users/nermin.karic/projekti/racunovodstvo/racunovodstvo/components/obrazci/a9d63-94b8a-obrazac_gpd_1051_ver1__bos_web2.pdf');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  console.log("Found fields count:", fields.length);
  fields.forEach(f => {
    console.log(`Field: Name="${f.getName()}" Type="${f.constructor.name}"`);
  });
}

inspect().catch(err => console.error(err));

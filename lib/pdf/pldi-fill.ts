import fs from "fs";
import path from "path";
import { PDFDocument, PDFName, PDFHexString, PDFString, PDFDict, PDFBool } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export interface PldiAssetItem {
  name: string;
  acquisition_date: string;
  doc_number: string;
  acquisition_value: number;
  kv_start: number;
  years: number;
  rate: number;
  sale_date?: string;
  written_off?: boolean;
}

export interface PldiFillData {
  year: string;
  jmb: string;
  fullName: string;
  address: string;
  jib: string;
  businessName: string;
  businessAddress: string;
  activityCode: string;
  activityName: string;
  manualPeriod: boolean;
  rows: PldiAssetItem[];
}

function fmt(n: number | undefined): string {
  if (n === undefined || n === null || isNaN(n)) return "0,00";
  return n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatDateBcs(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}.`;
  }
  return dateStr;
}

export async function generateFilledPldiPdf(data: PldiFillData): Promise<Uint8Array> {
  const templatePath = path.join(process.cwd(), "components", "obrazci", "69756-pldi_bs_int2.pdf");
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);

  const form = pdfDoc.getForm();

  // NeedAppearances so values are rendered automatically by PDF viewers
  const rawAcroForm = pdfDoc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
  if (rawAcroForm) {
    rawAcroForm.set(PDFName.of("NeedAppearances"), PDFBool.True);
  }

  const BASE_FONT_SIZE = 9.5;
  const MIN_FONT_SIZE = 6.0;
  const CHAR_WIDTH_RATIO = 0.55;
  const FIELD_PADDING = 4;

  const setText = (fieldName: string, text: string) => {
    try {
      const field = form.getTextField(fieldName);
      if (!field) return;

      let fieldWidth = Infinity;
      try {
        const widgets = field.acroField.getWidgets();
        if (widgets.length > 0) {
          const rect = widgets[0].getRectangle();
          fieldWidth = rect.width;
        }
      } catch (_) {}

      let fontSize = BASE_FONT_SIZE;
      const availableWidth = fieldWidth - FIELD_PADDING;
      if (availableWidth > 0 && text.length > 0) {
        const textWidth = text.length * CHAR_WIDTH_RATIO * fontSize;
        if (textWidth > availableWidth) {
          fontSize = Math.max(MIN_FONT_SIZE, (availableWidth / text.length) / CHAR_WIDTH_RATIO);
        }
      }

      field.acroField.dict.set(PDFName.of("DA"), PDFString.of(`/Helv ${fontSize.toFixed(1)} Tf 0 g`));

      let val = text || "";
      const maxLen = field.getMaxLength();
      if (maxLen !== undefined && maxLen > 0) val = val.slice(0, maxLen);
      let hex = "FEFF";
      for (let i = 0; i < val.length; i++) {
        hex += val.charCodeAt(i).toString(16).padStart(4, "0");
      }
      field.acroField.dict.set(PDFName.of("V"), PDFHexString.of(hex));
      field.acroField.dict.delete(PDFName.of("AP"));
    } catch (e) {}
  };

  // Header info
  setText("1 JMB", data.jmb);
  setText("2 Prezime i ime", data.fullName);
  setText("3 Adresa", data.address);
  setText("4 JIB", data.jib);
  setText("5 Naziv", data.businessName);
  setText("6 Adresa", data.businessAddress);
  
  const activityText = data.activityCode && data.activityName
    ? `${data.activityCode} - ${data.activityName}`
    : data.activityCode || data.activityName || "";
  setText("7 Vrsta djelatnosti šifra naziv", activityText);

  setText("Period", `01.01.${data.year} - 31.12.${data.year}`);
  setText("Stranica", "1");
  setText("Od", "1");

  // Sum calculations
  let totalAcquisition = 0;
  let totalKvStart = 0;
  let totalAmort = 0;
  let totalKvEnd = 0;

  // Fill up to 8 rows
  const maxRows = 8;
  for (let i = 0; i < maxRows; i++) {
    const rowIdx = i;
    const rowNum = i + 1;

    if (i < data.rows.length) {
      const asset = data.rows[i];
      const isInactive = asset.written_off || !!asset.sale_date;

      const kvS = asset.kv_start;
      const rate = asset.rate;
      const amortVal = isInactive ? 0 : Math.round(kvS * (rate / 100) * 100) / 100;
      const kvE = isInactive ? 0 : Math.max(0, Math.round((kvS - amortVal) * 100) / 100);

      totalAcquisition += asset.acquisition_value;
      totalKvStart += kvS;
      totalAmort += amortVal;
      totalKvEnd += kvE;

      setText(`8 Red br.${rowIdx}`, String(rowNum));
      setText(`Text1.${rowIdx}`, asset.name);
      setText(`10 Datum nabavke ili ulaganjaRow${rowNum}`, formatDateBcs(asset.acquisition_date));
      setText(`11 Broj dokumentaRow${rowNum}`, asset.doc_number);
      setText(`12 Nabavna vrijednostRow${rowNum}`, fmt(asset.acquisition_value));
      setText(`13 Knjigovodstvena vrijednostRow${rowNum}`, fmt(kvS));
      setText(`14 Vijek trajanjaRow${rowNum}`, String(asset.years));
      setText(`15 Stopa amortizacijeRow${rowNum}`, fmt(rate));
      setText(`16 Iznos amortizacije Kolone 12 x 15  100Row${rowNum}`, fmt(amortVal));
      setText(`17 Knjigovodsve na vrijednost sredstava na kraju godine Kolone 13  16Row${rowNum}`, fmt(kvE));
    } else {
      // Clear remaining row fields
      setText(`8 Red br.${rowIdx}`, "");
      setText(`Text1.${rowIdx}`, "");
      setText(`10 Datum nabavke ili ulaganjaRow${rowNum}`, "");
      setText(`11 Broj dokumentaRow${rowNum}`, "");
      setText(`12 Nabavna vrijednostRow${rowNum}`, "");
      setText(`13 Knjigovodstvena vrijednostRow${rowNum}`, "");
      setText(`14 Vijek trajanjaRow${rowNum}`, "");
      setText(`15 Stopa amortizacijeRow${rowNum}`, "");
      setText(`16 Iznos amortizacije Kolone 12 x 15  100Row${rowNum}`, "");
      setText(`17 Knjigovodsve na vrijednost sredstava na kraju godine Kolone 13  16Row${rowNum}`, "");
    }
  }

  // Totals
  setText("12 Nabavna vrijednostUkupno za sve stranice  prijenos", fmt(totalAcquisition));
  setText("13 Knjigovodstvena vrijednostUkupno za sve stranice  prijenos", fmt(totalKvStart));
  setText("16 Iznos amortizacije Kolone 12 x 15  100", fmt(totalAmort));
  setText("17 Knjigovodsve na vrijednost sredstava na kraju godine Kolone 13  16", fmt(totalKvEnd));

  return await pdfDoc.save({ updateFieldAppearances: false });
}

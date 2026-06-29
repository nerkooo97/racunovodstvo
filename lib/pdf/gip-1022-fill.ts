import fs from "fs";
import path from "path";
import { PDFDocument, PDFName, PDFHexString, PDFString, PDFDict, PDFBool } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export interface Gip1022MonthItem {
  month: number; // 1 - 12
  year: number;
  paymentDate?: string;
  grossSalary: number;
  benefits?: number;
  empPio: number;
  empHealth: number;
  empUnemp: number;
  empTotal: number;
  incomeNetDeducted: number;
  deductionFactor?: number;
  personalDeduction: number;
  taxBase: number;
  incomeTax: number;
  netPayout: number;
}

export interface Gip1022FillData {
  year: number;
  orgName: string;
  orgJib: string;
  orgAddress?: string;
  employeeName: string;
  employeeJmbg: string;
  employeeAddress?: string;
  fillDate: string;
  items: Gip1022MonthItem[];
}

function fmt(n: number | undefined): string {
  if (n === undefined || n === null || isNaN(n)) return "0,00";
  return n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export async function generateFilledGip1022Pdf(data: Gip1022FillData): Promise<Uint8Array> {
  const templatePath = path.join(process.cwd(), "components", "obrazci", "0873f-gip-1022_bs_int2.pdf.pdf");
  const templateBytes = fs.readFileSync(templatePath);

  // Direktno punimo template — ne koristimo copyPages da ne gubimo AcroForm podatke
  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);

  const form = pdfDoc.getForm();

  // Postavljamo NeedAppearances=true da preglednik sam renderuje vrijednosti iz V dict-a
  const rawAcroForm = pdfDoc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
  if (rawAcroForm) {
    rawAcroForm.set(PDFName.of("NeedAppearances"), PDFBool.True);
  }

  const BASE_FONT_SIZE = 9.5;
  const MIN_FONT_SIZE = 6.0;
  // Prosječna širina karaktera u Helvetica kao udio veličine fonta
  const CHAR_WIDTH_RATIO = 0.55;
  const FIELD_PADDING = 4; // lijevi + desni padding unutar polja

  const setText = (fieldName: string, text: string) => {
    try {
      const field = form.getTextField(fieldName);
      if (!field) return;

      // Dohvati širinu polja iz widget rect-a
      let fieldWidth = Infinity;
      try {
        const widgets = field.acroField.getWidgets();
        if (widgets.length > 0) {
          const rect = widgets[0].getRectangle();
          fieldWidth = rect.width;
        }
      } catch (_) {}

      // Izračunaj potrebnu veličinu fonta
      let fontSize = BASE_FONT_SIZE;
      const availableWidth = fieldWidth - FIELD_PADDING;
      if (availableWidth > 0 && text.length > 0) {
        const textWidth = text.length * CHAR_WIDTH_RATIO * fontSize;
        if (textWidth > availableWidth) {
          fontSize = Math.max(MIN_FONT_SIZE, (availableWidth / text.length) / CHAR_WIDTH_RATIO);
        }
      }

      const fontDa = PDFString.of(`/Helv ${fontSize.toFixed(1)} Tf 0 g`);
      field.acroField.dict.set(PDFName.of("DA"), fontDa);

      let val = text || "";
      const maxLen = field.getMaxLength();
      if (maxLen !== undefined && maxLen > 0) val = val.slice(0, maxLen);
      let hex = "FEFF";
      for (let i = 0; i < val.length; i++) {
        hex += val.charCodeAt(i).toString(16).padStart(4, "0");
      }
      field.acroField.dict.set(PDFName.of("V"), PDFHexString.of(hex));
      // Brišemo stari AP da prisilimo regeneraciju s novim fontom
      field.acroField.dict.delete(PDFName.of("AP"));
    } catch (e) {}
  };


  // Header
  setText("20", String(data.year).slice(-2)); // "20" je odštampano u predlošku, upisujemo samo zadnje 2 cifre
  setText("undefined", data.orgJib);
  setText("undefined_2", data.employeeJmbg);
  setText("2 Naziv", data.orgName);
  setText("5 Prezime  i  ime", data.employeeName);
  setText("3 Adresa sjedišta", data.orgAddress || "");
  setText("6 Adresa prebivališta", data.employeeAddress || "");

  const allFields = form.getFields().map((f) => f.getName());

  let totGross = 0;
  let totBenefits = 0;
  let totPio = 0;
  let totHealth = 0;
  let totUnemp = 0;
  let totContrib = 0;
  let totNetDeducted = 0;
  let totDeductions = 0;
  let totTaxBase = 0;
  let totTax = 0;
  let totNetPayout = 0;

  const monthMap = new Map<number, Gip1022MonthItem>();
  data.items.forEach((it) => monthMap.set(it.month, it));

  for (let r = 1; r <= 12; r++) {
    const startIdx = 7 + (r - 1) * 17;
    const rf = allFields.slice(startIdx, startIdx + 17);
    if (rf.length < 17) continue;

    const it = monthMap.get(r);
    const mStr = String(r).padStart(2, "0");

    if (it) {
      const gross = it.grossSalary || 0;
      const benefits = it.benefits || 0;
      const totBrutoRow = gross + benefits;
      const pio = it.empPio || 0;
      const health = it.empHealth || 0;
      const unemp = it.empUnemp || 0;
      const contrib = it.empTotal || (pio + health + unemp);
      const netDed = it.incomeNetDeducted || (totBrutoRow - contrib);
      const factor = it.deductionFactor ?? 1.0;
      const dedAmt = it.personalDeduction || 0;
      const taxBase = it.taxBase || 0;
      const tax = it.incomeTax || 0;
      const netPay = it.netPayout || (netDed - tax);

      totGross += gross;
      totBenefits += benefits;
      totPio += pio;
      totHealth += health;
      totUnemp += unemp;
      totContrib += contrib;
      totNetDeducted += netDed;
      totDeductions += dedAmt;
      totTaxBase += taxBase;
      totTax += tax;
      totNetPayout += netPay;

      setText(rf[0], mStr);
      setText(rf[1], `${mStr}/${data.year}`);
      setText(rf[2], "1");
      setText(rf[3], fmt(gross));
      setText(rf[4], fmt(benefits));
      setText(rf[5], fmt(totBrutoRow));
      setText(rf[6], fmt(pio));
      setText(rf[7], fmt(health));
      setText(rf[8], fmt(unemp));
      setText(rf[9], fmt(contrib));
      setText(rf[10], fmt(netDed));
      setText(rf[11], factor.toFixed(1));
      setText(rf[12], fmt(dedAmt));
      setText(rf[13], fmt(taxBase));
      setText(rf[14], fmt(tax));
      setText(rf[15], fmt(netPay));
      setText(rf[16], it.paymentDate || data.fillDate);
    } else {
      setText(rf[0], mStr);
      setText(rf[1], `${mStr}/${data.year}`);
    }
  }

  // Ukupno red
  setText("4 Iznos prihoda u novcuUkupno", fmt(totGross));
  setText("5 Iznos prihoda u stvarima ili uslugamaUkupno", fmt(totBenefits));
  setText("fill_209", fmt(totGross + totBenefits));
  setText("7 Iznos za penzijsko i invalidsko osiguranje 17Ukupno", fmt(totPio));
  setText("8 Iznos za zdravstveno osiguranje 125Ukupno", fmt(totHealth));
  setText("9 Iznos za osiguranje  od Nezaposle  nosti 15Ukupno", fmt(totUnemp));
  setText("10 Ukupni doprinosi 31 kolone 789Ukupno", fmt(totContrib));
  setText("fill_214", fmt(totNetDeducted));
  setText("fill_216", fmt(totDeductions));
  setText("14 Osnovica poreza kolona 11  13Ukupno", fmt(totTaxBase));
  setText("fill_218", fmt(totTax));
  setText("fill_219", fmt(totNetPayout));
  setText("Datum", data.fillDate);

  // Preimenovanje polja da izbjegnemo dupliranje kada se spaja više dokumenata
  const suffix = data.employeeJmbg ? `_${data.employeeJmbg.replace(/\D/g, "")}` : `_${Math.random().toString(36).substring(2, 7)}`;
  form.getFields().forEach((f) => {
    try {
      const originalName = f.getName();
      f.acroField.dict.set(PDFName.of("T"), PDFString.of(originalName + suffix));
    } catch (_) {}
  });

  return await pdfDoc.save({ updateFieldAppearances: false });
}

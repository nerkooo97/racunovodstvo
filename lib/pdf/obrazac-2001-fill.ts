import fs from "fs";
import path from "path";
import { PDFDocument, PDFName, PDFHexString, PDFString, PDFDict, PDFBool } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export interface Obrazac2001FillData {
  orgName: string;
  orgJib: string;
  orgAddr?: string;
  orgCity?: string;
  orgActivity?: string;
  employeeCount: number;
  dayStart: string;
  monthStart: string;
  yearStart: string;
  dayEnd: string;
  monthEnd: string;
  yearEnd: string;
  grossMoney: number;
  grossBenefits: number;
  grossTotal: number;
  empPio: number;
  empHealth: number;
  empUnemp: number;
  empTotal: number;
  erpPio: number;
  erpHealth: number;
  erpUnemp: number;
  erpTotal: number;
  totalPio: number;
  totalHealth: number;
  totalUnemp: number;
  incomeTax: number;
  grandTotal: number;
  isObrt: boolean;
  fillDate: string;
}

function fmt(n: number): string {
  return n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export async function generateFilledObrazac2001Pdf(data: Obrazac2001FillData): Promise<Uint8Array> {
  const templatePath = path.join(process.cwd(), "components", "obrazci", "3d69d-0540c-obrazac-2001-bos.pdf");
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);

  const form = pdfDoc.getForm();

  // NeedAppearances — preglednik sam renderuje vrijednosti iz V dict-a
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

      // Dohvati širinu polja za auto-shrink
      let fieldWidth = Infinity;
      try {
        const widgets = field.acroField.getWidgets();
        if (widgets.length > 0) {
          const rect = widgets[0].getRectangle();
          fieldWidth = rect.width;
        }
      } catch (_) {}

      // Izračunaj font size
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

  const checkCB = (cbName: string) => {
    try {
      const cb = form.getCheckBox(cbName);
      if (cb) cb.check();
    } catch (e) {}
  };

  // 1. Podaci o obvezniku
  setText("1 Naziv", data.orgName);
  setText("JIB/JMB", data.orgJib);
  setText("3 Adresa", data.orgAddr || "");
  setText("4 Opcina", data.orgCity || "");
  setText("6 Vrsta djelatnosti šifra naziv", data.orgActivity || "");
  setText("7 Broj zaposlenih", String(data.employeeCount));

  // 5. Period u kojem je obavljen rad (OD / DO) (Dan/Mjesec/Godina)
  setText("Text4.0.0", data.dayStart);   // Dan od
  setText("Text4.0.1", data.monthStart); // Mjesec od
  setText("Text2",     data.yearStart);  // Godina od

  setText("Text4.1.0", data.dayEnd);     // Dan do
  setText("Text4.1.1", data.monthEnd);   // Mjesec do
  setText("Text3",     data.yearEnd);    // Godina do

  // Vrsta obračuna (Doprinosa i poreza)
  checkCB("a Doprinosa i poreza");

  // Place u novcu i ukupno
  setText("8 Place u novcu", fmt(data.grossMoney));
  setText("9 place u stvarima i ili uslugama", data.grossBenefits > 0 ? fmt(data.grossBenefits) : "0,00");
  setText("10 Ukupne place", fmt(data.grossTotal));

  // Stopa i iznosi doprinosa IZ plate
  setText("c StopaDoprinosi za penzijsko i invalidsko osiguranje", "17,00%");
  setText("d IznosDoprinosi za penzijsko i invalidsko osiguranje", fmt(data.empPio));

  setText("c StopaDoprinosi za zdravstveno osiguranje", "12,50%");
  setText("d IznosDoprinosi za zdravstveno osiguranje", fmt(data.empHealth));

  setText("c StopaDoprinosi za osiguranje od nezaposlenosti", "1,50%");
  setText("d IznosDoprinosi za osiguranje od nezaposlenosti", fmt(data.empUnemp));

  setText("Ukupni doprinosi 14  15  16 Iznos", fmt(data.empTotal));

  // Stopa i iznosi doprinosa NA platu
  const pioNaRate = data.isObrt ? "2,50%" : "6,00%";
  const zdrNaRate = data.isObrt ? "2,00%" : "4,00%";

  setText("c StopaDoprinosi za penzijsko i invalidsko osiguranje_2", pioNaRate);
  setText("d IznosDoprinosi za penzijsko i invalidsko osiguranje_2", fmt(data.erpPio));

  setText("c StopaDoprinosi za zdravstveno osiguranje_2", zdrNaRate);
  setText("d IznosDoprinosi za zdravstveno osiguranje_2", fmt(data.erpHealth));

  setText("c StopaDoprinosi za osiguranje od nezaposlenosti_2", "0,50%");
  setText("d IznosDoprinosi za osiguranje od nezaposlenosti_2", fmt(data.erpUnemp));

  setText("d Ukupni doprinosi 18+19+20+21+22 Iznos", fmt(data.erpTotal));

  // Zbirni doprinosi i porez
  setText("d IznosDoprinosi za penzijsko i invalidsko osiguranje 14  18  21", fmt(data.totalPio));
  setText("d IznosDoprinosi za zdravstveno osiguranje 15  19  22", fmt(data.totalHealth));
  setText("d IznosDoprinosi za osiguranje od nezaposlenosti  16  20", fmt(data.totalUnemp));
  setText("d IznosPorez na dohodak", fmt(data.incomeTax));
  setText("d IznosUkupne obaveze 24  25  26  27", fmt(data.grandTotal));

  // Datum (bez dodavanja potpisa obveznika Text73!)
  setText("Datum", data.fillDate);

  return await pdfDoc.save({ updateFieldAppearances: false });
}

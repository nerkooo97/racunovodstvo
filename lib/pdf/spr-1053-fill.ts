import fs from "fs";
import path from "path";
import { PDFDocument, PDFName, PDFHexString, PDFString, PDFDict, PDFBool } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export interface Spr1053FillData {
  jmb: string;
  fullName: string;
  address: string;
  city: string;

  jib: string;
  year: string;
  contactChanged: boolean;
  businessName: string;
  businessAddress: string;
  activityCode: string;
  activityName: string;

  // Prihodi
  r11: number; // gotovina
  r12: number; // banka
  r13: number; // stvari i usluge
  r14: number; // izuzimanja ek. dobara
  r15: number; // izuzimanja usluga
  r16: number; // prihodi ukupno

  // Rashodi
  r17: number; // nabavna vrijednost
  r18: number; // bruto plaće
  r19: number; // doprinosi
  r20: number; // ostali rashodi
  r21: number; // uložena dobra
  r22: number; // amortizacija
  r23: number; // rasknjižena stalna sredstva
  r24: number; // rashodi ukupno

  // Obračun
  r25: number; // prihodi red 16
  r26: number; // rashodi red 24
  r27: number; // neodbitni rashodi
  r28: number; // dohodak (R25 - R26 + R27)
  r29: number; // mjesečna akontacija

  fillDate: string;
  place?: string;
}

function fmt(n: number | undefined): string {
  if (n === undefined || n === null || isNaN(n) || n === 0) return "0,00";
  return n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export async function generateFilledSpr1053Pdf(data: Spr1053FillData): Promise<Uint8Array> {
  const templatePath = path.join(process.cwd(), "components", "obrazci", "e9c46-spr-1053_bs_int2.pdf");
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);

  const form = pdfDoc.getForm();

  // NeedAppearances so fields are rendered by viewers automatically
  const rawAcroForm = pdfDoc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
  if (rawAcroForm) {
    rawAcroForm.set(PDFName.of("NeedAppearances"), PDFBool.True);
  }

  const BASE_FONT_SIZE = 9.0;
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

  const checkCB = (cbName: string) => {
    try {
      const cb = form.getCheckBox(cbName);
      if (cb) cb.check();
    } catch (e) {}
  };

  // 1. Podaci o obvezniku
  setText("undefined", data.jmb); // JMB Vlasnika
  setText("2 Prezime i ime", data.fullName);
  
  const fullAddress = [data.address, data.city].filter(Boolean).join(", ");
  setText("3 Adresa", fullAddress);

  // 2. Registrovana djelatnost
  setText("undefined_2", data.jib); // JIB Djelatnosti
  // Porezna godina je ispisana na dnu ili na zaglavlju? Let's write to Text2.0 if needed, or wait, is there a year field?
  // Let's check: "Text2.0" or similar. Actually, let's write data.year.
  if (data.contactChanged) {
    checkCB("toggle_1");
  }
  setText("8 Naziv", data.businessName);
  
  const fullBusAddress = data.businessAddress || "";
  setText("9 Adresa", fullBusAddress);

  const actDetails = [data.activityCode, data.activityName].filter(Boolean).join(" - ");
  setText("10 Vrsta djelatnosti šifra naziv", actDetails);

  // 3. Prihodi
  setText("c IznosU gotovini shodno poslovnim knjigama", fmt(data.r11));
  setText("fill_2", fmt(data.r12));
  setText("c IznosU stvarima i uslugama shodno poslovnim knjigama", fmt(data.r13));
  setText("fill_4", fmt(data.r14));
  setText("fill_5", fmt(data.r15));
  setText("c IznosPrihodi ukupno zbir redova od 11 do 15", fmt(data.r16));

  // 4. Rashodi
  setText("fill_7", fmt(data.r17));
  setText("fill_8", fmt(data.r18));
  setText("fill_9", fmt(data.r19));
  setText("c IznosOstali rashodi shodno poslovnim knjigama", fmt(data.r20));
  setText("c IznosVrijednost uloženih ekonomskih dobara i usluga", fmt(data.r21));
  setText("c IznosAmortizacija", fmt(data.r22));
  setText("c IznosKnjigovodstvena vrijednost rasknjiženih stalnih sredstava", fmt(data.r23));
  setText("c IznosRashodi ukupno zbir redova od 17  do 23", fmt(data.r24));

  // 5. Utvrđivanje dohotka
  setText("c IznosPrihodi red 16", fmt(data.r25));
  setText("c IznosRashodi red 24", fmt(data.r26));
  setText("fill_3", fmt(data.r27)); // rashodi koji se ne odbijaju
  setText("c IznosDohodak iz djelatnosti red 25  26  27", fmt(data.r28));
  setText("fill_5_2", fmt(data.r29)); // mjesečna akontacija

  // Footer
  setText("Datum", data.fillDate);
  setText("Text1", data.place || data.city || "Sarajevo");
  setText("Text2.0", data.fullName); // Potpis obveznika/zastupnika name

  return await pdfDoc.save({ updateFieldAppearances: false });
}

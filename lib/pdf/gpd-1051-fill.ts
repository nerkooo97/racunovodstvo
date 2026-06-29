import fs from "fs";
import path from "path";
import { PDFDocument, PDFName, PDFHexString, PDFString, PDFDict, PDFBool } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export interface Gpd1051FillData {
  jmb: string;
  fullName: string;
  address: string;
  city: string;
  contactChanged: boolean;
  year: string;
  phone?: string;
  email?: string;

  // Prihodi (c = gubitak/rashod, d = dobit/prihod)
  r8d: number; // nesamostalna (plate)
  r9d: number; // samostalna (dobit)
  r9c: number; // samostalna (gubitak)
  r10d: number; // poljoprivreda (dobit)
  r10c: number; // poljoprivreda (gubitak)
  r11d: number; // iznajmljivanje (dobit)
  r11c: number; // iznajmljivanje (gubitak)
  r12d: number; // ustupanje prava (dobit)
  r12c: number; // ustupanje prava (gubitak)
  r13d: number; // druge samostalne (dobit)
  r13c: number; // druge samostalne (gubitak)
  r14c: number; // poslovni gubitak iz ranijih godina

  // Odbici
  taxCoeff: number; // koeficijent
  r18: number; // lični odbitak (3600 * coeff)
  r19: number; // zdravstvene usluge
  r20: number; // stambeni kredit
  r21: number; // ukupni odbici (r18 + r19 + r20)

  // Obračun
  r22: number; // ukupni gubitak
  r23: number; // ukupan dohodak
  r24: number; // ukupni odbici (R21)
  r25: number; // osnovica
  r26: number; // obaveza (10%)
  r27: number; // umanjenje poreza
  r28: number; // porez po odbitku
  r29: number; // uplaćene akontacije
  r30: number; // plaćeno u inostranstvu
  r31: number; // razlika (R26 - R27 - R28 - R29 - R30)
  
  paymentChoice: "a" | "b"; // a = akontacija, b = povrat
  fillDate: string;
  place?: string;
}

function fmt(n: number | undefined): string {
  if (n === undefined || n === null || isNaN(n) || n === 0) return "0,00";
  return n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function fmtCoeff(n: number | undefined): string {
  if (n === undefined || n === null || isNaN(n)) return "1,0";
  return n.toFixed(1).replace(".", ",");
}

export async function generateFilledGpd1051Pdf(data: Gpd1051FillData): Promise<Uint8Array> {
  const templatePath = path.join(process.cwd(), "components", "obrazci", "a9d63-94b8a-obrazac_gpd_1051_ver1__bos_web2.pdf");
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
  setText("1 JMB", data.jmb);
  setText("2 Prezime i ime", data.fullName);
  
  const fullAddress = [data.address, data.city].filter(Boolean).join(", ");
  setText("3 Adresa", fullAddress);
  setText("6 Telefon", data.phone || "");
  setText("7 email", data.email || "");
  setText("Porezna godina", data.year);

  if (data.contactChanged) {
    checkCB("toggle_1");
  }

  // 2. Prijava prihoda
  // Column D (Dobit)
  setText("d Iznos dobitiRow1", fmt(data.r8d)); // R8 (Plate)
  setText("fill_14", fmt(data.r9d)); // R9 (Samostalna dobit)
  setText("fill_15", fmt(data.r10d)); // R10 (Poljoprivreda dobit)
  setText("fill_16", fmt(data.r11d)); // R11 (Iznajmljivanje dobit)
  setText("fill_17", fmt(data.r12d)); // R12 (Ustupanje prava dobit)
  setText("d Iznos dobitiDohodak od drugih samostalnih djelatnosti koje nisu navedene ovdje  veza sa obrascima AUG1031 kolona 13 i  ASD1032 kolona 10", fmt(data.r13d)); // R13 (Druge djelatnosti dobit)

  // Column C (Gubitak)
  setText("fill_2", fmt(data.r9c)); // R9 (Samostalna gubitak)
  setText("fill_3", fmt(data.r10c)); // R10 (Poljoprivreda gubitak)
  setText("fill_4", fmt(data.r11c)); // R11 (Iznajmljivanje gubitak)
  setText("fill_5", fmt(data.r12c)); // R12 (Ustupanje prava gubitak)
  setText("Dohodak od drugih samostalnih djelatnosti koje nisu navedene ovdje  veza sa obrascima AUG1031 kolona 13 i  ASD1032 kolona 10", fmt(data.r13c)); // R13 (Druge djelatnosti gubitak)
  setText("Poslovni gubitak iz ranijih godina", fmt(data.r14c)); // R14 (Raniji gubitak)

  // Sums (R15, R16, R17)
  const totalC_incomes = data.r9c + data.r10c + data.r11c + data.r12c + data.r13c + data.r14c;
  const totalD_incomes = data.r8d + data.r9d + data.r10d + data.r11d + data.r12d + data.r13d;
  
  setText("Unijeti ukupan iznos kolone c sabrati redove od 9 do 14 Unijeti ukupan iznos kolone d sabrati redove od 8 do 13", fmt(totalC_incomes)); // Sabir kolone C
  setText("d Iznos dobitiUnijeti ukupan iznos kolone c sabrati redove od 9 do 14 Unijeti ukupan iznos kolone d sabrati redove od 8 do 13", fmt(totalD_incomes)); // Sabir kolone D

  setText("fill_21", fmt(data.r22)); // R16: Ukupni gubitak
  setText("undefined", fmt(data.r23)); // R17: Ukupna dobit

  // 3. Lični odbici
  setText("fill_9", fmtCoeff(data.taxCoeff)); // R18: Koeficijent
  setText("fill_10", fmt(data.r19)); // R19: Zdravstvo
  setText("fill_11", fmt(data.r20)); // R20: Kamata stambena
  setText("c IznosUkupni odbici sabrati redove od 18 do 20", fmt(data.r21)); // R21: Ukupni odbici

  // 4. Obračun poreza
  setText("c IznosUkupni gubitak za godinu  ukoliko je u dijelu 2  red 16 kolona c unesen gubitak", fmt(data.r22));
  setText("c IznosUkupan dohodak za godinu  ukoliko je u dijelu 2  red 17 kolona d unesen dohodak", fmt(data.r23));
  setText("c IznosUkupni odbici u dijelu 3 red 21", fmt(data.r24));
  setText("c IznosOsnovica poreza na dohodak  red 23  22  24", fmt(data.r25));
  setText("c IznosIznos porezne obaveze red 25 x 01", fmt(data.r26));

  // Akontacije i razlike
  setText("fill_6", fmt(data.r27)); // R27: Umanjenje
  setText("c IznosPorez po odbitku", fmt(data.r28)); // R28: Porez po odbitku
  setText("fill_8", fmt(data.r29)); // R29: Akontacije
  setText("fill_9_2", fmt(data.r30)); // R30: Inostranstvo
  setText("c IznosRazlika poreza za doplatu  za povrat  26 27 28 29 30", fmt(data.r31)); // R31: Razlika

  // Choice for refund
  if (data.r31 < 0) {
    if (data.paymentChoice === "b") {
      checkCB("b Prijavljujem se za povrat ovog poreza");
    } else {
      checkCB("toggle_11"); // option a
    }
  }

  setText("Datum", data.fillDate);
  setText("Text14", data.place || data.city || "Sarajevo");

  return await pdfDoc.save({ updateFieldAppearances: false });
}

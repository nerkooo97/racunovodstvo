import fs from "fs";
import path from "path";
import { PDFDocument, PDFName, PDFHexString, PDFString, PDFDict, PDFBool } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export interface Zo3FamilyMember {
  jmbg: string;
  fullName: string;
  relationship: string;
}

export interface Zo3FillData {
  // Zaglavlje
  cantonCode?: string;
  cantonName?: string;
  office?: string;

  // Poslodavac
  orgName: string;
  orgJib: string;
  orgAddress?: string;
  orgCity?: string;
  regNumber?: string;
  activityCode?: string;
  activityName?: string;
  weeklyHoursObl?: string;

  // Radnik
  employeeJmbg: string;
  lastName: string;
  firstName: string;
  maidenName?: string;
  streetAddress?: string;
  city?: string;
  postalCode?: string;
  occupationName?: string;
  occupationCode?: string;
  hireDate?: string;
  citizenship?: string;
  weeklyHoursEmp?: string;
  insCode?: string;
  insDesc?: string;
  endDate?: string;
  changeDate?: string;
  changeType?: string;
  changeTypeName?: string;

  // Članovi porodice
  members?: Zo3FamilyMember[];

  // Potpis
  note?: string;
  place?: string;
  signDate?: string;
}

function formatDateBcs(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}.`;
  }
  return dateStr;
}

export async function generateFilledZo3Pdf(data: Zo3FillData): Promise<Uint8Array> {
  const templatePath = path.join(process.cwd(), "components", "obrazci", "zo3-bosanski.pdf");
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);

  const form = pdfDoc.getForm();

  // NeedAppearances so fields are rendered by viewers automatically
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

  // 1. Područni ured / kanton
  const puText = [data.cantonName, data.office].filter(Boolean).join(" - ");
  setText("fill_1", puText);

  // 2. Poslodavac info
  const orgNameAndSjedište = [data.orgName, data.orgAddress, data.orgCity].filter(Boolean).join(", ");
  setText("NAZIV I SJEDIŠTE OBVEZNIKA UPLATE DOPRINOSA", orgNameAndSjedište);
  setText("jedinstveni", data.orgJib);
  setText("REG", data.regNumber || "");
  setText("šifra", data.activityCode || "");
  setText("radno vrijeme", data.weeklyHoursObl || "40");

  // 3. Radnik info
  setText("JMBG", data.employeeJmbg);
  setText("Prezime", data.lastName);
  setText("Ime", data.firstName);
  setText("fill_6", data.maidenName || "");
  
  const workerAddress = [data.streetAddress, data.city].filter(Boolean).join(", ");
  setText("Ulica i broj prebivališta", workerAddress);
  setText("broj pošte", data.postalCode || "");
  
  setText("Zanimanje", data.occupationName || "");
  setText("zanimanje", data.occupationCode || "");
  setText("datum stupanja", formatDateBcs(data.hireDate));
  setText("Državljanstvo", data.citizenship || "Bosansko-Hercegovačko");
  setText("Radno vrijeme radno  tjedno", data.weeklyHoursEmp || "40");
  setText("radno vrijeme t", data.weeklyHoursEmp || "40"); // just in case
  
  setText("Osnov osiguranja", data.insDesc || "");
  setText("oo", data.insCode || "");
  
  setText("datum pr", formatDateBcs(data.endDate));
  setText("datum pro", formatDateBcs(data.changeDate));
  
  setText("Vrsta promjene", data.changeTypeName || "");
  setText("VP", data.changeType || "");

  // 4. Family members (up to 10 rows)
  const membersList = data.members || [];
  for (let i = 0; i < 10; i++) {
    const rowNum = i + 1;
    // Map JMBG field index: 19 + i
    const jmbgFieldName = `JMBG ${19 + i}`;
    const nameFieldName = `Prezime i ime ${rowNum}`;
    const relFieldName = `Srodstvo ${rowNum}`;

    if (i < membersList.length) {
      const member = membersList[i];
      setText(jmbgFieldName, member.jmbg);
      setText(nameFieldName, member.fullName);
      setText(relFieldName, member.relationship);
    } else {
      setText(jmbgFieldName, "");
      setText(nameFieldName, "");
      setText(relFieldName, "");
    }
  }

  // 5. Napomena i potpis
  setText("Napomena", data.note || "");
  setText("U", data.place || data.orgCity || "");
  setText("Dana", formatDateBcs(data.signDate || new Date().toISOString().slice(0, 10)));

  return await pdfDoc.save({ updateFieldAppearances: false });
}

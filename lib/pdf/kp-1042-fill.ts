import fs from "fs";
import path from "path";
import { PDFDocument, PDFName, PDFHexString, PDFString, PDFDict, PDFBool } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export interface Kp1042EntryItem {
  entry_number: number;
  entry_date: string;
  document_type: string | null;
  document_number: string | null;
  description: string | null;
  cash_amount: number;
  noncash_amount: number;
  total_amount: number;
}

export interface Kp1042FillData {
  year: number;
  orgName: string;
  orgJib: string;
  orgAddress: string;
  orgCity: string;
  orgActivity: string;
  entries: Kp1042EntryItem[];
}

function fmt(n: number | undefined): string {
  if (n === undefined || n === null || isNaN(n) || n === 0) return "0,00";
  return n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export async function generateFilledKp1042Pdf(data: Kp1042FillData): Promise<Uint8Array> {
  const templatePath = path.join(process.cwd(), "components", "obrazci", "9f5ee-obrazac_1042_knjigaprometaint2.pdf");
  
  const { entries, year, orgName, orgJib, orgAddress, orgCity, orgActivity } = data;

  const BASE_FONT_SIZE = 9.0;
  const MIN_FONT_SIZE = 5.5;
  const CHAR_WIDTH_RATIO = 0.55;
  const FIELD_PADDING = 4;

  const getSetTextHelper = (form: any) => (fieldName: string, text: string) => {
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

  const getRenameFieldsHelper = (form: any) => (suffix: string) => {
    form.getFields().forEach((f: any) => {
      try {
        const originalName = f.getName();
        f.acroField.dict.set(PDFName.of("T"), PDFString.of(originalName + "_" + suffix));
      } catch (_) {}
    });
  };

  // Helper for generating page 1 bytes
  const generatePage1Bytes = async (page1Entries: Kp1042EntryItem[]): Promise<Uint8Array> => {
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    pdfDoc.registerFontkit(fontkit);
    
    // Set NeedAppearances
    const rawAcroForm = pdfDoc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
    if (rawAcroForm) {
      rawAcroForm.set(PDFName.of("NeedAppearances"), PDFBool.True);
    }
    
    // Delete page 2 (index 1)
    if (pdfDoc.getPageCount() > 1) {
      pdfDoc.removePage(1);
    }

    const form = pdfDoc.getForm();
    const setText = getSetTextHelper(form);

    // Header info
    setText("Obrazac KP1042 Knjiga prometa", String(year));
    setText("undefined", orgJib); // JIB
    setText("2 Prezime i ime", orgName); // Prezime i ime / Naziv obrta
    setText("5 Naziv", orgName);
    setText("3 Adresa", `${orgAddress}, ${orgCity}`);
    setText("6 Adresa", orgCity);
    setText("7 Vrsta djelatnosti šifra naziv", orgActivity);

    // Fill table rows
    for (let r = 1; r <= 12; r++) {
      const idx = r - 1;
      if (idx < page1Entries.length) {
        const entry = page1Entries[idx];
        const docInfo = [entry.document_type, entry.document_number].filter(Boolean).join(" br. ");
        
        setText(`8 Red brRow${r}`, String(entry.entry_number));
        setText(`Text1.${idx}`, new Date(entry.entry_date).toLocaleDateString("bs-BA"));
        setText(`Text2.${idx}`, docInfo);
        setText(`Text3.${idx}`, entry.description || "");
        setText(`fill_${2 * r + 1}`, fmt(entry.cash_amount));
        setText(`Text4.${idx}`, fmt(entry.noncash_amount));
        setText(`Text5.${idx}`, fmt(entry.total_amount));
      } else {
        setText(`8 Red brRow${r}`, "");
        setText(`Text1.${idx}`, "");
        setText(`Text2.${idx}`, "");
        setText(`Text3.${idx}`, "");
        setText(`fill_${2 * r + 1}`, "");
        setText(`Text4.${idx}`, "");
        setText(`Text5.${idx}`, "");
      }
    }

    getRenameFieldsHelper(form)(`p1_${Math.random().toString(36).substring(2, 7)}`);
    return await pdfDoc.save({ updateFieldAppearances: false });
  };

  // Helper for generating page 2 bytes (continuation)
  const generatePage2Bytes = async (
    page2Entries: Kp1042EntryItem[],
    donosCash: number,
    donosNoncash: number,
    donosTotal: number,
    pageNum: number
  ): Promise<Uint8Array> => {
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    pdfDoc.registerFontkit(fontkit);

    const rawAcroForm = pdfDoc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
    if (rawAcroForm) {
      rawAcroForm.set(PDFName.of("NeedAppearances"), PDFBool.True);
    }

    // Delete page 1 (index 0)
    pdfDoc.removePage(0);

    const form = pdfDoc.getForm();
    const setText = getSetTextHelper(form);

    // Header info on Page 2
    setText("Obrazac KP1042 Knjiga prometa nastavak", String(year));
    // Suffix page number
    setText("odObrazac KP1042 Knjiga prometa nastavak", String(pageNum));

    // Gotovina field names map for Page 2
    const gotovinaFieldNames = [
      "fill_7_2.0", "fill_12.0", "fill_17_2.0", "fill_22.0", "fill_27.0",
      "fill_32.0", "fill_37.0", "fill_42.0", "fill_47.0", "fill_52.0",
      "fill_57.0", "fill_62.0", "fill_67.0", "fill_72.0", "fill_77.0",
      "fill_82.0", "fill_87.0", "fill_92.0"
    ];

    // Banka field names map for Page 2
    const bankaFieldNames = [
      "fill_7_2.1.0", "fill_12.1.0", "fill_17_2.1.0", "fill_22.1.0", "fill_27.1.0",
      "fill_32.1.0", "fill_37.1.0", "fill_42.1.0", "fill_47.1.0", "fill_52.1.0",
      "fill_57.1.0", "fill_62.1.0", "fill_67.1.0", "fill_72.1.0", "fill_77.1.0",
      "fill_82.1.0", "fill_87.1.0", "fill_92.1.0"
    ];

    // Total field names map for Page 2
    const totalFieldNames = [
      "fill_7_2.1.1", "fill_12.1.1", "fill_17_2.1.1", "fill_22.1.1", "fill_27.1.1",
      "fill_32.1.1", "fill_37.1.1", "fill_42.1.1", "fill_47.1.1", "fill_52.1.1",
      "fill_57.1.1", "fill_62.1.1", "fill_67.1.1", "fill_72.1.1", "fill_77.1.1",
      "fill_82.1.1", "fill_87.1.1", "fill_92.1.1"
    ];

    // Row 1: Carry over (Donos) at the top of Page 2
    setText("Donos  ukupan zbir sa prethodne straniceRow1", "—");
    setText("Donos  ukupan zbir sa prethodne straniceRow1_2", "—");
    setText("Donos  ukupan zbir sa prethodne straniceRow1_3", "—");
    setText("Donos  ukupan zbir sa prethodne straniceRow1_4", "DONOS SA PRETHODNE STRANICE");
    setText("fill_2.0", fmt(donosCash));
    setText("fill_2.1.0", fmt(donosNoncash));
    setText("fill_2.1.1", fmt(donosTotal));

    let pageSumCash = 0;
    let pageSumNoncash = 0;
    let pageSumTotal = 0;

    // Rows 2 to 18 are actual entries for Page 2 (17 entries max)
    for (let r = 2; r <= 18; r++) {
      const idx = r - 2; // Index in the chunk list
      const gotovinaField = gotovinaFieldNames[r - 1];
      const bankaField = bankaFieldNames[r - 1];
      const totalField = totalFieldNames[r - 1];

      if (idx < page2Entries.length) {
        const entry = page2Entries[idx];
        const docInfo = [entry.document_type, entry.document_number].filter(Boolean).join(" br. ");
        
        pageSumCash += entry.cash_amount;
        pageSumNoncash += entry.noncash_amount;
        pageSumTotal += entry.total_amount;

        setText(`Donos  ukupan zbir sa prethodne straniceRow${r}`, String(entry.entry_number));
        setText(`Donos  ukupan zbir sa prethodne straniceRow${r}_2`, new Date(entry.entry_date).toLocaleDateString("bs-BA"));
        setText(`Donos  ukupan zbir sa prethodne straniceRow${r}_3`, docInfo);
        setText(`Donos  ukupan zbir sa prethodne straniceRow${r}_4`, entry.description || "");
        setText(gotovinaField, fmt(entry.cash_amount));
        setText(bankaField, fmt(entry.noncash_amount));
        setText(totalField, fmt(entry.total_amount));
      } else {
        setText(`Donos  ukupan zbir sa prethodne straniceRow${r}`, "");
        setText(`Donos  ukupan zbir sa prethodne straniceRow${r}_2`, "");
        setText(`Donos  ukupan zbir sa prethodne straniceRow${r}_3`, "");
        setText(`Donos  ukupan zbir sa prethodne straniceRow${r}_4`, "");
        setText(gotovinaField, "");
        setText(bankaField, "");
        setText(totalField, "");
      }
    }

    // Row 19: Page Total (Zbir na ovoj stranici)
    setText("fill_92.0", fmt(pageSumCash));
    setText("fill_92.1.0", fmt(pageSumNoncash));
    setText("fill_92.1.1", fmt(pageSumTotal));

    // Row 20: Sveukupno (Grand Total including Donos)
    const grandTotalCash = donosCash + pageSumCash;
    const grandTotalNoncash = donosNoncash + pageSumNoncash;
    const grandTotalTotal = donosTotal + pageSumTotal;

    setText("fill_93.0", fmt(grandTotalCash));
    setText("fill_93.1.0", fmt(grandTotalNoncash));
    setText("fill_93.1.1", fmt(grandTotalTotal));

    getRenameFieldsHelper(form)(`p${pageNum}_${Math.random().toString(36).substring(2, 7)}`);
    return await pdfDoc.save({ updateFieldAppearances: false });
  };

  // If there are no entries, generate empty Page 1
  if (entries.length === 0) {
    return await generatePage1Bytes([]);
  }

  // If `<= 12` entries, generate single Page 1
  if (entries.length <= 12) {
    return await generatePage1Bytes(entries);
  }

  // Otherwise, we have more than 12 unosa. We need page 1 plus continuation pages.
  const mergedPdf = await PDFDocument.create();
  
  // Set NeedAppearances on merged doc
  const { PDFDict: PDict, PDFBool: PBool } = await import("pdf-lib");
  const mergedAcroForm = mergedPdf.context.obj({
    NeedAppearances: PBool.True,
    Fields: mergedPdf.context.obj([]),
  });
  mergedPdf.catalog.set(PDFName.of("AcroForm"), mergedAcroForm);

  // 1. Generate Page 1 (entries 0 to 12)
  const page1Entries = entries.slice(0, 12);
  const p1Bytes = await generatePage1Bytes(page1Entries);
  const p1Doc = await PDFDocument.load(p1Bytes);
  const [p1Page] = await mergedPdf.copyPages(p1Doc, [0]);
  mergedPdf.addPage(p1Page);

  // 2. Generate Page 2+ (continuation pages)
  let currentIndex = 12;
  let pageNum = 2;
  
  // Carry over values
  let donosCash = page1Entries.reduce((sum, e) => sum + e.cash_amount, 0);
  let donosNoncash = page1Entries.reduce((sum, e) => sum + e.noncash_amount, 0);
  let donosTotal = page1Entries.reduce((sum, e) => sum + e.total_amount, 0);

  while (currentIndex < entries.length) {
    const page2Entries = entries.slice(currentIndex, currentIndex + 17); // 17 entries max per continuation page
    const p2Bytes = await generatePage2Bytes(
      page2Entries,
      donosCash,
      donosNoncash,
      donosTotal,
      pageNum
    );
    
    const p2Doc = await PDFDocument.load(p2Bytes);
    const [p2Page] = await mergedPdf.copyPages(p2Doc, [0]);
    mergedPdf.addPage(p2Page);

    // Update donos for the next page
    donosCash += page2Entries.reduce((sum, e) => sum + e.cash_amount, 0);
    donosNoncash += page2Entries.reduce((sum, e) => sum + e.noncash_amount, 0);
    donosTotal += page2Entries.reduce((sum, e) => sum + e.total_amount, 0);

    currentIndex += 17;
    pageNum++;
  }

  return await mergedPdf.save();
}

import fs from "fs";
import path from "path";
import { PDFDocument, PDFName, PDFHexString, PDFString, PDFDict, PDFBool } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export interface Mip1023RowItem {
  vrstaIsplate?: string; // kol 2 (default "1")
  jmbg: string; // kol 3
  municipalityCode?: string; // kol 4 (npr "094")
  paymentDate?: string; // kol 5 (npr "30.06.2026.")
  workHours?: number; // kol 6 (npr 176)
  sickHours?: number; // kol 7 (default 0)
  grossSalary: number; // kol 8 Bruto
  benefits?: number; // kol 9 default 0.00
  taxableIncome?: number; // kol 10
  empPio: number; // kol 11
  employeeName: string; // kol 12
  empHealth: number; // kol 13
  empUnemp: number; // kol 14
  empTotal: number; // kol 15
  incomeNet: number; // kol 16
  deductionFactor?: number; // kol 17 default 1.0
  personalDeduction: number; // kol 18
  taxBase: number; // kol 19
  incomeTax: number; // kol 20
  overtimeHours?: number; // kol 21 default 0
  overtimeDegree?: string; // kol 22 (ne popunjava se ako je 0)
  jobPositionCode?: string; // kol 23 default "0"
  pensionSeniority?: number; // kol 24 default 0.00
}

export interface Mip1023FillData {
  orgName: string;
  orgJib: string;
  orgActivity?: string;
  employeeCount: number;
  year: number;
  month: number;
  totalGross: number;
  totalContribFrom: number;
  totalDeductions: number;
  totalIncomeTax: number;
  erpPio: number;
  erpHealth: number;
  erpUnemp: number;
  erpAdditionalHealth?: number;
  fillDate: string;
  items: Mip1023RowItem[];
}

function fmt(n: number | undefined): string {
  if (n === undefined || n === null || isNaN(n)) return "0,00";
  return n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export async function generateFilledMip1023Pdf(data: Mip1023FillData): Promise<Uint8Array> {
  const templatePath = path.join(process.cwd(), "components", "obrazci", "2c0e6-b95ee-mip-1023_bs_int4.pdf");
  const templateBytes = fs.readFileSync(templatePath);

  const finalPdf = await PDFDocument.create();
  finalPdf.registerFontkit(fontkit);

  const itemsPerPage = 5;
  const totalItems = data.items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const rowMaps = [
    {
      rb: "1", jmbg: "3", munCode: "4", payDate: "5", hours: "6", sickHours: "7",
      gross: "8", benefits: "9", taxIncome: "10", pio: "11", overtimeHours: "21",
      name: "12_2", health: "13", unemp: "14", contribTotal: "15", incomeNet: "16",
      deductionFactor: "17", deductionAmount: "18", taxBase: "19", taxAmount: "20_2",
      jobCode: "23", pensionSeniority: "24"
    },
    {
      rb: "2", jmbg: "3_2", munCode: "undefined_3", payDate: "5_2", hours: "6_2", sickHours: "7_2",
      gross: "8_2", benefits: "9_2", taxIncome: "10_2", pio: "11_2", overtimeHours: "21_2",
      name: "12_4", health: "13_2", unemp: "14_2", contribTotal: "15_2", incomeNet: "16_2",
      deductionFactor: "17_2", deductionAmount: "18_2", taxBase: "19_2", taxAmount: "20_3",
      jobCode: "23_2", pensionSeniority: "24_2"
    },
    {
      rb: "3_3", jmbg: "3_4", munCode: "4_4", payDate: "5_3", hours: "6_3", sickHours: "7_3",
      gross: "8_3", benefits: "9_3", taxIncome: "10_3", pio: "11_3", overtimeHours: "21_3",
      name: "12_6", health: "13_3", unemp: "14_3", contribTotal: "15_3", incomeNet: "16_3",
      deductionFactor: "17_3", deductionAmount: "18_3", taxBase: "19_3", taxAmount: "20_4",
      jobCode: "23_3", pensionSeniority: "24_3"
    },
    {
      rb: "4_6", jmbg: "3_5", munCode: "4_7", payDate: "5_4", hours: "6_4", sickHours: "7_4",
      gross: "8_4", benefits: "9_4", taxIncome: "10_4", pio: "11_4", overtimeHours: "21_4",
      name: "12_8", health: "13_4", unemp: "14_4", contribTotal: "15_4", incomeNet: "16_4",
      deductionFactor: "17_4", deductionAmount: "18_4", taxBase: "19_4", taxAmount: "20_5",
      jobCode: "23_4", pensionSeniority: "24_4"
    },
    {
      rb: "5_5", jmbg: "3_6", munCode: "4_9", payDate: "5_6", hours: "6_5", sickHours: "7_5",
      gross: "8_5", benefits: "9_5", taxIncome: "10_5", pio: "11_5", overtimeHours: "21_5",
      name: "12_10", health: "13_5", unemp: "14_5", contribTotal: "15_5", incomeNet: "16_5",
      deductionFactor: "17_5", deductionAmount: "18_5", taxBase: "19_5", taxAmount: "20_6",
      jobCode: "23_5", pensionSeniority: "24_5"
    },
  ];

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const tempDoc = await PDFDocument.load(templateBytes);
    tempDoc.registerFontkit(fontkit);
    const form = tempDoc.getForm();

    // NeedAppearances — preglednik sam renderuje vrijednosti iz V dict-a
    const rawAcroForm = tempDoc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
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

    // Header — Period i Strana
    const mStr = String(data.month).padStart(2, "0");
    const yStr = String(data.year);
    setText("20.0", mStr);
    setText("20.1", yStr.slice(-2)); // "20" je odštampano u predlošku, upisujemo samo zadnje 2 cifre
    setText("undefined.0", String(pageIdx + 1).padStart(2, "0"));
    setText("undefined.1", String(totalPages).padStart(2, "0"));

    // Dio 1 — Podaci o poslodavcu i zbirne suma sa SVIH listova
    setText("undefined_2", data.orgJib);
    setText("2 Naziv", data.orgName);
    setText("3 Šifra djelatnosti", data.orgActivity || "30.20");
    setText("4 Broj zaposlenih", String(data.employeeCount));

    setText("5 Ukupan prihod zbir kol10 sa svih listova", fmt(data.totalGross));
    setText("6 Ukupan iznos doprinosa zbir kol 15 sa svih listova", fmt(data.totalContribFrom));
    setText("7 Ukupan iznos osobnog odbitka zbir kol18 sa svih listova", fmt(data.totalDeductions));
    setText("8  Ukupan iznos poreza zbir kol 20 sa svih listova", fmt(data.totalIncomeTax));

    // Dio 2 — Radnici za ovu stranicu
    const pageItems = data.items.slice(pageIdx * itemsPerPage, (pageIdx + 1) * itemsPerPage);
    pageItems.forEach((it, rowIdx) => {
      const rm = rowMaps[rowIdx];
      if (!rm) return;

      const globalRb = pageIdx * itemsPerPage + rowIdx + 1;
      setText(rm.rb, String(globalRb));
      setText(rm.jmbg, it.jmbg);
      setText(rm.munCode, it.municipalityCode || "094");
      setText(rm.payDate, it.paymentDate || data.fillDate);
      setText(rm.hours, String(it.workHours ?? 176));
      setText(rm.sickHours, String(it.sickHours ?? 0));
      setText(rm.gross, fmt(it.grossSalary));
      setText(rm.benefits, fmt(it.benefits ?? 0));
      setText(rm.taxIncome, fmt(it.taxableIncome ?? it.grossSalary));
      setText(rm.pio, fmt(it.empPio));
      setText(rm.overtimeHours, String(it.overtimeHours ?? 0));

      setText(rm.name, it.employeeName);
      setText(rm.health, fmt(it.empHealth));
      setText(rm.unemp, fmt(it.empUnemp));
      setText(rm.contribTotal, fmt(it.empTotal));
      setText(rm.incomeNet, fmt(it.incomeNet));
      setText(rm.deductionFactor, (it.deductionFactor ?? 1.0).toFixed(1));
      setText(rm.deductionAmount, fmt(it.personalDeduction));
      setText(rm.taxBase, fmt(it.taxBase));
      setText(rm.taxAmount, fmt(it.incomeTax));
      setText(rm.jobCode, it.jobPositionCode || "0");
      setText(rm.pensionSeniority, fmt(it.pensionSeniority ?? 0));
    });

    // Dio 3 — Doprinosi poslodavca i datum
    setText("fill_7", fmt(data.erpPio));
    setText("fill_8", fmt(data.erpHealth));
    setText("fill_9", fmt(data.erpUnemp));
    setText("fill_10", fmt(data.erpAdditionalHealth ?? 0));
    setText("Datum", data.fillDate);

    // Preimenovanje polja da izbjegnemo dupliranje kada se spaja više stranica
    form.getFields().forEach((f) => {
      try {
        const originalName = f.getName();
        f.acroField.dict.set(PDFName.of("T"), PDFString.of(`${originalName}_p${pageIdx}`));
      } catch (_) {}
    });

    const copiedPages = await finalPdf.copyPages(tempDoc, [0]);
    finalPdf.addPage(copiedPages[0]);
  }

  return await finalPdf.save();
}

import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface PdvSdFillData {
  year: number;
  month: number;
  orgName: string;
  orgAddress: string;
  orgCity: string;
  orgJib: string;
  orgVatNumber?: string;
  postalCode?: string;
  submitTo?: string;

  // I. Isporuke i nabavke (osnovice)
  r11: number; // Oporezive isporuke (11)
  r12: number; // Izvoz (12)
  r13: number; // Oslobođene isporuke (13)
  r21: number; // Oporezive nabavke u zemlji (21)
  r22: number; // Uvoz (22)
  r23: number; // Paušalna naknada (23)

  // II. PDV
  r41: number; // Ulazni PDV - domaći (41)
  r42: number; // Ulazni PDV - uvoz (42)
  r43: number; // Ulazni PDV - paušalna naknada (43)
  r51: number; // Izlazni PDV (51)
  r61: number; // Ukupni odbitni ulazni PDV (61)
  r71: number; // PDV za uplatu ili povrat (71)
  r80: boolean; // Zahtjev za povrat (80)

  // III. Krajnja potrošnja
  r32: number; // FBiH (32)
  r33: number; // RS (33)
  r34: number; // BD (34)

  // Bottom
  place?: string;
  date?: string;
  responsiblePersonName?: string;
}

function fmt(n: number | undefined): string {
  if (n === undefined || n === null || isNaN(n) || n === 0) return "0,00";
  return n.toLocaleString("bs-BA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function generateFilledPdvSdPdf(data: PdvSdFillData): Promise<Uint8Array> {
  const templatePath = path.join(process.cwd(), "components", "obrazci", "H-1-1-PDV-prijava-h.pdf");
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const drawText = (text: string, x: number, y: number, fontSize = 9, useRegular = false) => {
    page.drawText(String(text), {
      x,
      y,
      size: fontSize,
      font: useRegular ? regularFont : font,
      color: rgb(0, 0, 0), // Black color for professional print look
    });
  };

  // 1. Header Information (Top Section)
  // VAT Number / Identifikacijski broj (12 digits)
  const vat = String(data.orgVatNumber || data.orgJib || "").replace(/\D/g, "").slice(0, 12);
  for (let i = 0; i < vat.length; i++) {
    const digitX = 381 + i * 14.2;
    drawText(vat[i], digitX, 726, 10);
  }

  // Naziv poreznog obveznika
  drawText(data.orgName.toUpperCase(), 75, 716, 8, true);

  // Adresa
  const addressText = [data.orgAddress, data.orgCity].filter(Boolean).join(", ");
  drawText(addressText, 75, 680, 8, true);

  // Poštanski broj (draw into box cells)
  const postalCode = String(data.postalCode || "").slice(0, 5);
  for (let i = 0; i < postalCode.length; i++) {
    const digitX = 77 + i * 14.2;
    drawText(postalCode[i], digitX, 642, 10);
  }

  // Mjesto
  drawText(data.orgCity, 180, 642, 9, true);

  // Porezni period (MM/YYYY)
  const periodText = `${String(data.month).padStart(2, "0")}/${data.year}`;
  drawText(periodText, 400, 682, 9);

  // Dostaviti do (UIO Ispostava)
  if (data.submitTo) {
    drawText(data.submitTo, 400, 642, 9, true);
  }

  // 2. I. Isporuke i nabavke (osnovice)
  // IZLAZI
  drawText(fmt(data.r11), 250, 612, 9);
  drawText(fmt(data.r12), 250, 572, 9);
  drawText(fmt(data.r13), 250, 532, 9);

  // ULAZI
  drawText(fmt(data.r21), 460, 612, 9);
  drawText(fmt(data.r22), 460, 572, 9);
  drawText(fmt(data.r23), 460, 532, 9);

  // 3. II. PDV
  drawText(fmt(data.r41), 460, 452, 9);
  drawText(fmt(data.r42), 460, 412, 9);
  drawText(fmt(data.r43), 460, 372, 9);
  drawText(fmt(data.r61), 460, 332, 9);

  drawText(fmt(data.r51), 250, 372, 9);
  
  // Calculate raw difference for Polje 71 (obaveza / povrat)
  // positive = za uplatu, negative = za povrat
  const diff = data.r51 - data.r61;
  const absDiff = Math.abs(diff);
  drawText(fmt(absDiff), 250, 292, 9);

  // Checkbox 80 (Zahtjev za povrat)
  if (data.r80) {
    drawText("X", 380, 292, 10);
  }

  // 4. III. Krajnja potrošnja
  drawText(fmt(data.r32), 250, 232, 9);
  drawText(fmt(data.r33), 250, 192, 9);
  drawText(fmt(data.r34), 250, 152, 9);

  // 5. Signature and Date Section
  const fillDate = data.date || new Date().toLocaleDateString("bs-BA");
  drawText(data.place || data.orgCity || "Sarajevo", 100, 110, 8, true);
  drawText(fillDate, 100, 70, 8, true);

  if (data.responsiblePersonName) {
    drawText(data.responsiblePersonName, 420, 110, 8, true);
  }

  return await pdfDoc.save();
}

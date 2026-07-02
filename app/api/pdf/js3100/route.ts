import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { PDFDocument, rgb, PDFName, PDFHexString } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/supabase/get-active-org";
import type { Js3100PdfData } from "@/lib/pdf/js3100-pdf";
import { searchCities } from "@/lib/constants/cities";

function parseDateParts(dateStr: string) {
  let day = "", month = "", year = "";
  if (dateStr && dateStr.includes("-")) {
    const parts = dateStr.split("-");
    if (parts.length === 3) { year = parts[0]; month = parts[1]; day = parts[2]; }
  } else if (dateStr && dateStr.includes(".")) {
    const parts = dateStr.split(".");
    if (parts.length >= 3) { day = parts[0]; month = parts[1]; year = parts[2]; }
  }
  const format2 = (s: string) => (s || "").replace(/\D/g, "").padStart(2, "0").slice(-2);
  const format4 = (s: string) => (s || "").replace(/\D/g, "").padStart(4, "0").slice(-4);
  return {
    day: dateStr ? format2(day) : "",
    month: dateStr ? format2(month) : "",
    year: dateStr ? format4(year) : "",
  };
}

function getEduCheckBoxInfo(eduStr: string, isRequired: boolean) {
  if (!eduStr) return null;
  const s = eduStr.trim().toUpperCase();
  let key = "";

  if (s === "DR" || s.includes("DOKTOR")) key = "DR";
  else if (s === "MR" || s.includes("MAGISTAR") || s.includes("MASTER")) key = "MR";
  else if (s === "VSS" || ((s.includes("VSS") || s.includes("VISOKA")) && !s.includes("VŠS") && !s.includes("VISA") && !s.includes("VIŠA"))) key = "VSS";
  else if (s === "VŠS" || s.includes("VŠS") || s.includes("VISA") || s.includes("VIŠA")) key = "VŠS";
  else if (s === "SSS" || s.includes("SSS") || s.includes("SREDNJA")) key = "SSS";
  else if (s === "NIŽA" || s === "NIZA" || s.includes("NIŽA") || s.includes("NIZA")) key = "NIŽA";
  else if (s === "VKV" || s.includes("VKV") || s.includes("VISOKOKVALIFIKOVANI")) key = "VKV";
  else if (s === "KV" || ((s.includes("KV") || s.includes("KVALIFIKOVANI")) && !s.includes("VKV") && !s.includes("PKV") && !s.includes("NKV") && !s.includes("NEKVALIFIKOVANI") && !s.includes("POLUKVALIFIKOVANI") && !s.includes("VISOKOKVALIFIKOVANI"))) key = "KV";
  else if (s === "PK" || s === "PKV" || s.includes("PK") || s.includes("PKV") || s.includes("POLUKVALIFIKOVANI")) key = "PK";
  else if (s === "NK" || s === "NKV" || s === "OŠ" || s === "OS" || s.includes("NK") || s.includes("NKV") || s.includes("NEKVALIFIKOVANI") || s.includes("OŠ") || s.includes("OSNOVNA")) key = "NK";

  const mapEmpCB: Record<string, string> = {
    DR: "Check Box100", MR: "Check Box101", VSS: "Check Box102", VŠS: "Check Box103",
    SSS: "Check Box104", NIŽA: "Check Box105", VKV: "Check Box106", KV: "Check Box107",
    PK: "Check Box108", NK: "Check Box109"
  };
  const mapReqCB: Record<string, string> = {
    DR: "Check Box2", MR: "Check Box3", VSS: "Check Box4", VŠS: "Check Box5",
    SSS: "Check Box6", NIŽA: "Check Box7", VKV: "Check Box8", KV: "Check Box9",
    PK: "Check Box10", NK: "Check Box11"
  };
  const mapEmpCoords: Record<string, {x: number, y: number}> = {
    DR: {x: 263.5, y: 386.5}, MR: {x: 295.0, y: 386.5}, VSS: {x: 325.0, y: 386.5}, VŠS: {x: 355.0, y: 386.5},
    SSS: {x: 385.0, y: 386.5}, NIŽA: {x: 415.5, y: 386.5}, VKV: {x: 447.0, y: 386.5}, KV: {x: 478.5, y: 386.5},
    PK: {x: 508.5, y: 386.5}, NK: {x: 540.0, y: 386.5}
  };
  const mapReqCoords: Record<string, {x: number, y: number}> = {
    DR: {x: 264.5, y: 306.5}, MR: {x: 296.0, y: 306.5}, VSS: {x: 326.0, y: 306.5}, VŠS: {x: 358.0, y: 306.5},
    SSS: {x: 389.5, y: 306.5}, NIŽA: {x: 420.0, y: 306.5}, VKV: {x: 451.0, y: 306.5}, KV: {x: 482.5, y: 306.5},
    PK: {x: 513.5, y: 306.5}, NK: {x: 545.0, y: 306.5}
  };

  return {
    cbName: isRequired ? mapReqCB[key] : mapEmpCB[key],
    coords: isRequired ? mapReqCoords[key] : mapEmpCoords[key],
  };
}

async function generateFilledJs3100Pdf(data: Js3100PdfData): Promise<Uint8Array> {
  const templatePath = path.join(process.cwd(), "components", "obrazci", "a36a1-js-3100_bos_v2_web.pdf");
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);

  const fontRegularBytes = fs.readFileSync(path.join(process.cwd(), "public", "fonts", "Times-Regular.ttf"));
  const fontBoldBytes = fs.readFileSync(path.join(process.cwd(), "public", "fonts", "Times-Bold.ttf"));
  const font = await pdfDoc.embedFont(fontRegularBytes);
  const fontBold = await pdfDoc.embedFont(fontBoldBytes);

  const form = pdfDoc.getForm();
  const page = pdfDoc.getPages()[0];

  const setText = (fieldName: string, text: string) => {
    try {
      const field = form.getTextField(fieldName);
      if (field) {
        const maxLen = field.getMaxLength();
        let val = text || "";
        if (maxLen !== undefined && maxLen > 0) val = val.slice(0, maxLen);
        let hex = "FEFF";
        for (let i = 0; i < val.length; i++) {
          hex += val.charCodeAt(i).toString(16).padStart(4, "0");
        }
        field.acroField.dict.set(PDFName.of("V"), PDFHexString.of(hex));
      }
    } catch (e) {}
  };

  const checkCB = (cbName: string | null | undefined) => {
    if (!cbName) return;
    try {
      const cb = form.getCheckBox(cbName);
      if (cb) cb.check();
    } catch (e) {}
  };

  const drawText = (text: string, x: number, y: number, size = 9, isBold = true) => {
    if (!text) return;
    page.drawText(String(text), {
      x, y, size,
      font: isBold ? fontBold : font,
      color: rgb(0, 0, 0),
    });
  };

  const drawBoxes = (text: string, startX: number, startY: number, boxWidth: number, count: number, size = 9) => {
    const clean = (text || "").replace(/\D/g, "");
    for (let i = 0; i < count; i++) {
      const char = clean[i] || "";
      if (char) {
        page.drawText(char, {
          x: startX + i * boxWidth + 3,
          y: startY + 2,
          size,
          font: fontBold,
          color: rgb(0, 0, 0),
        });
      }
    }
  };

  // Application type matching
  const normType = (data.appType || "").toLowerCase();
  const isPrijava = normType === "prijava" || (normType.includes("prijav") && !normType.includes("odjav") && !normType.includes("promjen"));
  const isPromjena = normType === "promjena" || normType.includes("promjen");
  const isOdjava = normType === "odjava" || normType.includes("odjav");

  // Gender matching
  const g = (data.gender || "").toUpperCase();
  const isFemale = g === "F" || g.startsWith("Ž") || g.startsWith("Z");

  // Dates & formatted strings
  const dobParts = parseDateParts(data.dob);
  const postalDigits = (data.contactCityZip || "").replace(/\D/g, "").slice(0, 5);
  const cityNameOnly = (data.contactCityZip || "").replace(/[0-9()]/g, "").trim();
  const empEduInfo = getEduCheckBoxInfo(data.eduLevel, false);
  const formattedHours = data.workHours ? String(data.workHours).padStart(2, "0") : "08";
  const formattedMins = data.workMins ? String(data.workMins).padStart(2, "0") : "00";
  const reqEduInfo = getEduCheckBoxInfo(data.requiredEdu, true);
  const changeParts = parseDateParts(data.changeDate || data.appDate);
  const rawPartTime = (data.partTimeNum || "").trim();
  const formattedPartTimeNum = rawPartTime ? (rawPartTime.length === 1 ? `0${rawPartTime}` : rawPartTime.slice(0, 2)) : "";

  // Populate interactive checkboxes
  checkCB(empEduInfo?.cbName);
  checkCB(reqEduInfo?.cbName);

  // 1. Prvi dio – Podaci o obvezniku uplate doprinosa
  drawBoxes(data.jib, 96, 663, 12.35, 13);
  drawBoxes(data.opcinaSifra || "", 327, 664, 15.5, 3);
  if (isPrijava) drawText("X", 440, 667, 10);
  else if (isPromjena) drawText("X", 440, 654, 10);
  else if (isOdjava) drawText("X", 440, 641, 10);

  drawText(data.orgName, 42, 635, 9);
  drawText(data.orgAddr, 43, 614, 9);
  drawText(data.orgPhone, 360, 614, 9);
  drawText(data.orgCity, 45, 592, 9);
  drawText(data.orgEmail, 354, 592, 9);

  // 2. Drugi dio – Podaci o osiguraniku
  drawBoxes(data.jmbg, 268, 555, 14.2, 13);
  drawText(`${data.lastName} ${data.firstName}`, 263, 539, 9);
  drawText(data.maidenName || "", 264, 523, 9);
  drawBoxes(dobParts.day, 268, 507, 15.5, 2);
  drawBoxes(dobParts.month, 303, 507, 15.5, 2);
  drawBoxes(dobParts.year, 338, 507, 15.5, 4);

  if (isFemale) drawText("X", 351, 492, 10);
  else drawText("X", 506, 492, 10);

  drawText(data.address, 264, 475, 9);
  drawBoxes(data.opcinaPrebivalistaSifra || "", 322, 459, 15.5, 3);
  drawText(data.contactAddr || "", 264, 437, 9);
  drawBoxes(postalDigits, 336, 418, 13.8, 5);
  drawText(cityNameOnly, 263, 399, 9);
  drawText(data.empEmail || "", 414, 399, 9);

  if (empEduInfo?.coords) {
    drawText("X", empEduInfo.coords.x, empEduInfo.coords.y, 10);
  }

  // 3. Treći dio – Podaci o osiguranju
  drawBoxes(formattedHours, 288, 353, 15.5, 2);
  drawBoxes(formattedMins, 355, 353, 15.5, 2);
  drawText(data.insName || "", 264, 337, 9);
  drawBoxes(data.insCode || "", 538, 337, 15.5, 2);
  drawText(data.occName || "", 263, 322, 9);
  drawBoxes(data.occCode || "", 461, 321, 15.4, 7);

  if (reqEduInfo?.coords) {
    drawText("X", reqEduInfo.coords.x, reqEduInfo.coords.y, 10);
  }

  drawBoxes(changeParts.day, 269, 288, 15.5, 2);
  drawBoxes(changeParts.month, 303, 288, 15.5, 2);
  drawBoxes(changeParts.year, 338, 288, 15.5, 4);

  drawText(data.payBasisName || "", 265, 272, 9);
  drawBoxes(data.payBasisCode || "", 538, 272, 15.5, 2);
  drawBoxes(data.jobPosCode || "", 507, 256, 15.5, 4);
  drawBoxes(formattedPartTimeNum, 424, 240, 15.5, 2);

  // 4. Četvrti dio – Potvrda i prijem
  drawText(data.fillerName || "", 40, 145, 9);
  drawText(data.fillerPhone || "", 186, 120, 9);
  drawText(data.fillDate || "", 232, 145, 9);

  return await pdfDoc.save({ updateFieldAppearances: false });
}

export async function handleJs3100Pdf(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const activeOrgId = await getActiveOrgId(supabase, user.id);
  const { data: org } = activeOrgId
    ? await supabase.from("organizations").select("id, name, address, city, phone, email, tax_id").eq("id", activeOrgId).single()
    : { data: null };

  if (!org) return new NextResponse("No organization", { status: 404 });

  const empId = searchParams.get("id");
  let emp: any = null;
  if (empId) {
    const { data: employeeData } = await supabase
      .from("employees")
      .select("*")
      .eq("id", empId)
      .eq("organization_id", org.id)
      .single();
    emp = employeeData;
  }

  const orgCityMatch = searchCities(org.city || "")[0];
  const defaultOrgOpcinaSifra = orgCityMatch?.municipalityCode || "";

  const empCityMatch = searchCities(emp?.city || "")[0];
  const defaultEmpOpcinaSifra = emp?.municipality_code || empCityMatch?.municipalityCode || "";
  const defaultContactCityZip = emp?.city ? `${empCityMatch?.postalCode || ""} ${emp.city}` : "";

  const pdfData: Js3100PdfData = {
    appType:                 searchParams.get("appType") || "prijava",
    appDate:                 searchParams.get("appDate") || new Date().toISOString().slice(0, 10),
    jib:                     searchParams.get("jib") || org.tax_id || "",
    opcinaSifra:             searchParams.get("opcinaSifra") || defaultOrgOpcinaSifra,
    orgName:                 searchParams.get("orgName") || org.name || "",
    orgAddr:                 searchParams.get("orgAddr") || org.address || "",
    orgCity:                 searchParams.get("orgCity") || org.city || "",
    orgPhone:                searchParams.get("orgPhone") || org.phone || "",
    orgEmail:                searchParams.get("orgEmail") || org.email || "",
    jmbg:                    searchParams.get("jmbg") || emp?.jmbg || "",
    lastName:                searchParams.get("lastName") || emp?.last_name || "",
    firstName:               searchParams.get("firstName") || emp?.first_name || "",
    maidenName:              searchParams.get("maidenName") || emp?.maiden_name || "",
    dob:                     searchParams.get("dob") || emp?.date_of_birth || "",
    gender:                  searchParams.get("gender") || emp?.gender || "M",
    address:                 searchParams.get("address") || emp?.address || "",
    opcinaPrebivalistaSifra: searchParams.get("opcinaPrebivalistaSifra") || defaultEmpOpcinaSifra,
    contactAddr:             searchParams.get("contactAddr") || "",
    contactCityZip:          searchParams.get("contactCityZip") || defaultContactCityZip,
    empEmail:                searchParams.get("empEmail") || emp?.email || "",
    eduLevel:                searchParams.get("eduLevel") || emp?.education_level || "",
    workHours:               searchParams.get("workHours") || String(emp?.work_hours_per_day ?? 8),
    workMins:                searchParams.get("workMins") || String(emp?.work_minutes_per_day ?? 0),
    insCode:                 searchParams.get("insCode") || emp?.insurance_basis_code || "",
    insName:                 searchParams.get("insName") || emp?.insurance_basis_name || "",
    occCode:                 searchParams.get("occCode") || emp?.occupation_code || "",
    occName:                 searchParams.get("occName") || emp?.occupation_name || "",
    requiredEdu:             searchParams.get("requiredEdu") || emp?.education_level || "",
    changeDate:              searchParams.get("changeDate") || emp?.hire_date || new Date().toISOString().slice(0, 10),
    changeNote:              searchParams.get("changeNote") || "",
    payBasisCode:            searchParams.get("payBasisCode") || emp?.payment_basis_code || "",
    payBasisName:            searchParams.get("payBasisName") || emp?.payment_basis_name || "",
    jobPosCode:              searchParams.get("jobPosCode") || emp?.job_position_code || "",
    partTimeNum:             searchParams.get("partTimeNum") || "",
    partTimeDen:             searchParams.get("partTimeDen") || "12",
    fillerName:              searchParams.get("fillerName") || "",
    fillerPhone:             searchParams.get("fillerPhone") || org.phone || "",
    fillDate:                searchParams.get("fillDate") || new Date().toISOString().slice(0, 10),
  };

  const pdfBytes = await generateFilledJs3100Pdf(pdfData);

  return new NextResponse(pdfBytes as unknown as BodyInit, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `inline; filename="obrazac-js3100-${pdfData.lastName}-${pdfData.firstName}.pdf"`,
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    return await handleJs3100Pdf(req);
  } catch (err: any) {
    console.error("JS3100 PDF GET error:", err);
    return new NextResponse(`PDF generation failed: ${err?.message || err}`, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await req.json();
    const pdfData: Js3100PdfData = body.data || body;
    const pdfBytes = await generateFilledJs3100Pdf(pdfData);

    return new NextResponse(pdfBytes as unknown as BodyInit, {
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `inline; filename="obrazac-js3100-${pdfData.lastName || "radnik"}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("JS3100 PDF POST error:", err);
    return new NextResponse(`PDF generation failed: ${err?.message || err}`, { status: 500 });
  }
}

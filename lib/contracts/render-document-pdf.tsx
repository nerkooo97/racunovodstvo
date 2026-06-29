import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { ContractFillInput, ContractEmployeeRow, ContractOrgRow } from "./document-data";
import { buildDocumentData } from "./document-data";
import { getContractTemplate } from "./templates";
import { UgovorORaduDocument } from "@/lib/pdf/ugovor-o-radu";
import { SporazumniOtkazDocument } from "@/lib/pdf/sporazumni-otkaz";
import { isRjesenjeTemplate, renderRjesenjeDocument } from "@/lib/pdf/radnik-rjesenja";
import { generateFilledZo3Pdf } from "@/lib/pdf/zo3-fill";
import { INSURANCE_BASIS_CODES } from "@/lib/constants/employee-codes";

export async function renderEmployeeDocumentPdf(
  templateId: string,
  org: ContractOrgRow,
  employee: ContractEmployeeRow,
  input: ContractFillInput = {}
): Promise<Buffer> {
  const template = getContractTemplate(templateId);
  if (!template || template.kind !== "pdf") {
    throw new Error("Nepoznat PDF predložak.");
  }

  if (templateId === "zo3") {
    const emp = employee as any;
    
    // Auto-resolve insurance description
    const insCode = input.insCode || emp.insurance_basis_code || "";
    const foundIns = INSURANCE_BASIS_CODES.find((c) => c.code === insCode);
    const insDesc = foundIns ? foundIns.name : (emp.insurance_basis_name || "");

    // Decode family members if provided
    let familyMembers = [];
    if (input.membersJson) {
      try {
        familyMembers = JSON.parse(input.membersJson);
      } catch (e) {}
    }

    const pdfBytes = await generateFilledZo3Pdf({
      cantonCode: emp.canton || undefined,
      office: input.office || undefined,
      
      orgName: org.name,
      orgJib: org.tax_id || "",
      orgAddress: org.address || undefined,
      orgCity: org.city || undefined,
      regNumber: input.regNumber || undefined,
      activityCode: input.activityCode || undefined,
      activityName: input.activityName || undefined,
      weeklyHoursObl: input.weeklyHoursObl || "40",

      employeeJmbg: emp.jmbg,
      lastName: emp.last_name,
      firstName: emp.first_name,
      maidenName: emp.maiden_name || undefined,
      streetAddress: emp.address || undefined,
      city: emp.city || undefined,
      postalCode: emp.postalCode || undefined,
      occupationName: emp.occupation_name || undefined,
      occupationCode: emp.occupation_code || undefined,
      hireDate: emp.hire_date || undefined,
      citizenship: "Bosansko-Hercegovačko",
      weeklyHoursEmp: emp.weekly_hours ? String(emp.weekly_hours) : "40",
      insCode: insCode || undefined,
      insDesc: insDesc || undefined,
      endDate: input.endDate || emp.termination_date || undefined,
      changeDate: input.changeDate || undefined,
      changeType: input.changeType || "01",
      changeTypeName: input.changeType === "01" ? "Prijava" : input.changeType === "02" ? "Promjena" : input.changeType === "03" ? "Odjava" : "",
      
      members: familyMembers,
      note: input.extraNote || undefined,
      place: input.documentPlace || org.city || undefined,
      signDate: input.documentDate || undefined,
    });

    return Buffer.from(pdfBytes);
  }

  const data = buildDocumentData(org, employee, input);

  let element: React.ReactElement;
  if (templateId === "ugovor-o-radu") {
    element = <UgovorORaduDocument data={data} />;
  } else if (templateId === "sporazumni-otkaz") {
    element = <SporazumniOtkazDocument data={data} />;
  } else if (isRjesenjeTemplate(templateId)) {
    const doc = renderRjesenjeDocument(templateId, data);
    if (!doc) throw new Error("Predložak rješenja nije pronađen.");
    element = doc;
  } else {
    throw new Error("Predložak nije podržan.");
  }

  const buffer = await renderToBuffer(element);
  return Buffer.from(buffer);
}

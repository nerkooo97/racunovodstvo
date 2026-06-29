import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { ContractFillInput, ContractEmployeeRow, ContractOrgRow } from "./document-data";
import { buildDocumentData } from "./document-data";
import { getContractTemplate } from "./templates";
import { UgovorORaduDocument } from "@/lib/pdf/ugovor-o-radu";
import { SporazumniOtkazDocument } from "@/lib/pdf/sporazumni-otkaz";
import { isRjesenjeTemplate, renderRjesenjeDocument } from "@/lib/pdf/radnik-rjesenja";

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

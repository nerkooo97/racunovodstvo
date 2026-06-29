import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { saveEmployeeDocumentRecord } from "@/app/actions/organization-documents";
import {
  documentYearFromDate,
  queryNextDocumentNumber,
} from "@/lib/documents/document-number";
import { renderEmployeeDocumentPdf } from "@/lib/contracts/render-document-pdf";
import { getContractTemplate } from "@/lib/contracts/templates";
import type { ContractFillInput } from "@/lib/contracts/document-data";

async function getEmployeeAndOrg(employeeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, address, city, tax_id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!org) return null;

  const { data: employee } = await supabase
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .eq("organization_id", org.id)
    .single();

  if (!employee) return null;

  return { supabase, user, org, employee };
}

export function parseContractFillInput(
  source: URLSearchParams | Record<string, unknown>
): ContractFillInput {
  const get = (key: string): string | undefined => {
    const v = source instanceof URLSearchParams ? source.get(key) : source[key];
    if (v == null || v === "") return undefined;
    return String(v);
  };

  const fullTimeRaw = get("fullTime");
  return {
    documentNumber: get("documentNumber"),
    documentDate: get("documentDate"),
    documentPlace: get("documentPlace"),
    representative: get("representative"),
    reason: get("reason"),
    dateFrom: get("dateFrom"),
    dateTo: get("dateTo"),
    extraNote: get("extraNote"),
    jobDescription: get("jobDescription"),
    workLocation: get("workLocation"),
    paymentDay: get("paymentDay"),
    annualLeaveDays: get("annualLeaveDays"),
    fullTime:
      fullTimeRaw === "true" ? true : fullTimeRaw === "false" ? false : undefined,
    severancePay: get("severancePay"),
    terminationNotice: get("terminationNotice"),
    durationDays: get("durationDays"),
    contractSignedDate: get("contractSignedDate"),
    annualLeaveUsage:
      get("annualLeaveUsage") === "remaining"
        ? "remaining"
        : get("annualLeaveUsage") === "full"
          ? "full"
          : undefined,
    handoverItems: get("handoverItems"),
    referencedContractNumber: get("referencedContractNumber"),
  };
}

function safeFilename(label: string, employeeName: string): string {
  return `${label}-${employeeName}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

async function generatePdfResponse(
  employeeId: string,
  templateId: string,
  input: ContractFillInput,
  options: { inline?: boolean; save?: boolean } = {}
) {
  const template = getContractTemplate(templateId);
  if (!template || template.kind !== "pdf") {
    return new NextResponse("Nepoznat predložak.", { status: 400 });
  }

  const auth = await getEmployeeAndOrg(employeeId);
  if (!auth) return new NextResponse("Unauthorized", { status: 401 });

  const documentDate =
    input.documentDate || new Date().toISOString().slice(0, 10);
  const year = documentYearFromDate(documentDate);

  let documentNumber = input.documentNumber?.trim();
  let sequenceNumber: number;

  if (options.save) {
    const next = await queryNextDocumentNumber(
      auth.supabase,
      auth.org.id,
      templateId,
      year
    );
    sequenceNumber = next.sequenceNumber;
    documentNumber = next.documentNumber;
  } else {
    sequenceNumber = 0;
    if (!documentNumber) {
      const next = await queryNextDocumentNumber(
        auth.supabase,
        auth.org.id,
        templateId,
        year
      );
      documentNumber = next.documentNumber;
    }
  }

  const fillInput: ContractFillInput = {
    ...input,
    documentNumber,
    documentDate,
    referencedContractNumber:
      input.referencedContractNumber || undefined,
  };

  const pdfBuffer = await renderEmployeeDocumentPdf(
    templateId,
    auth.org,
    auth.employee,
    fillInput
  );

  const employeeName = `${auth.employee.last_name}-${auth.employee.first_name}`;
  const filename = `${safeFilename(template.id, employeeName)}.pdf`;
  const inline = options.inline ?? false;

  if (options.save) {
    const saved = await saveEmployeeDocumentRecord({
      organizationId: auth.org.id,
      employeeId,
      templateId,
      templateLabel: template.label,
      documentNumber: documentNumber!,
      sequenceNumber,
      year,
      documentDate,
      documentPlace: input.documentPlace,
      payload: fillInput,
      pdfBuffer,
      userId: auth.user.id,
      supabase: auth.supabase,
    });

    if ("error" in saved) {
      return new NextResponse(saved.error, { status: 500 });
    }

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
        "X-Document-Id": saved.id,
        "X-Document-Number": documentNumber!,
      },
    });
  }

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const employeeId = searchParams.get("employeeId");
    const templateId = searchParams.get("templateId");

    if (!employeeId || !templateId) {
      return new NextResponse("Nedostaje employeeId ili templateId.", { status: 400 });
    }

    const input = parseContractFillInput(searchParams);
    const inline = searchParams.get("inline") === "1";
    const save = searchParams.get("save") === "1";

    return generatePdfResponse(employeeId, templateId, input, { inline, save });
  } catch (err) {
    console.error("radnik-dokument GET error:", err);
    return new NextResponse(
      err instanceof Error ? err.message : "Greška pri generisanju dokumenta.",
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const employeeId = body.employeeId as string | undefined;
    const templateId = body.templateId as string | undefined;

    if (!employeeId || !templateId) {
      return new NextResponse("Nedostaje employeeId ili templateId.", { status: 400 });
    }

    const input = parseContractFillInput(body);
    const inline = body.inline === true;

    return generatePdfResponse(employeeId, templateId, input, {
      inline,
      save: true,
    });
  } catch (err) {
    console.error("radnik-dokument POST error:", err);
    return new NextResponse(
      err instanceof Error ? err.message : "Greška pri spremanju dokumenta.",
      { status: 500 }
    );
  }
}

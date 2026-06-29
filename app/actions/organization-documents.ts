"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  documentYearFromDate,
  queryNextDocumentNumber,
} from "@/lib/documents/document-number";
import {
  getDocumentType,
  resolveDocumentType,
  type DocumentCategory,
} from "@/lib/documents/registry";

const STORAGE_BUCKET = "org-documents";

async function getAuthOrg() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!org) return null;
  return { supabase, user, orgId: org.id };
}

export interface OrganizationDocumentRow {
  id: string;
  organization_id: string;
  category: string;
  document_type: string;
  document_label: string;
  employee_id: string | null;
  partner_id: string | null;
  document_number: string;
  document_date: string;
  document_place: string | null;
  title: string | null;
  status: string;
  source: string;
  storage_path: string | null;
  file_name: string | null;
  created_at: string;
  employees?: { first_name: string; last_name: string } | null;
}

export interface ListDocumentsFilters {
  year?: number;
  category?: DocumentCategory | "all";
  status?: "issued" | "cancelled" | "all";
  employeeId?: string;
  documentType?: string;
  limit?: number;
}

export async function getNextDocumentNumber(
  documentType: string,
  documentDate: string
): Promise<
  | { success: true; sequenceNumber: number; year: number; documentNumber: string }
  | { error: string }
> {
  const auth = await getAuthOrg();
  if (!auth) return { error: "Niste prijavljeni." };

  const year = documentYearFromDate(documentDate);
  const next = await queryNextDocumentNumber(
    auth.supabase,
    auth.orgId,
    documentType,
    year
  );

  return {
    success: true,
    sequenceNumber: next.sequenceNumber,
    year: next.year,
    documentNumber: next.documentNumber,
  };
}

export async function listOrganizationDocuments(
  filters: ListDocumentsFilters = {}
): Promise<{ documents: OrganizationDocumentRow[] } | { error: string }> {
  const auth = await getAuthOrg();
  if (!auth) return { error: "Niste prijavljeni." };

  let query = auth.supabase
    .from("organization_documents")
    .select(
      "id, organization_id, category, document_type, document_label, employee_id, partner_id, document_number, document_date, document_place, title, status, source, storage_path, file_name, created_at, employees(first_name, last_name)"
    )
    .eq("organization_id", auth.orgId)
    .order("created_at", { ascending: false });

  if (filters.year) query = query.eq("year", filters.year);
  if (filters.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
  if (filters.documentType) query = query.eq("document_type", filters.documentType);
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) return { error: error.message };

  return { documents: (data ?? []) as OrganizationDocumentRow[] };
}

export async function cancelOrganizationDocument(
  documentId: string
): Promise<{ success: true } | { error: string }> {
  const auth = await getAuthOrg();
  if (!auth) return { error: "Niste prijavljeni." };

  const { data: doc } = await auth.supabase
    .from("organization_documents")
    .select("employee_id")
    .eq("id", documentId)
    .eq("organization_id", auth.orgId)
    .single();

  if (!doc) return { error: "Dokument nije pronađen." };

  const { error } = await auth.supabase
    .from("organization_documents")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", documentId)
    .eq("organization_id", auth.orgId);

  if (error) return { error: error.message };

  revalidatePath("/dokumenti");
  if (doc.employee_id) {
    revalidatePath(`/radnici/${doc.employee_id}/ugovori`);
  }
  return { success: true };
}

export async function saveOrganizationDocumentRecord(input: {
  organizationId: string;
  category: DocumentCategory;
  documentType: string;
  documentLabel: string;
  employeeId?: string | null;
  partnerId?: string | null;
  documentNumber: string;
  sequenceNumber: number;
  year: number;
  numberPrefix?: string;
  documentDate: string;
  documentPlace?: string;
  title?: string;
  notes?: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  fileBuffer: Buffer;
  mimeType?: string;
  fileName?: string;
  source?: "generated" | "upload" | "import";
  userId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}): Promise<{ id: string; storagePath: string } | { error: string }> {
  const docId = crypto.randomUUID();
  const ext =
    input.fileName?.split(".").pop()?.toLowerCase() ||
    (input.mimeType?.includes("pdf") ? "pdf" : "bin");
  const storagePath = `${input.organizationId}/${docId}.${ext}`;
  const mimeType = input.mimeType ?? "application/pdf";

  const { error: uploadErr } = await input.supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, input.fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadErr) return { error: uploadErr.message };

  const { data, error } = await input.supabase
    .from("organization_documents")
    .insert({
      id: docId,
      organization_id: input.organizationId,
      category: input.category,
      document_type: input.documentType,
      document_label: input.documentLabel,
      employee_id: input.employeeId ?? null,
      partner_id: input.partnerId ?? null,
      document_number: input.documentNumber,
      sequence_number: input.sequenceNumber,
      year: input.year,
      number_prefix: input.numberPrefix ?? null,
      document_date: input.documentDate,
      document_place: input.documentPlace || null,
      title: input.title || null,
      notes: input.notes || null,
      payload: input.payload ?? {},
      metadata: input.metadata ?? {},
      storage_path: storagePath,
      mime_type: mimeType,
      file_name: input.fileName || null,
      source: input.source ?? "generated",
      status: "issued",
      created_by: input.userId,
    })
    .select("id")
    .single();

  if (error) {
    await input.supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    return { error: error.message };
  }

  revalidatePath("/dokumenti");
  if (input.employeeId) {
    revalidatePath(`/radnici/${input.employeeId}/ugovori`);
  }

  return { id: data!.id, storagePath };
}

export async function uploadOrganizationDocument(formData: FormData): Promise<
  { success: true; id: string } | { error: string }
> {
  const auth = await getAuthOrg();
  if (!auth) return { error: "Niste prijavljeni." };

  const file = formData.get("file") as File | null;
  const documentType = (formData.get("documentType") as string) || "upload";
  const documentLabel =
    (formData.get("documentLabel") as string) ||
    resolveDocumentType(documentType).label;
  const category =
    ((formData.get("category") as DocumentCategory) ||
      resolveDocumentType(documentType).category) as DocumentCategory;
  const documentDate =
    (formData.get("documentDate") as string) ||
    new Date().toISOString().slice(0, 10);
  const documentPlace = (formData.get("documentPlace") as string) || undefined;
  const title = (formData.get("title") as string) || undefined;
  const notes = (formData.get("notes") as string) || undefined;
  const employeeId = (formData.get("employeeId") as string) || undefined;
  const partnerId = (formData.get("partnerId") as string) || undefined;
  const manualNumber = (formData.get("documentNumber") as string) || undefined;

  if (!file || file.size === 0) return { error: "Datoteka je obavezna." };

  const year = documentYearFromDate(documentDate);
  const typeDef = resolveDocumentType(documentType, documentLabel);

  let documentNumber = manualNumber?.trim() ?? "";
  let sequenceNumber = 1;
  let numberPrefix = typeDef.numberPrefix ?? "";

  if (typeDef.autoNumber !== false && !manualNumber) {
    const next = await queryNextDocumentNumber(
      auth.supabase,
      auth.orgId,
      documentType,
      year
    );
    documentNumber = next.documentNumber;
    sequenceNumber = next.sequenceNumber;
    numberPrefix = next.numberPrefix;
  } else if (!documentNumber) {
    documentNumber = `${year}-${Date.now()}`;
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const saved = await saveOrganizationDocumentRecord({
    organizationId: auth.orgId,
    category,
    documentType,
    documentLabel,
    employeeId: employeeId || null,
    partnerId: partnerId || null,
    documentNumber,
    sequenceNumber,
    year,
    numberPrefix,
    documentDate,
    documentPlace,
    title,
    notes,
    fileBuffer: buffer,
    mimeType: file.type || "application/octet-stream",
    fileName: file.name,
    source: "upload",
    userId: auth.user.id,
    supabase: auth.supabase,
  });

  if ("error" in saved) return { error: saved.error };
  return { success: true, id: saved.id };
}

/** Sljedeći broj za predloške radnika — kompatibilnost */
export async function getNextEmployeeDocumentNumber(
  templateId: string,
  documentDate: string
) {
  return getNextDocumentNumber(templateId, documentDate);
}

export async function listEmployeeDocuments(employeeId: string) {
  const result = await listOrganizationDocuments({
    employeeId,
    limit: 100,
  });
  if ("error" in result) return result;

  return {
    documents: result.documents.map((d) => ({
      id: d.id,
      employee_id: d.employee_id ?? employeeId,
      template_id: d.document_type,
      template_label: d.document_label,
      document_number: d.document_number,
      document_date: d.document_date,
      document_place: d.document_place,
      status: d.status,
      storage_path: d.storage_path,
      created_at: d.created_at,
    })),
  };
}

export async function cancelEmployeeDocument(documentId: string) {
  return cancelOrganizationDocument(documentId);
}

export async function saveEmployeeDocumentRecord(input: {
  organizationId: string;
  employeeId: string;
  templateId: string;
  templateLabel: string;
  documentNumber: string;
  sequenceNumber: number;
  year: number;
  documentDate: string;
  documentPlace?: string;
  payload: Record<string, unknown>;
  pdfBuffer: Buffer;
  userId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const typeDef = getDocumentType(input.templateId);

  return saveOrganizationDocumentRecord({
    organizationId: input.organizationId,
    category: typeDef?.category ?? "radnik",
    documentType: input.templateId,
    documentLabel: input.templateLabel,
    employeeId: input.employeeId,
    documentNumber: input.documentNumber,
    sequenceNumber: input.sequenceNumber,
    year: input.year,
    numberPrefix: typeDef?.numberPrefix,
    documentDate: input.documentDate,
    documentPlace: input.documentPlace,
    payload: input.payload,
    fileBuffer: input.pdfBuffer,
    mimeType: "application/pdf",
    source: "generated",
    userId: input.userId,
    supabase: input.supabase,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/supabase/get-active-org";

const STORAGE_BUCKET = "org-documents";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const activeOrgId = await getActiveOrgId(supabase, user.id);
  const { data: org } = activeOrgId
    ? await supabase.from("organizations").select("id").eq("id", activeOrgId).single()
    : { data: null };

    if (!org) return new NextResponse("Unauthorized", { status: 401 });

    const { data: doc } = await supabase
      .from("organization_documents")
      .select("storage_path, document_number, document_type, file_name, mime_type, status")
      .eq("id", id)
      .eq("organization_id", org.id)
      .single();

    if (!doc?.storage_path) {
      return new NextResponse("Dokument nije pronađen.", { status: 404 });
    }

    const { data: file, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(doc.storage_path);

    if (error || !file) {
      return new NextResponse("Datoteka nije pronađena.", { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename =
      doc.file_name ??
      `${doc.document_type}-${doc.document_number.replace(/\//g, "-")}.pdf`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": doc.mime_type ?? "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("document file download error:", err);
    return new NextResponse("Greška pri preuzimanju.", { status: 500 });
  }
}

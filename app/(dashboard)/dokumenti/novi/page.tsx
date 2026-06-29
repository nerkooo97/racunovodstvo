import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/page-header";
import UploadDocumentForm from "@/components/documents/upload-document-form";
import { ArrowLeft } from "lucide-react";

export default async function NoviDokumentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!org) redirect("/nova-djelatnost");

  const { data: employees } = await supabase
    .from("employees")
    .select("id, first_name, last_name")
    .eq("organization_id", org.id)
    .neq("status", "terminated")
    .order("last_name");

  const employeeOptions = (employees ?? []).map((e) => ({
    id: e.id,
    name: `${e.first_name} ${e.last_name}`,
  }));

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6 pb-12">
      <PageHeader title="Novi dokument" description="Upload u evidenciju">
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/dokumenti">
            <ArrowLeft className="h-4 w-4" />
            Nazad
          </Link>
        </Button>
      </PageHeader>

      <UploadDocumentForm employees={employeeOptions} />
    </div>
  );
}

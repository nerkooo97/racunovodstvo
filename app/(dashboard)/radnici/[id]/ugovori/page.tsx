import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/page-header";
import EmployeeDocumentsPanel from "@/components/contracts/employee-documents-panel";
import { ArrowLeft } from "lucide-react";

export default async function RadnikUgovoriPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, city")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!org) redirect("/nova-djelatnost");

  const { data: emp } = await supabase
    .from("employees")
    .select("id, first_name, last_name, contract_number, city, municipality, canton, hire_date")
    .eq("id", id)
    .eq("organization_id", org.id)
    .single();

  if (!emp) notFound();

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 pb-12">
      <PageHeader
        title="Ugovori i rješenja"
        description={`${emp.first_name} ${emp.last_name} · ${org.name}`}
      >
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={`/radnici/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            Nazad na profil
          </Link>
        </Button>
      </PageHeader>

      <EmployeeDocumentsPanel
        employeeId={emp.id}
        employeeName={`${emp.first_name} ${emp.last_name}`}
        defaultPlace={org.city ?? emp.city ?? emp.municipality ?? ""}
        defaultDocumentNumber={emp.contract_number ?? ""}
        defaultWorkLocation={[emp.municipality, emp.canton].filter(Boolean).join(", ")}
        defaultContractSignedDate={emp.hire_date ?? ""}
      />
    </div>
  );
}

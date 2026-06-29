import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/page-header";
import UgovorORaduForm from "./UgovorORaduForm";
import { ArrowLeft } from "lucide-react";

export default async function UgovorORaduPage({
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
    .select("id, name, address, city, tax_id, phone, email")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!org) redirect("/nova-djelatnost");

  const { data: emp } = await supabase
    .from("employees")
    .select("*")
    .eq("id", id)
    .eq("organization_id", org.id)
    .single();

  if (!emp) notFound();

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <PageHeader
        title="Ugovor o radu"
        description={`${emp.last_name} ${emp.first_name}`}
      >
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={`/zaposlenici/${id}/ugovori`}>
            <ArrowLeft className="h-4 w-4" />
            Nazad na ugovore
          </Link>
        </Button>
      </PageHeader>

      <UgovorORaduForm
        employeeId={emp.id}
        org={{
          name:    org.name ?? "",
          address: org.address ?? "",
          city:    org.city ?? "",
          jib:     org.tax_id ?? "",
        }}
        employee={{
          first_name:      emp.first_name ?? "",
          last_name:       emp.last_name ?? "",
          jmbg:            emp.jmbg ?? "",
          address:         emp.address ?? "",
          city:            emp.city ?? "",
          education_level: emp.education_level ?? "",
          job_title:       emp.job_title ?? "",
          job_position_code: emp.job_position_code ?? "",
          work_hours_per_day: emp.work_hours_per_day ?? 8,
          gross_salary:    emp.gross_salary ?? 0,
          net_salary:      emp.net_salary ?? null,
          contract_type:   (emp.contract_type as "indefinite" | "fixed") ?? "indefinite",
          contract_end_date: emp.contract_end_date ?? "",
          probation:       emp.probation ?? false,
          probation_end_date: emp.probation_end_date ?? "",
          hire_date:       emp.hire_date ?? "",
          notice_period:   emp.notice_period ?? "30 dana",
        }}
      />
    </div>
  );
}

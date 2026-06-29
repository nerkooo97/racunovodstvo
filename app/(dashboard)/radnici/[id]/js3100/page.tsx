import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/page-header";
import Js3100Form from "./Js3100Form";
import { ArrowLeft, FileText } from "lucide-react";

export default async function Js3100Page({
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
    .select("id, name, tax_id, address, city, phone, email")
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
        title="JS3100 — Obrazac za Poreznu upravu FBiH"
        description={`Prijava, odjava ili promjena podataka osiguranika za: ${emp.first_name} ${emp.last_name}`}
      >
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href={`/radnici/${id}/ugovori`}>
              <FileText className="h-4 w-4 text-primary" />
              Ugovori / rješenja
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href={`/radnici/${id}`}>
              <ArrowLeft className="h-4 w-4" />
              Nazad na profil
            </Link>
          </Button>
        </div>
      </PageHeader>

      <Js3100Form
        employeeId={emp.id}
        insuranceStatus={emp.insurance_status ?? "draft"}
        org={{
          jib:     org.tax_id ?? "",
          name:    org.name ?? "",
          address: org.address ?? "",
          city:    org.city ?? "",
          phone:   org.phone ?? "",
          email:   org.email ?? "",
        }}
        employee={{
          jmbg:                emp.jmbg ?? "",
          date_of_birth:       emp.date_of_birth ?? "",
          last_name:           emp.last_name ?? "",
          first_name:          emp.first_name ?? "",
          maiden_name:         emp.maiden_name ?? "",
          gender:              (emp.gender as "M" | "F" | null) ?? null,
          address:             emp.address ?? "",
          city:                emp.city ?? "",
          email:               emp.email ?? "",
          education_level:     emp.education_level ?? "",
          work_hours_per_day:  emp.work_hours_per_day ?? 8,
          work_minutes_per_day: emp.work_minutes_per_day ?? 0,
          insurance_basis_name: emp.insurance_basis_name ?? "",
          insurance_basis_code: emp.insurance_basis_code ?? "",
          occupation_name:     emp.occupation_name ?? "",
          occupation_code:     emp.occupation_code ?? "",
          job_position_code:   emp.job_position_code ?? "",
          payment_basis_name:  emp.payment_basis_name ?? "",
          payment_basis_code:  emp.payment_basis_code ?? "",
          hire_date:           emp.hire_date ?? "",
        }}
      />
    </div>
  );
}

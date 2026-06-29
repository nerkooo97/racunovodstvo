import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/page-header";
import FormSection from "@/components/shared/form-section";
import EmployeeForm from "@/components/forms/employee-form";
import TerminateButton from "./TerminateButton";
import { ArrowLeft, FileSpreadsheet, FileText } from "lucide-react";
import {
  INSURANCE_STATUS_LABELS,
  EMPLOYMENT_STATUS_LABELS,
  EMPLOYEE_ROLES,
} from "@/lib/constants/employee-codes";
import { detectWorkTimePreset } from "@/lib/employees/form-utils";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase
    .from("organizations")
    .select("id, default_meal_allowance_per_day")
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

  const defaultMeal = Number(org.default_meal_allowance_per_day ?? 16);
  const insuranceStatus = INSURANCE_STATUS_LABELS[emp.insurance_status ?? "draft"] ?? INSURANCE_STATUS_LABELS.draft;
  const employmentStatus = EMPLOYMENT_STATUS_LABELS[emp.status ?? "draft"] ?? EMPLOYMENT_STATUS_LABELS.draft;
  const roleLabel = EMPLOYEE_ROLES.find((r) => r.value === emp.employee_role)?.label ?? "Radnik";

  const initialValues = {
    first_name:            emp.first_name ?? "",
    last_name:             emp.last_name ?? "",
    maiden_name:           emp.maiden_name ?? "",
    jmbg:                  emp.jmbg ?? "",
    id_card_number:        emp.id_card_number ?? "",
    date_of_birth:         emp.date_of_birth ?? "",
    gender:                (emp.gender as "M" | "F") ?? undefined,
    email:                 emp.email ?? "",
    employee_role:         (emp.employee_role as "radnik" | "vlasnik" | "poslovodja" | "sezonski") ?? "radnik",
    address:               emp.address ?? "",
    city:                  emp.city ?? "",
    municipality:          emp.municipality ?? "",
    municipality_code:     emp.municipality_code ?? "",
    canton:                emp.canton ?? "",
    residence_entity:      (emp.residence_entity as "FBiH" | "RS" | "BD") ?? "FBiH",
    insurance_registration_date:   emp.insurance_registration_date ?? "",
    insurance_deregistration_date: emp.insurance_deregistration_date ?? "",
    education_level:       emp.education_level ?? "",
    occupation_name:       emp.occupation_name ?? "",
    occupation_code:       emp.occupation_code ?? "",
    insurance_basis_name:  emp.insurance_basis_name ?? "",
    insurance_basis_code:  emp.insurance_basis_code ?? "",
    payment_basis_name:    emp.payment_basis_name ?? "",
    payment_basis_code:    emp.payment_basis_code ?? "",
    job_title:             emp.job_title ?? "",
    job_position_code:     emp.job_position_code ?? "",
    work_time_preset:      detectWorkTimePreset(emp.work_hours_per_day, emp.weekly_hours),
    work_hours_per_day:    String(emp.work_hours_per_day ?? 8),
    work_minutes_per_day:  String(emp.work_minutes_per_day ?? 0),
    weekly_hours:          String(emp.weekly_hours ?? 40),
    gross_salary:          emp.gross_salary != null ? String(emp.gross_salary) : "",
    net_salary:            emp.net_salary   != null ? String(emp.net_salary)   : "",
    salary_type:           (emp.salary_type as "target_net" | "net_contract" | "gross_base") ?? "net_contract",
    tax_coefficient:       String(emp.tax_coefficient ?? "1.00"),
    meal_allowance_per_day: emp.meal_allowance_per_day != null ? String(emp.meal_allowance_per_day) : String(defaultMeal),
    first_employment_date: emp.first_employment_date ?? "",
    prior_experience_years: String(emp.prior_experience_years ?? 0),
    prior_experience_months: String(emp.prior_experience_months ?? 0),
    bank_account:          emp.bank_account ?? "",
    bank_name:             emp.bank_name ?? "",
    hire_date:             emp.hire_date ?? "",
    contract_type:         (emp.contract_type as "indefinite" | "fixed") ?? "indefinite",
    contract_number:       emp.contract_number ?? "",
    contract_end_date:     emp.contract_end_date ?? "",
    probation:             emp.probation ?? false,
    probation_months:      String(emp.probation_months ?? 0),
    probation_end_date:    emp.probation_end_date ?? "",
    notice_period:         emp.notice_period ?? "30 dana",
    is_owner:              emp.is_owner ?? false,
    send_payslip_email:    emp.send_payslip_email ?? false,
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <PageHeader
        title={`${emp.first_name} ${emp.last_name}`}
        description={`${roleLabel} · PIO: ${insuranceStatus.label}`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={insuranceStatus.variant}>{insuranceStatus.label}</Badge>
          <Badge variant={employmentStatus.variant}>{employmentStatus.label}</Badge>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href={`/radnici/${emp.id}/ugovori`}>
              <FileText className="h-4 w-4 text-primary" />
              Ugovori / rješenja
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href={`/radnici/${emp.id}/js3100`}>
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              JS3100 obrazac
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/radnici">
              <ArrowLeft className="h-4 w-4" />
              Nazad na listu
            </Link>
          </Button>
        </div>
      </PageHeader>

      <EmployeeForm
        employeeId={emp.id}
        initialValues={initialValues}
        defaultMealAllowance={defaultMeal}
      />

      {emp.status !== "terminated" && (
        <FormSection
          title="Zona opasnosti"
          description="Prekid radnog odnosa radnika. Ova akcija mijenja status zaposlenika na neaktivan."
          className="border border-destructive/30 rounded-lg p-4 bg-destructive/5 mb-12"
        >
          <TerminateButton employeeId={emp.id} />
        </FormSection>
      )}
    </div>
  );
}

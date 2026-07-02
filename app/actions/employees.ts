"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/supabase/get-active-org";
import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { addMonths, format } from "date-fns";

const employeeSchema = z.object({
  // Lični podaci
  first_name: z.string().min(1, "Ime je obavezno"),
  last_name: z.string().min(1, "Prezime je obavezno"),
  maiden_name: z.string().optional(),
  jmbg: z
    .string()
    .length(13, "JMBG mora imati tačno 13 cifara")
    .regex(/^\d+$/, "JMBG smije sadržavati samo cifre"),
  date_of_birth: z.string().optional(),
  gender: z.enum(["M", "F"]).optional(),
  email: z.union([z.string().email("Nevažeća email adresa"), z.literal("")]).optional(),
  employee_role: z.enum(["radnik", "vlasnik", "poslovodja", "sezonski"]).default("radnik"),
  id_card_number: z.string().optional(),

  // Adresa
  address: z.string().optional(),
  city: z.string().optional(),
  municipality: z.string().optional(),
  municipality_code: z.string().optional(),
  canton: z.string().optional(),
  residence_entity: z.enum(["FBiH", "RS", "BD"]).default("FBiH"),

  // JS3100 / PIO
  insurance_registration_date: z.string().optional(),
  insurance_deregistration_date: z.string().optional(),

  // Kvalifikacije
  education_level: z.string().optional(),
  occupation_name: z.string().optional(),
  occupation_code: z
    .string()
    .regex(/^\d{7}$/, "Šifra zanimanja mora imati 7 cifara")
    .optional()
    .or(z.literal("")),

  // Osnov osiguranja
  insurance_basis_name: z.string().optional(),
  insurance_basis_code: z.string().optional(),
  payment_basis_name: z.string().optional(),
  payment_basis_code: z.string().optional(),

  // Radno mjesto
  job_title: z.string().optional(),
  job_position_code: z.string().optional(),
  work_hours_per_day: z.coerce.number().int().min(1).max(12).default(8),
  work_minutes_per_day: z.coerce.number().int().min(0).max(59).default(0),
  weekly_hours: z.coerce.number().int().min(1).max(60).default(40),

  // Plata
  gross_salary: z.coerce.number().positive().optional().nullable(),
  net_salary: z.coerce.number().positive().optional().nullable(),
  salary_type: z.enum(["target_net", "net_contract", "gross_base"]).default("net_contract"),
  tax_coefficient: z.coerce.number().min(0).max(99).default(1.0),
  meal_allowance_per_day: z.coerce.number().min(0).default(16.0),

  // Staž
  first_employment_date: z.string().optional(),
  prior_experience_years: z.coerce.number().int().min(0).max(50).default(0),
  prior_experience_months: z.coerce.number().int().min(0).max(11).default(0),

  // Bankovni račun
  bank_account: z.string().optional(),
  bank_name: z.string().optional(),

  // Ugovor
  hire_date: z.string().min(1, "Datum zaposlenja je obavezan"),
  contract_type: z.enum(["indefinite", "fixed"]).default("indefinite"),
  contract_number: z.string().optional(),
  contract_end_date: z.string().optional(),
  probation: z.coerce.boolean().default(false),
  probation_months: z.coerce.number().int().min(0).max(6).default(0),
  probation_end_date: z.string().optional(),
  notice_period: z.string().default("30 dana"),

  // Ostalo
  is_owner: z.coerce.boolean().default(false),
  send_payslip_email: z.coerce.boolean().default(false),
});

type EmployeeResult = { error: string } | { success: true; id: string };

// Aktivna organizacija iz cookie-a — NE prva kreirana (korisnik može imati više org-ova)
async function getOrganizationId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  return getActiveOrgId(supabase, userId);
}

function parseEmployeeFormData(raw: Record<string, FormDataEntryValue>) {
  return employeeSchema.safeParse({
    ...raw,
    gender: raw.gender || undefined,
    date_of_birth: raw.date_of_birth || undefined,
    contract_end_date: raw.contract_end_date || undefined,
    probation_end_date: raw.probation_end_date || undefined,
    insurance_registration_date: raw.insurance_registration_date || undefined,
    insurance_deregistration_date: raw.insurance_deregistration_date || undefined,
    first_employment_date: raw.first_employment_date || undefined,
    occupation_code: raw.occupation_code || undefined,
    gross_salary: raw.gross_salary ? Number(raw.gross_salary) : null,
    net_salary: raw.net_salary ? Number(raw.net_salary) : null,
    meal_allowance_per_day: raw.meal_allowance_per_day ? Number(raw.meal_allowance_per_day) : 16.0,
    probation: raw.probation === "true",
    is_owner: raw.is_owner === "true",
    send_payslip_email: raw.send_payslip_email === "true",
  });
}

function deriveProbationFields(data: z.infer<typeof employeeSchema>) {
  const probation = data.probation_months > 0 || data.probation;
  let probationEndDate = data.probation_end_date || null;

  if (probation && data.probation_months > 0 && data.hire_date) {
    const end = addMonths(new Date(data.hire_date), data.probation_months);
    probationEndDate = format(end, "yyyy-MM-dd");
  }

  return { probation, probationEndDate };
}

function toEmployeeRow(data: z.infer<typeof employeeSchema>) {
  const { probation, probationEndDate } = deriveProbationFields(data);

  return {
    ...data,
    maiden_name: data.maiden_name || null,
    date_of_birth: data.date_of_birth || null,
    gender: data.gender || null,
    email: data.email || null,
    id_card_number: data.id_card_number || null,
    address: data.address || null,
    city: data.city || null,
    municipality: data.municipality || null,
    municipality_code: data.municipality_code || null,
    canton: data.canton || null,
    education_level: data.education_level || null,
    occupation_name: data.occupation_name || null,
    occupation_code: data.occupation_code || null,
    insurance_basis_name: data.insurance_basis_name || null,
    insurance_basis_code: data.insurance_basis_code || null,
    payment_basis_name: data.payment_basis_name || null,
    payment_basis_code: data.payment_basis_code || null,
    job_title: data.job_title || null,
    job_position_code: data.job_position_code || null,
    gross_salary: data.gross_salary ?? null,
    net_salary: data.net_salary ?? null,
    meal_allowance_per_day: data.meal_allowance_per_day ?? 16.0,
    bank_account: data.bank_account || null,
    bank_name: data.bank_name || null,
    contract_number: data.contract_number || null,
    contract_end_date: data.contract_end_date || null,
    insurance_registration_date: data.insurance_registration_date || null,
    insurance_deregistration_date: data.insurance_deregistration_date || null,
    first_employment_date: data.first_employment_date || null,
    probation,
    probation_months: data.probation_months,
    probation_end_date: probationEndDate,
  };
}

export async function createEmployee(formData: FormData): Promise<EmployeeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = await getOrganizationId(supabase, user.id);
  if (!orgId) return { error: "Nemate kreiranu djelatnost." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = parseEmployeeFormData(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nevažeći podaci." };
  }

  const row = toEmployeeRow(parsed.data);

  const { data: employee, error } = await supabase
    .from("employees")
    .insert({
      organization_id: orgId,
      ...row,
      status: "draft",
      insurance_status: "draft",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/radnici");
  return { success: true, id: employee.id };
}

export async function updateEmployee(employeeId: string, formData: FormData): Promise<EmployeeResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = await getOrganizationId(supabase, user.id);
  if (!orgId) return { error: "Organizacija nije pronađena." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = parseEmployeeFormData(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nevažeći podaci." };
  }

  const row = toEmployeeRow(parsed.data);

  const { error } = await supabase
    .from("employees")
    .update(row)
    .eq("id", employeeId)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };

  revalidatePath("/radnici");
  revalidatePath(`/radnici/${employeeId}`);
  return { success: true, id: employeeId };
}

export async function terminateEmployee(
  employeeId: string,
  terminationDate: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = await getOrganizationId(supabase, user.id);
  if (!orgId) return { error: "Organizacija nije pronađena." };

  const { error } = await supabase
    .from("employees")
    .update({
      status: "terminated",
      termination_date: terminationDate,
      insurance_deregistration_date: terminationDate,
    })
    .eq("id", employeeId)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };

  revalidatePath("/radnici");
  return {};
}

export async function activateEmployee(
  employeeId: string,
  registrationDate?: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = await getOrganizationId(supabase, user.id);
  if (!orgId) return { error: "Organizacija nije pronađena." };

  const { data: emp } = await supabase
    .from("employees")
    .select("probation, probation_months, hire_date, insurance_registration_date")
    .eq("id", employeeId)
    .eq("organization_id", orgId)
    .single();

  if (!emp) return { error: "Radnik nije pronađen." };

  const regDate =
    registrationDate ||
    emp.insurance_registration_date ||
    emp.hire_date ||
    format(new Date(), "yyyy-MM-dd");

  const onProbation = emp.probation || (emp.probation_months ?? 0) > 0;

  const { error } = await supabase
    .from("employees")
    .update({
      insurance_status: "registered",
      insurance_registration_date: regDate,
      status: onProbation ? "probation" : "active",
    })
    .eq("id", employeeId)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };

  revalidatePath("/radnici");
  revalidatePath(`/radnici/${employeeId}`);
  return {};
}

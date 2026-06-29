"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { calculateEmployee, calculateActiveDaysInMonth } from "@/lib/calculations/salary";
import { computeMinuliRadYears } from "@/lib/calculations/minuli-rad";
import { PAYROLL_ELIGIBLE_STATUSES } from "@/lib/employees/form-utils";

async function getOrgByUser(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("organizations")
    .select("id, type")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  return data;
}

export async function calculatePeriod(
  year: number,
  month: number
): Promise<{ error?: string; periodId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getOrgByUser(supabase, user.id);
  if (!org) return { error: "Nemate kreiranu djelatnost." };

  // Kreira ili dohvata period
  const { data: period, error: periodError } = await supabase
    .from("salary_periods")
    .upsert(
      {
        organization_id: org.id,
        year,
        month,
        status: "calculated",
      },
      { onConflict: "organization_id,year,month" }
    )
    .select("id")
    .single();

  if (periodError || !period) return { error: periodError?.message ?? "Greška pri kreiranju perioda." };

  // Dohvata prijavljene radnike u aktivnom radnom odnosu
  const { data: employees } = await supabase
    .from("employees")
    .select(
      "id, salary_type, gross_salary, net_salary, tax_coefficient, hire_date, termination_date, meal_allowance_per_day, minuli_rad_rate, first_employment_date, prior_experience_years, prior_experience_months, municipality_name:municipality, municipality_code, canton"
    )
    .eq("organization_id", org.id)
    .eq("insurance_status", "registered")
    .in("status", [...PAYROLL_ELIGIBLE_STATUSES]);

  if (!employees || employees.length === 0) {
    return { error: "Nema prijavljenih radnika za obračun." };
  }

  const orgType = org.type as "obrt" | "doo";
  const periodEnd = new Date(year, month, 0);

  // Briše postojeće stavke za period (recalculate)
  await supabase.from("salary_items").delete().eq("period_id", period.id);

  const items = employees
    .map((emp) => {
      const { activeDays, totalDays } = calculateActiveDaysInMonth(
        year,
        month,
        emp.hire_date,
        emp.termination_date
      );

      if (activeDays <= 0) return null;

      const minuliYears = computeMinuliRadYears(
        emp.first_employment_date,
        emp.prior_experience_years ?? 0,
        emp.prior_experience_months ?? 0,
        periodEnd
      );
      const minuliRate = emp.minuli_rad_rate ?? 0.4;

      const calc = calculateEmployee(
        emp.salary_type as "target_net" | "net_contract" | "gross_base",
        emp.gross_salary,
        emp.net_salary,
        emp.tax_coefficient ?? 1.0,
        orgType,
        activeDays,
        totalDays,
        minuliYears,
        minuliRate
      );
      if (!calc) return null;

      const baseGrossBeforeMinuli = calc.gross_salary / (1 + minuliYears * (minuliRate / 100));
      const minuliAmount = Math.round((calc.gross_salary - baseGrossBeforeMinuli) * 100) / 100;

      const proRatedHours = Math.round(176 * (activeDays / totalDays));
      const workDays = activeDays < totalDays ? activeDays : 22;
      const dailyRate = emp.meal_allowance_per_day ?? 16.0;
      const mealAllowance = Math.round(dailyRate * workDays * 100) / 100;
      const totalPayment = Math.round((calc.net_salary + mealAllowance) * 100) / 100;
      const totalEmployerCost = Math.round((calc.total_employer_cost + mealAllowance) * 100) / 100;

      return {
        period_id: period.id,
        employee_id: emp.id,
        hours_worked: proRatedHours,
        gross_salary: calc.gross_salary,
        tax_coefficient: calc.tax_coefficient,
        pension_contribution: calc.pension_contribution,
        health_contribution: calc.health_contribution,
        unemployment_contribution: calc.unemployment_contribution,
        total_contributions_from: calc.total_contributions_from,
        tax_base: calc.tax_base,
        personal_deduction: calc.personal_deduction,
        taxable_base: calc.taxable_base,
        income_tax: calc.income_tax,
        net_salary: calc.net_salary,
        meal_allowance: mealAllowance,
        holiday_allowance: 0,
        transport_allowance: 0,
        other_allowances: 0,
        total_payment: totalPayment,
        pension_contribution_on: calc.pension_contribution_on,
        health_contribution_on: calc.health_contribution_on,
        unemployment_contribution_on: calc.unemployment_contribution_on,
        water_contribution: calc.water_contribution,
        disaster_contribution: calc.disaster_contribution,
        disability_fund: calc.disability_fund,
        total_employer_cost: totalEmployerCost,
        minuli_rad_years: minuliYears,
        minuli_rad_amount: minuliAmount,
        municipality_name: emp.municipality_name ?? null,
        municipality_code: emp.municipality_code ?? null,
        canton: emp.canton ?? null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (items.length === 0) return { error: "Radnici nemaju postavljenu plaću ili nisu aktivni u ovom mjesecu." };

  const { error: insertError } = await supabase.from("salary_items").insert(items);
  if (insertError) return { error: insertError.message };

  revalidatePath(`/place/${year}/${month}`);
  revalidatePath("/place");
  return { periodId: period.id };
}

interface PeriodItemInput {
  hours_worked: number | null;
  hours_overtime: number;
  hours_night: number;
  hours_sunday: number;
  hours_holiday: number;
  hours_sick_leave: number;
  hours_annual_leave: number;
  meal_allowance: number;
  holiday_allowance: number;
  transport_allowance: number;
  other_allowances: number;
}

export async function saveEmployeePeriodItem(
  employeeId: string,
  year: number,
  month: number,
  input: PeriodItemInput
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getOrgByUser(supabase, user.id);
  if (!org) return { error: "Nemate kreiranu djelatnost." };

  // Ensure period exists
  const { data: period, error: periodErr } = await supabase
    .from("salary_periods")
    .upsert(
      { organization_id: org.id, year, month, status: "calculated" },
      { onConflict: "organization_id,year,month" }
    )
    .select("id")
    .single();

  if (periodErr || !period) return { error: periodErr?.message ?? "Greška pri kreiranju perioda." };

  // Dohvati podatke radnika
  const { data: emp } = await supabase
    .from("employees")
    .select("salary_type, gross_salary, net_salary, tax_coefficient, hire_date, termination_date, meal_allowance_per_day, minuli_rad_rate, first_employment_date, prior_experience_years, prior_experience_months, insurance_status, status, municipality_name:municipality, municipality_code, canton")
    .eq("id", employeeId)
    .eq("organization_id", org.id)
    .single();

  if (!emp) return { error: "Radnik nije pronađen." };
  if (emp.insurance_status !== "registered" || !PAYROLL_ELIGIBLE_STATUSES.includes(emp.status as typeof PAYROLL_ELIGIBLE_STATUSES[number])) {
    return { error: "Radnik nije prijavljen na PIO ili nije u aktivnom radnom odnosu." };
  }

  const orgType = org.type as "obrt" | "doo";
  const { calculateEmployee: calc, calculateActiveDaysInMonth: calcDays } = await import("@/lib/calculations/salary");
  
  const { activeDays, totalDays } = calcDays(year, month, emp.hire_date, emp.termination_date);
  const periodEnd = new Date(year, month, 0);
  const minuliYears = computeMinuliRadYears(
    emp.first_employment_date,
    emp.prior_experience_years ?? 0,
    emp.prior_experience_months ?? 0,
    periodEnd
  );
  const minuliRate = emp.minuli_rad_rate ?? 0.4;

  const salaryCalc = calc(
    emp.salary_type as "target_net" | "net_contract" | "gross_base",
    emp.gross_salary,
    emp.net_salary,
    emp.tax_coefficient ?? 1.0,
    orgType,
    activeDays,
    totalDays,
    minuliYears,
    minuliRate
  );

  if (!salaryCalc) return { error: "Radnik nema postavljenu plaću." };

  const baseGrossBeforeMinuli = salaryCalc.gross_salary / (1 + minuliYears * (minuliRate / 100));
  const minuliAmount = Math.round((salaryCalc.gross_salary - baseGrossBeforeMinuli) * 100) / 100;

  const workDays = activeDays < totalDays ? activeDays : 22;
  const dailyRate = emp.meal_allowance_per_day ?? 16.0;
  const calculatedMeal = Math.round(dailyRate * workDays * 100) / 100;
  const mealAllowanceToSave = (input.meal_allowance === 0 || input.meal_allowance === dailyRate) ? calculatedMeal : input.meal_allowance;

  const totalPayment =
    salaryCalc.net_salary +
    mealAllowanceToSave +
    input.holiday_allowance +
    input.transport_allowance +
    input.other_allowances;

  const totalEmployerCost = salaryCalc.total_employer_cost + totalPayment - salaryCalc.net_salary;

  const upsertData = {
    period_id:                period.id,
    employee_id:              employeeId,
    hours_worked:             input.hours_worked ?? Math.round(176 * (activeDays / totalDays)),
    hours_overtime:           input.hours_overtime,
    hours_night:              input.hours_night,
    hours_sunday:             input.hours_sunday,
    hours_holiday:            input.hours_holiday,
    hours_sick_leave:         input.hours_sick_leave,
    hours_annual_leave:       input.hours_annual_leave,
    gross_salary:             salaryCalc.gross_salary,
    tax_coefficient:          salaryCalc.tax_coefficient,
    pension_contribution:     salaryCalc.pension_contribution,
    health_contribution:      salaryCalc.health_contribution,
    unemployment_contribution: salaryCalc.unemployment_contribution,
    total_contributions_from: salaryCalc.total_contributions_from,
    tax_base:                 salaryCalc.tax_base,
    personal_deduction:       salaryCalc.personal_deduction,
    taxable_base:             salaryCalc.taxable_base,
    income_tax:               salaryCalc.income_tax,
    net_salary:               salaryCalc.net_salary,
    meal_allowance:           mealAllowanceToSave,
    holiday_allowance:        input.holiday_allowance,
    transport_allowance:      input.transport_allowance,
    other_allowances:         input.other_allowances,
    total_payment:            totalPayment,
    pension_contribution_on:  salaryCalc.pension_contribution_on,
    health_contribution_on:   salaryCalc.health_contribution_on,
    unemployment_contribution_on: salaryCalc.unemployment_contribution_on,
    water_contribution:       salaryCalc.water_contribution,
    disaster_contribution:    salaryCalc.disaster_contribution,
    disability_fund:          salaryCalc.disability_fund,
    total_employer_cost:      totalEmployerCost,
    minuli_rad_years:         minuliYears,
    minuli_rad_amount:        minuliAmount,
    municipality_name:        emp.municipality_name ?? null,
    municipality_code:        emp.municipality_code ?? null,
    canton:                   emp.canton ?? null,
  };

  const { data: existingItem } = await supabase
    .from("salary_items")
    .select("id")
    .eq("period_id", period.id)
    .eq("employee_id", employeeId)
    .maybeSingle();

  let saveErr = null;
  if (existingItem) {
    const { error } = await supabase
      .from("salary_items")
      .update(upsertData)
      .eq("id", existingItem.id);
    saveErr = error;
  } else {
    const { error } = await supabase
      .from("salary_items")
      .insert(upsertData);
    saveErr = error;
  }

  if (saveErr) return { error: saveErr.message };

  revalidatePath(`/place/${year}/${month}`);
  return {};
}

export async function markAsPaid(
  periodId: string,
  paymentDate: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("salary_periods")
    .update({ status: "paid", payment_date: paymentDate })
    .eq("id", periodId)
    .in(
      "organization_id",
      (
        await supabase
          .from("organizations")
          .select("id")
          .eq("owner_id", user.id)
      ).data?.map((o) => o.id) ?? []
    );

  if (error) return { error: error.message };
  revalidatePath("/place");
  return {};
}

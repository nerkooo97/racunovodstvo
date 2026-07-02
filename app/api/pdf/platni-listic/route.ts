import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/supabase/get-active-org";
import { PlatniListic, PlatniListicList, PlatniListicData } from "@/lib/pdf/platni-listic";
import { calculateFromGross, calculateActiveDaysInMonth } from "@/lib/calculations/salary";

export async function handlePlatniListicPdf(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const salaryItemId = searchParams.get("id");
  const periodId = searchParams.get("periodId");

  if (!salaryItemId && !periodId) {
    return new NextResponse("Missing id or periodId", { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const activeOrgId = await getActiveOrgId(supabase, user.id);
  const { data: org } = activeOrgId
    ? await supabase.from("organizations").select("id, name, address, city, tax_id, type").eq("id", activeOrgId).single()
    : { data: null };

  if (!org) return new NextResponse("No organization", { status: 404 });

  const orgType = (org.type as "obrt" | "doo") ?? "obrt";

  if (salaryItemId) {
    const { data: item } = await supabase
      .from("salary_items")
      .select(`
        *,
        employee:employee_id (first_name, last_name, jmbg, occupation_name, city, hire_date, termination_date, meal_allowance_per_day),
        period:period_id (year, month)
      `)
      .eq("id", salaryItemId)
      .single();

    if (!item) return new NextResponse("Not found", { status: 404 });

    const pdfData = mapItemToPdfData(item, org);
    const buffer = await renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createElement(PlatniListic, { data: pdfData }) as any
    );

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="platni-listic-${item.id}.pdf"`,
      },
    });
  } else {
    const { data: items } = await supabase
      .from("salary_items")
      .select(`
        *,
        employee:employee_id (first_name, last_name, jmbg, occupation_name, city, hire_date, termination_date, meal_allowance_per_day),
        period:period_id (year, month)
      `)
      .eq("period_id", periodId);

    if (!items || items.length === 0) return new NextResponse("No items found for period", { status: 404 });

    const listData = items.map((it) => mapItemToPdfData(it, org));
    const buffer = await renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createElement(PlatniListicList, { items: listData }) as any
    );

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="platni-listici-${periodId}.pdf"`,
      },
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapItemToPdfData(item: any, org: any): PlatniListicData {
  const emp = Array.isArray(item.employee) ? item.employee[0] : item.employee;
  const period = Array.isArray(item.period) ? item.period[0] : item.period;
  const orgType = (org.type as "obrt" | "doo") ?? "obrt";

  const targetYear = period?.year ?? new Date().getFullYear();
  const targetMonth = period?.month ?? (new Date().getMonth() + 1);

  const calc = calculateFromGross(
    item.gross_salary ?? 0,
    item.tax_coefficient ?? 1.0,
    orgType,
    undefined,
    undefined,
    `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`
  );

  const { activeDays, totalDays } = calculateActiveDaysInMonth(
    targetYear,
    targetMonth,
    emp?.hire_date,
    emp?.termination_date
  );

  const dailyRate = emp?.meal_allowance_per_day ?? 16.0;
  const computedDays = activeDays < totalDays ? activeDays : 22;
  const calculatedMeal = Math.round(computedDays * dailyRate * 100) / 100;

  const mealAllowance = (item.meal_allowance !== null && item.meal_allowance !== undefined && item.meal_allowance > dailyRate) ? item.meal_allowance : calculatedMeal;
  const holidayAllowance = item.holiday_allowance ?? 0;
  const transportAllowance = item.transport_allowance ?? 0;
  const otherAllowances = item.other_allowances ?? 0;
  const extras = mealAllowance + holidayAllowance + transportAllowance + otherAllowances;

  return {
    org_name: org.name,
    org_type: orgType,
    org_address: org.address ?? undefined,
    org_city: org.city ?? undefined,
    org_jib: org.tax_id ?? undefined,
    employee_name: emp ? `${emp.last_name} ${emp.first_name}` : "—",
    employee_jmbg: emp?.jmbg ?? "—",
    employee_occupation: emp?.occupation_name ?? undefined,
    employee_municipality: emp?.city ?? undefined,
    hire_date: emp?.hire_date ? new Date(emp.hire_date).toLocaleDateString("bs-BA") : undefined,
    year: targetYear,
    month: targetMonth,
    work_hours: item.hours_worked || item.hours_total_fund || 176,
    gross_salary: item.gross_salary ?? calc.gross_salary,
    pension_contribution: item.pension_contribution ?? calc.pension_contribution,
    health_contribution: item.health_contribution ?? calc.health_contribution,
    unemployment_contribution: item.unemployment_contribution ?? calc.unemployment_contribution,
    total_contributions_from: item.total_contributions_from ?? calc.total_contributions_from,
    tax_base: item.tax_base ?? calc.tax_base,
    personal_deduction: item.personal_deduction ?? calc.personal_deduction,
    taxable_base: item.taxable_base ?? calc.taxable_base,
    income_tax: item.income_tax ?? calc.income_tax,
    net_salary: item.net_salary ?? calc.net_salary,
    meal_allowance: mealAllowance,
    transport_allowance: transportAllowance,
    other_allowances: holidayAllowance + otherAllowances,
    total_payout: (item.net_salary ?? calc.net_salary) + extras,
    pension_on: item.pension_contribution_on ?? calc.pension_contribution_on,
    health_on: item.health_contribution_on ?? calc.health_contribution_on,
    unemployment_on: item.unemployment_contribution_on ?? calc.unemployment_contribution_on,
    total_contributions_on: (item.pension_contribution_on ?? calc.pension_contribution_on) + (item.health_contribution_on ?? calc.health_contribution_on) + (item.unemployment_contribution_on ?? calc.unemployment_contribution_on),
    water: item.water_contribution ?? calc.water_contribution,
    disaster: item.disaster_contribution ?? calc.disaster_contribution,
    disability: item.disability_fund ?? calc.disability_fund,
    total_employer_cost: (item.gross_salary ?? calc.gross_salary) + 
      ((item.pension_contribution_on ?? calc.pension_contribution_on) + (item.health_contribution_on ?? calc.health_contribution_on) + (item.unemployment_contribution_on ?? calc.unemployment_contribution_on)) + 
      (item.water_contribution ?? calc.water_contribution) + 
      (item.disaster_contribution ?? calc.disaster_contribution) + 
      (item.disability_fund ?? calc.disability_fund ?? 0) + 
      extras,
  };
}

export async function GET(req: NextRequest) {
  try {
    return await handlePlatniListicPdf(req);
  } catch (err: any) {
    console.error("Platni listic PDF error:", err);
    return new NextResponse(`PDF generation failed: ${err?.message || err}`, { status: 500 });
  }
}

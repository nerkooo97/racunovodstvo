import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateFilledObrazac2001Pdf, Obrazac2001FillData } from "@/lib/pdf/obrazac-2001-fill";
import { calculateFromGross, SalaryCalculation } from "@/lib/calculations/salary";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const periodId = searchParams.get("periodId");
  if (!periodId) return new NextResponse("Missing periodId", { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, tax_id, address, city, activity_code, activity_name, type")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!org) return new NextResponse("No organization", { status: 404 });

  const { data: period } = await supabase
    .from("salary_periods")
    .select("year, month")
    .eq("id", periodId)
    .single();

  if (!period) return new NextResponse("Period not found", { status: 404 });

  const { data: items } = await supabase
    .from("salary_items")
    .select(`
      *,
      employee:employee_id (hire_date, termination_date)
    `)
    .eq("period_id", periodId);

  const orgType = (org.type as "obrt" | "doo") ?? "obrt";

  let minHireDate: string | null = null;
  let sumGross = 0;
  let sumEmpPio = 0, sumEmpHealth = 0, sumEmpUnemp = 0, sumEmpTotal = 0;
  let sumErpPio = 0, sumErpHealth = 0, sumErpUnemp = 0, sumErpTotal = 0;
  let sumTax = 0;

  (items ?? []).forEach((it) => {
    const emp = Array.isArray(it.employee) ? it.employee[0] : it.employee;
    if (emp?.hire_date && (!minHireDate || emp.hire_date > minHireDate)) {
      minHireDate = emp.hire_date;
    }

    const calc: SalaryCalculation = calculateFromGross(it.gross_salary ?? 0, it.tax_coefficient ?? 1.0, orgType);
    sumGross += calc.gross_salary;
    sumEmpPio += calc.pension_contribution;
    sumEmpHealth += calc.health_contribution;
    sumEmpUnemp += calc.unemployment_contribution;
    sumEmpTotal += calc.total_contributions_from;

    sumErpPio += calc.pension_contribution_on;
    sumErpHealth += calc.health_contribution_on;
    sumErpUnemp += calc.unemployment_contribution_on;
    sumErpTotal += calc.total_contributions_on;

    sumTax += calc.income_tax;
  });

  const totalPio = sumEmpPio + sumErpPio;
  const totalHealth = sumEmpHealth + sumErpHealth;
  const totalUnemp = sumEmpUnemp + sumErpUnemp;
  const grandTotal = totalPio + totalHealth + totalUnemp + sumTax;

  const totalDaysInMonth = new Date(period.year, period.month, 0).getDate();

  let startDay = "01";
  let startMonth = String(period.month).padStart(2, "0");
  let startYear = String(period.year);

  if (minHireDate) {
    const d = new Date(minHireDate);
    if (d.getUTCFullYear() === period.year && (d.getUTCMonth() + 1) === period.month) {
      startDay = String(d.getUTCDate()).padStart(2, "0");
    }
  }

  const endDay = String(totalDaysInMonth).padStart(2, "0");
  const endMonth = String(period.month).padStart(2, "0");
  const endYear = String(period.year);

  const activityStr = org.activity_code
    ? `${org.activity_code} ${org.activity_name || ""}`.trim()
    : (org.activity_name || "");

  const fillData: Obrazac2001FillData = {
    orgName: org.name,
    orgJib: org.tax_id ?? "",
    orgAddr: org.address ?? "",
    orgCity: org.city ?? "",
    orgActivity: activityStr,
    employeeCount: items?.length ?? 0,
    dayStart: startDay,
    monthStart: startMonth,
    yearStart: startYear,
    dayEnd: endDay,
    monthEnd: endMonth,
    yearEnd: endYear,
    grossMoney: sumGross,
    grossBenefits: 0,
    grossTotal: sumGross,
    empPio: sumEmpPio,
    empHealth: sumEmpHealth,
    empUnemp: sumEmpUnemp,
    empTotal: sumEmpTotal,
    erpPio: sumErpPio,
    erpHealth: sumErpHealth,
    erpUnemp: sumErpUnemp,
    erpTotal: sumErpTotal,
    totalPio,
    totalHealth,
    totalUnemp,
    incomeTax: sumTax,
    grandTotal,
    isObrt: orgType === "obrt",
    fillDate: new Date().toLocaleDateString("bs-BA"),
  };

  const pdfBytes = await generateFilledObrazac2001Pdf(fillData);

  return new NextResponse(pdfBytes as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="obrazac-2001-${period.year}-${period.month}.pdf"`,
    },
  });
}

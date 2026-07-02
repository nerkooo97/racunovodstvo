import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/supabase/get-active-org";
import { generateFilledMip1023Pdf, Mip1023FillData, Mip1023RowItem } from "@/lib/pdf/mip-1023-fill";
import { calculateFromGross, SalaryCalculation } from "@/lib/calculations/salary";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const periodId = searchParams.get("periodId");
  if (!periodId) return new NextResponse("Missing periodId", { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const activeOrgId = await getActiveOrgId(supabase, user.id);
  const { data: org } = activeOrgId
    ? await supabase.from("organizations").select("id, name, tax_id, activity_code, activity_name, type").eq("id", activeOrgId).single()
    : { data: null };

  if (!org) return new NextResponse("No organization", { status: 404 });

  const { data: period } = await supabase
    .from("salary_periods")
    .select("year, month, payment_date")
    .eq("id", periodId)
    .single();

  if (!period) return new NextResponse("Period not found", { status: 404 });

  const { data: items } = await supabase
    .from("salary_items")
    .select(`
      *,
      employee:employee_id (first_name, last_name, jmbg, city, municipality_code)
    `)
    .eq("period_id", periodId);

  const orgType = (org.type as "obrt" | "doo") ?? "obrt";

  let totalGross = 0;
  let totalContribFrom = 0;
  let totalDeductions = 0;
  let totalIncomeTax = 0;
  let sumErpPio = 0, sumErpHealth = 0, sumErpUnemp = 0;

  const formattedPaymentDate = period.payment_date
    ? new Date(period.payment_date).toLocaleDateString("bs-BA")
    : new Date().toLocaleDateString("bs-BA");

  const rowItems: Mip1023RowItem[] = (items ?? []).map((it) => {
    const emp = Array.isArray(it.employee) ? it.employee[0] : it.employee;
    const calc: SalaryCalculation = calculateFromGross(it.gross_salary ?? 0, it.tax_coefficient ?? 1.0, orgType, undefined, undefined, `${period.year}-${String(period.month).padStart(2, "0")}-01`);

    totalGross += calc.gross_salary;
    totalContribFrom += calc.total_contributions_from;
    totalDeductions += calc.personal_deduction;
    totalIncomeTax += calc.income_tax;

    sumErpPio += calc.pension_contribution_on;
    sumErpHealth += calc.health_contribution_on;
    sumErpUnemp += calc.unemployment_contribution_on;

    return {
      vrstaIsplate: "1",
      jmbg: emp?.jmbg ?? "—",
      employeeName: emp ? `${emp.first_name} ${emp.last_name}` : "—",
      municipalityCode: emp?.municipality_code || "094",
      paymentDate: formattedPaymentDate,
      workHours: it.hours_worked || 176,
      sickHours: 0,
      grossSalary: calc.gross_salary,
      benefits: 0,
      taxableIncome: calc.gross_salary,
      empPio: calc.pension_contribution,
      empHealth: calc.health_contribution,
      empUnemp: calc.unemployment_contribution,
      empTotal: calc.total_contributions_from,
      incomeNet: calc.gross_salary - calc.total_contributions_from,
      deductionFactor: it.tax_coefficient ?? 1.0,
      personalDeduction: calc.personal_deduction,
      taxBase: calc.taxable_base,
      incomeTax: calc.income_tax,
      overtimeHours: 0,
      overtimeDegree: "00/12",
      jobPositionCode: "0",
      pensionSeniority: 0,
    };
  });

  const fillData: Mip1023FillData = {
    orgName: org.name,
    orgJib: org.tax_id ?? "",
    orgActivity: org.activity_code ?? "30.20",
    employeeCount: items?.length ?? 0,
    year: period.year,
    month: period.month,
    totalGross,
    totalContribFrom,
    totalDeductions,
    totalIncomeTax,
    erpPio: sumErpPio,
    erpHealth: sumErpHealth,
    erpUnemp: sumErpUnemp,
    erpAdditionalHealth: 0,
    fillDate: formattedPaymentDate,
    items: rowItems,
  };

  const pdfBytes = await generateFilledMip1023Pdf(fillData);

  return new NextResponse(pdfBytes as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="mip-1023-${period.year}-${period.month}.pdf"`,
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PDFDocument, PDFName } from "pdf-lib";
import { generateFilledGip1022Pdf, Gip1022FillData, Gip1022MonthItem } from "@/lib/pdf/gip-1022-fill";
import { calculateFromGross } from "@/lib/calculations/salary";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const periodId = searchParams.get("periodId");
  if (!periodId) return new NextResponse("Missing periodId", { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, tax_id, address, type")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!org) return new NextResponse("No organization", { status: 404 });

  const { data: period } = await supabase
    .from("salary_periods")
    .select("id, year, month, payment_date")
    .eq("id", periodId)
    .single();

  if (!period) return new NextResponse("Period not found", { status: 404 });

  const orgType = (org.type as "obrt" | "doo") ?? "obrt";
  const formattedToday = new Date().toLocaleDateString("bs-BA");

  // Dohvatamo SVE periode za ovu godinu — GIP-1022 je godišnji izvještaj
  const { data: yearPeriods } = await supabase
    .from("salary_periods")
    .select("id, month, payment_date")
    .eq("organization_id", org.id)
    .eq("year", period.year);

  const allPeriodIds = (yearPeriods ?? []).map((p) => p.id);
  const periodMonthMap = new Map<string, { month: number; paymentDate: string }>(
    (yearPeriods ?? []).map((p) => [
      p.id,
      {
        month: p.month,
        paymentDate: p.payment_date
          ? new Date(p.payment_date).toLocaleDateString("bs-BA")
          : formattedToday,
      },
    ])
  );

  if (allPeriodIds.length === 0) {
    return new NextResponse("No periods for this year", { status: 404 });
  }

  const { data: items } = await supabase
    .from("salary_items")
    .select(`
      *,
      employee:employee_id (id, first_name, last_name, jmbg, address, city)
    `)
    .in("period_id", allPeriodIds);

  // Grupišemo stavke po radniku (JMBG kao primarni ključ, UUID kao fallback)
  const empMap = new Map<string, { employee: any; items: any[] }>();
  (items ?? []).forEach((it) => {
    const emp = Array.isArray(it.employee) ? it.employee[0] : it.employee;
    if (!emp) return;
    // Koristimo JMBG kao ključ da spriječimo duplikate pri različitim UUID-ovima
    const empKey = emp.jmbg ? String(emp.jmbg) : String(emp.id);
    if (!empMap.has(empKey)) {
      empMap.set(empKey, { employee: emp, items: [] });
    }
    empMap.get(empKey)!.items.push(it);
  });

  const buildFillData = (emp: any, empSalaryItems: any[]): Gip1022FillData => {
    const monthItems: Gip1022MonthItem[] = empSalaryItems.map((it) => {
      // Svaka stavka nosi informaciju o svom periodu (mesecu)
      const periodInfo = periodMonthMap.get(it.period_id);
      const itemMonth = periodInfo?.month ?? period.month;
      const itemPayDate = periodInfo?.paymentDate ?? formattedToday;

      const calc = calculateFromGross(it.gross_salary ?? 0, it.tax_coefficient ?? 1.0, orgType);
      return {
        month: itemMonth,
        year: period.year,
        paymentDate: itemPayDate,
        grossSalary: calc.gross_salary,
        benefits: 0,
        empPio: calc.pension_contribution,
        empHealth: calc.health_contribution,
        empUnemp: calc.unemployment_contribution,
        empTotal: calc.total_contributions_from,
        incomeNetDeducted: calc.gross_salary - calc.total_contributions_from,
        deductionFactor: it.tax_coefficient ?? 1.0,
        personalDeduction: calc.personal_deduction,
        taxBase: calc.taxable_base,
        incomeTax: calc.income_tax,
        netPayout: (calc.gross_salary - calc.total_contributions_from) - calc.income_tax,
      };
    });

    return {
      year: period.year,
      orgName: org.name,
      orgJib: org.tax_id ?? "",
      orgAddress: org.address ?? "",
      employeeName: `${emp.first_name} ${emp.last_name}`,
      employeeJmbg: emp.jmbg ?? "",
      employeeAddress: emp.address ? `${emp.address}, ${emp.city || ""}` : emp.city || "",
      fillDate: formattedToday,
      items: monthItems,
    };
  };

  // Ako nema radnika, vrati prazan obrazac
  if (empMap.size === 0) {
    const emptyBytes = await generateFilledGip1022Pdf({
      year: period.year,
      orgName: org.name,
      orgJib: org.tax_id ?? "",
      employeeName: "—",
      employeeJmbg: "—",
      fillDate: formattedToday,
      items: [],
    });
    return new NextResponse(emptyBytes as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="gip-1022-${period.year}.pdf"`,
      },
    });
  }

  // Jedan radnik — direktni povratak
  if (empMap.size === 1) {
    const [entry] = empMap.values();
    const pdfBytes = await generateFilledGip1022Pdf(buildFillData(entry.employee, entry.items));
    return new NextResponse(pdfBytes as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="gip-1022-${period.year}.pdf"`,
      },
    });
  }

  // Više radnika — spajamo stranice u jedan PDF
  const { PDFDict: PDict, PDFBool: PBool } = await import("pdf-lib");
  const mergedPdf = await PDFDocument.create();

  const mergedAcroForm = mergedPdf.context.obj({
    NeedAppearances: PBool.True,
    Fields: mergedPdf.context.obj([]),
  });
  mergedPdf.catalog.set(PDFName.of("AcroForm"), mergedAcroForm);

  for (const entry of empMap.values()) {
    const singleBytes = await generateFilledGip1022Pdf(buildFillData(entry.employee, entry.items));
    const singleDoc = await PDFDocument.load(singleBytes);
    const pages = await mergedPdf.copyPages(singleDoc, singleDoc.getPageIndices());
    pages.forEach((pg) => mergedPdf.addPage(pg));
  }

  const finalBytes = await mergedPdf.save();
  return new NextResponse(finalBytes as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="gip-1022-${period.year}.pdf"`,
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateMip1023Xml, Mip1023XmlData, Mip1023XmlRowItem } from "@/lib/xml/mip-1023-xml";
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
    .select("id, name, tax_id, activity_code, type")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

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
      employee:employee_id (first_name, last_name, jmbg, municipality_code)
    `)
    .eq("period_id", periodId);

  const orgType = (org.type as "obrt" | "doo") ?? "obrt";

  let totalGross = 0;
  let totalContribFrom = 0;
  let totalDeductions = 0;
  let totalIncomeTax = 0;
  let sumErpPio = 0, sumErpHealth = 0, sumErpUnemp = 0;

  const formattedPaymentDate = period.payment_date || new Date().toISOString().slice(0, 10);
  const formattedToday = new Date().toISOString().slice(0, 10);

  const mStr = String(period.month).padStart(2, "0");
  const lastDay = new Date(period.year, period.month, 0).getDate();
  const periodOd = `${period.year}-${mStr}-01`;
  const periodDo = `${period.year}-${mStr}-${String(lastDay).padStart(2, "0")}`;

  const rowItems: Mip1023XmlRowItem[] = (items ?? []).map((it) => {
    const emp = Array.isArray(it.employee) ? it.employee[0] : it.employee;
    const calc: SalaryCalculation = calculateFromGross(it.gross_salary ?? 0, it.tax_coefficient ?? 1.0, orgType);

    totalGross += calc.gross_salary;
    totalContribFrom += calc.total_contributions_from;
    totalDeductions += calc.personal_deduction;
    totalIncomeTax += calc.income_tax;

    sumErpPio += calc.pension_contribution_on;
    sumErpHealth += calc.health_contribution_on;
    sumErpUnemp += calc.unemployment_contribution_on;

    return {
      vrstaIsplate: "1",
      jmb: emp?.jmbg ?? "1111111111111",
      imePrezime: emp ? `${emp.last_name} ${emp.first_name}` : "KO NERMIN",
      datumIsplate: formattedPaymentDate,
      radniSati: it.hours_worked || 176.00,
      radniSatiBolovanje: 0.00,
      brutoPlaca: calc.gross_salary,
      koristiIDrugiOporeziviPrihodi: 0.00,
      ukupanPrihod: calc.gross_salary,
      iznosPIO: calc.pension_contribution,
      iznosZO: calc.health_contribution,
      iznosNezaposlenost: calc.unemployment_contribution,
      doprinosi: calc.total_contributions_from,
      prihodUmanjenZaDoprinose: calc.gross_salary - calc.total_contributions_from,
      faktorLicnogOdbitka: it.tax_coefficient ?? 1.0,
      iznosLicnogOdbitka: calc.personal_deduction,
      osnovicaPoreza: calc.taxable_base,
      iznosPoreza: calc.income_tax,
      radniSatiUT: 0.00,
      stepenUvecanja: "0",
      sifraRadnogMjestaUT: "000000",
      doprinosiPIOMIOzaUT: 0.00,
      beneficiraniStaz: false,
      opcinaPrebivalista: emp?.municipality_code || "094",
    };
  });

  const xmlData: Mip1023XmlData = {
    jibPoslodavca: org.tax_id ?? "1231244432222",
    nazivPoslodavca: org.name,
    brojZahtjeva: 1,
    datumPodnosenja: formattedToday,
    brojUposlenih: items?.length ?? 0,
    periodOd,
    periodDo,
    sifraDjelatnosti: org.activity_code ?? "30.20",
    erpPio: sumErpPio,
    erpZo: sumErpHealth,
    erpNezaposlenost: sumErpUnemp,
    dodatniDoprinosiZO: 0.00,
    totalPrihod: totalGross,
    totalDoprinosi: totalContribFrom,
    totalLicniOdbici: totalDeductions,
    totalPorez: totalIncomeTax,
    items: rowItems,
  };

  const xmlContent = generateMip1023Xml(xmlData);

  return new NextResponse(xmlContent, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="mip-1023-${period.year}-${period.month}.xml"`,
    },
  });
}

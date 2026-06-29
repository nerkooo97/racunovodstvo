import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/page-header";
import PeriodActions from "./PeriodActions";
import PeriodDashboard from "./PeriodDashboard";
import { calculateActiveDaysInMonth, generateAggregatedVouchers, calculateFromGross, SalaryItemForVoucher } from "@/lib/calculations/salary";
import { ArrowLeft, Receipt } from "lucide-react";

const MONTH_NAMES = [
  "", "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

export default async function PeriodPage({
  params,
}: {
  params: Promise<{ godina: string; mjesec: string }>;
}) {
  const { godina, mjesec } = await params;
  const year  = parseInt(godina, 10);
  const month = parseInt(mjesec, 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    redirect("/place");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, type, address, city, canton, municipality_code, tax_id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!org) redirect("/nova-djelatnost");

  const { data: period } = await supabase
    .from("salary_periods")
    .select("id, status, payment_date")
    .eq("organization_id", org.id)
    .eq("year", year)
    .eq("month", month)
    .single();

  const periodId = period?.id ?? null;

  const { data: items } = periodId
    ? await supabase
        .from("salary_items")
        .select(`
          *,
          employee:employee_id (id, first_name, last_name, occupation_name, hire_date, termination_date, bank_account, bank_name)
        `)
        .eq("period_id", periodId)
    : { data: [] };

  const orgType = (org.type as "obrt" | "doo") ?? "obrt";

  // Identifikacija radnika sa djelimičnim mjesecom
  const partialEmployees = (items ?? []).map((it) => {
    const emp = Array.isArray(it.employee) ? it.employee[0] : it.employee;
    if (!emp) return null;
    const { activeDays, totalDays } = calculateActiveDaysInMonth(year, month, emp.hire_date, emp.termination_date);
    if (activeDays > 0 && activeDays < totalDays) {
      return { empName: `${emp.first_name} ${emp.last_name}`, hireDate: emp.hire_date, activeDays, totalDays };
    }
    return null;
  }).filter(Boolean);

  const salaryItemsForVouchers: SalaryItemForVoucher[] = (items ?? []).map((it) => ({
    calc: calculateFromGross(it.gross_salary ?? 0, it.tax_coefficient ?? 1.0, orgType),
    canton: it.canton ?? null,
    municipalityCode: it.municipality_code ?? null,
    municipalityName: it.municipality_name ?? null,
  }));

  const vouchers = generateAggregatedVouchers(
    salaryItemsForVouchers,
    org.canton,
    org.city ?? "Sarajevo",
    org.municipality_code ?? "109",
    false
  );

  const totals = (items ?? []).reduce(
    (acc, it) => {
      const meal = it.meal_allowance ?? 0;
      const holiday = it.holiday_allowance ?? 0;
      const transport = it.transport_allowance ?? 0;
      const other = it.other_allowances ?? 0;
      const extras = meal + holiday + transport + other;

      return {
        gross:        acc.gross + (it.gross_salary ?? 0),
        net:          acc.net + (it.net_salary ?? 0),
        tax:          acc.tax + (it.income_tax ?? 0),
        contribFrom:  acc.contribFrom + (it.total_contributions_from ?? 0),
        meal:         acc.meal + meal,
        transport:    acc.transport + transport,
        other:        acc.other + holiday + other,
        totalPayout:  acc.totalPayout + (it.total_payment ?? (it.net_salary + extras)),
        cost:         acc.cost + (it.total_employer_cost ?? 0),
      };
    },
    { gross: 0, net: 0, tax: 0, contribFrom: 0, meal: 0, transport: 0, other: 0, totalPayout: 0, cost: 0 }
  );

  const totalVouchersSum = vouchers.reduce((sum, v) => sum + v.amount, 0);

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 pb-16">
      <PageHeader
        title={`Obračun plata — ${MONTH_NAMES[month]} ${year}`}
        description={org.name}
      >
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/place">
            <ArrowLeft className="h-4 w-4" />
            Nazad na obračune
          </Link>
        </Button>
      </PageHeader>

      <PeriodActions
        year={year}
        month={month}
        periodId={periodId}
        status={period?.status ?? null}
      />

      {items && items.length > 0 ? (
        <PeriodDashboard
          items={items}
          totals={totals}
          vouchers={vouchers}
          org={org}
          year={year}
          month={month}
          periodId={periodId}
          status={period?.status ?? null}
          partialEmployees={partialEmployees}
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-2xl bg-muted/20 border-dashed">
          <Receipt className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="font-bold text-base mb-1">Nema aktivnog obračuna</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Kliknite na dugme &quot;Obračunaj sve&quot; iznad kako biste pokrenuli obračun za ovaj period.
          </p>
        </div>
      )}
    </div>
  );
}

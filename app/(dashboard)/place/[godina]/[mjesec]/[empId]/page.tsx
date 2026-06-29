import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/page-header";
import EmployeePeriodForm from "./EmployeePeriodForm";
import { ArrowLeft } from "lucide-react";
import {
  DEFAULT_COUNT_SETTINGS,
  effectiveHours,
} from "@/lib/calculations/timesheet";

const MONTH_NAMES = [
  "", "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

export default async function EmployeePeriodPage({
  params,
}: {
  params: Promise<{ godina: string; mjesec: string; empId: string }>;
}) {
  const { godina, mjesec, empId } = await params;
  const year  = parseInt(godina, 10);
  const month = parseInt(mjesec, 10);

  if (isNaN(year) || isNaN(month)) redirect("/place");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, type")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!org) redirect("/nova-djelatnost");

  const { data: emp } = await supabase
    .from("employees")
    .select("id, first_name, last_name, gross_salary, net_salary, salary_type, tax_coefficient, hire_date, termination_date, meal_allowance_per_day")
    .eq("id", empId)
    .eq("organization_id", org.id)
    .single();

  if (!emp) notFound();

  // Pronađi ili kreira salary_item za ovog radnika u periodu
  const { data: period } = await supabase
    .from("salary_periods")
    .select("id")
    .eq("organization_id", org.id)
    .eq("year", year)
    .eq("month", month)
    .single();

  const { data: item } = period
    ? await supabase
        .from("salary_items")
        .select("*")
        .eq("period_id", period.id)
        .eq("employee_id", empId)
        .single()
    : { data: null };

  // Dohvati šihtericu ako postoji
  const { data: timesheet } = await supabase
    .from("timesheets")
    .select("id")
    .eq("organization_id", org.id)
    .eq("employee_id", empId)
    .eq("year", year)
    .eq("month", month)
    .single();

  const { data: timesheetSettings } = await supabase
    .from("timesheet_settings")
    .select("count_annual_leave, count_holiday, count_sick_leave")
    .eq("organization_id", org.id)
    .eq("user_id", user.id)
    .single();

  const countSettings = {
    countAnnualLeave: timesheetSettings?.count_annual_leave ?? DEFAULT_COUNT_SETTINGS.countAnnualLeave,
    countHoliday: timesheetSettings?.count_holiday ?? DEFAULT_COUNT_SETTINGS.countHoliday,
    countSickLeave: timesheetSettings?.count_sick_leave ?? DEFAULT_COUNT_SETTINGS.countSickLeave,
  };

  const { data: timesheetDays } = timesheet
    ? await supabase
        .from("timesheet_days")
        .select("start_time, end_time, break_minutes, total_hours, is_day_off, absence_code")
        .eq("timesheet_id", timesheet.id)
    : { data: [] };

  const hoursFromTimesheet = timesheetDays
    ? timesheetDays.reduce(
        (s, d) =>
          s +
          effectiveHours(
            {
              start_time: d.start_time,
              end_time: d.end_time,
              break_minutes: d.break_minutes ?? 30,
              total_hours: d.total_hours,
              absence_code: d.absence_code,
              is_day_off: d.is_day_off ?? false,
            },
            countSettings
          ),
        0
      )
    : null;

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <PageHeader
        title={`Obračun, ${emp.first_name} ${emp.last_name} · ${MONTH_NAMES[month]} ${year}`}
        description="Podešavanje ugovorenih parametara i izračun plate za period"
      >
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={`/place/${year}/${month}`}>
            <ArrowLeft className="h-4 w-4" />
            Nazad na listu
          </Link>
        </Button>
      </PageHeader>

      <EmployeePeriodForm
        employeeId={emp.id}
        year={year}
        month={month}
        orgType={org.type as "obrt" | "doo"}
        employee={{
          gross_salary:           emp.gross_salary ?? 0,
          net_salary:             emp.net_salary ?? null,
          salary_type:            (emp.salary_type as "target_net" | "net_contract" | "gross_base") ?? "gross_base",
          tax_coefficient:        emp.tax_coefficient ?? 1.0,
          hire_date:              emp.hire_date ?? null,
          termination_date:        emp.termination_date ?? null,
          meal_allowance_per_day: emp.meal_allowance_per_day ?? 16.0,
        }}
        existing={
          item
            ? {
                hours_worked:         item.hours_worked ?? null,
                hours_overtime:       item.hours_overtime ?? 0,
                hours_night:          item.hours_night ?? 0,
                hours_sunday:         item.hours_sunday ?? 0,
                hours_holiday:        item.hours_holiday ?? 0,
                hours_sick_leave:     item.hours_sick_leave ?? 0,
                hours_annual_leave:   item.hours_annual_leave ?? 0,
                meal_allowance:       item.meal_allowance ?? 0,
                holiday_allowance:    item.holiday_allowance ?? 0,
                transport_allowance:  item.transport_allowance ?? 0,
                other_allowances:     item.other_allowances ?? 0,
              }
            : null
        }
        hoursFromTimesheet={hoursFromTimesheet}
      />
    </div>
  );
}

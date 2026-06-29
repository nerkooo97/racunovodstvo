import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/shared/page-header";
import TimesheetGrid from "./TimesheetGrid";
import { DEFAULT_COUNT_SETTINGS } from "@/lib/calculations/timesheet";
import { PAYROLL_ELIGIBLE_STATUSES } from "@/lib/employees/form-utils";

export default async function SihtenicaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!org) redirect("/nova-djelatnost");

  const { data: employees } = await supabase
    .from("employees")
    .select("id, first_name, last_name")
    .eq("organization_id", org.id)
    .eq("insurance_status", "registered")
    .in("status", [...PAYROLL_ELIGIBLE_STATUSES])
    .order("last_name", { ascending: true });

  if (!employees || employees.length === 0) {
    return (
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <PageHeader title="Šihterica" description={org.name} />
        <p className="text-muted-foreground text-sm">
          Nema prijavljenih radnika. Dodajte i prijavite radnike u odjeljku{" "}
          <Link href="/radnici" className="underline">Radnici</Link>.
        </p>
      </div>
    );
  }

  const now = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

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

  const { data: timesheets } = await supabase
    .from("timesheets")
    .select("id, employee_id, year, month")
    .eq("organization_id", org.id)
    .in("employee_id", employees.map((e) => e.id));

  const timesheetIds = (timesheets ?? []).map((t) => t.id);

  const { data: existingDays } = timesheetIds.length > 0
    ? await supabase
        .from("timesheet_days")
        .select("*")
        .in("timesheet_id", timesheetIds)
    : { data: [] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingDaysMap: Record<string, Record<string, any>> = {};
  for (const ts of timesheets ?? []) {
    const key = `${ts.employee_id}-${ts.year}-${ts.month}`;
    existingDaysMap[key] = {};
    for (const day of existingDays ?? []) {
      if (day.timesheet_id === ts.id) {
        existingDaysMap[key][day.date] = {
          date: day.date,
          start_time: day.start_time ?? "",
          end_time: day.end_time ?? "",
          break_minutes: day.break_minutes ?? 30,
          total_hours: day.total_hours ?? null,
          field_work_hours: day.field_work_hours ?? null,
          standby_hours: day.standby_hours ?? null,
          absence_code: day.absence_code ?? null,
          other_code: day.other_code ?? null,
          note: day.note ?? "",
          is_day_off: day.is_day_off ?? false,
        };
      }
    }
  }

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      <PageHeader
        title="Šihterica"
        description={`Evidencija radnih sati · ${org.name}`}
      />
      <TimesheetGrid
        employees={employees}
        initialYear={currentYear}
        initialMonth={currentMonth}
        existingDaysMap={existingDaysMap}
        initialSettings={countSettings}
      />
    </div>
  );
}

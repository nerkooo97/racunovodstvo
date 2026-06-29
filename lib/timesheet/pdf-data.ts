import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calcOvertimeHours,
  DEFAULT_COUNT_SETTINGS,
  effectiveHours,
  type TimesheetCountSettings,
} from "@/lib/calculations/timesheet";
import {
  daysInMonth,
  localDateKey,
  localDayOfWeek,
} from "@/lib/utils";
import {
  formatAbsenceCell,
  formatBreakTime,
  formatHourValue,
  formatOfficialDate,
  formatOtherCell,
  monthPeriodLabel,
} from "@/lib/timesheet/pdf-format";

const DAY_NAMES = ["", "Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"];

const MONTH_NAMES = [
  "", "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

export interface SihtericaDayRow {
  date: string;
  dateDisplay: string;
  dayName: string;
  startTime: string;
  endTime: string;
  breakDisplay: string;
  dailyWorkHours: string;
  fieldWorkHours: string;
  standbyHours: string;
  absenceDisplay: string;
  otherDisplay: string;
  totalDayHours: string;
  isDayOff: boolean;
}

export interface SihtericaPdfData {
  orgName: string;
  orgAddress: string;
  orgCity: string;
  orgJib: string;
  employeeName: string;
  employeeJmbg: string;
  employeeOccupation: string;
  year: number;
  month: number;
  monthName: string;
  monthPeriod: string;
  days: SihtericaDayRow[];
  totalEffectiveHours: number;
  totalOvertimeHours: number;
  totalFieldHours: number;
  totalStandbyHours: number;
  workDaysCount: number;
}

type DbDay = {
  date: string;
  start_time: string | null;
  end_time: string | null;
  break_minutes: number | null;
  total_hours: number | null;
  overtime_hours: number | null;
  field_work_hours: number | null;
  standby_hours: number | null;
  absence_code: string | null;
  note: string | null;
  is_day_off: boolean | null;
};

function formatTime(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 5);
}

function normalizeDateKey(date: string): string {
  return date.slice(0, 10);
}

function buildDayRows(
  year: number,
  month: number,
  existing: Record<string, DbDay>,
  countSettings: TimesheetCountSettings
): SihtericaDayRow[] {
  const count = daysInMonth(year, month);
  const rows: SihtericaDayRow[] = [];

  for (let d = 1; d <= count; d++) {
    const key = localDateKey(year, month, d);
    const dow = localDayOfWeek(year, month, d);
    const ex = existing[key];

    const isDayOff = ex?.is_day_off ?? false;
    const startTime = ex?.start_time ? formatTime(ex.start_time) : "";
    const endTime = ex?.end_time ? formatTime(ex.end_time) : "";
    const breakMinutes = ex?.break_minutes ?? 0;
    const totalHours = ex?.total_hours ?? null;
    const absenceCode = ex?.absence_code ?? "";
    const hasManualTimes = !!(ex?.start_time && ex?.end_time);

    const dayLike = {
      start_time: startTime || null,
      end_time: endTime || null,
      break_minutes: breakMinutes ?? 0,
      total_hours: totalHours,
      absence_code: ex?.absence_code ?? null,
      is_day_off: isDayOff,
    };

    const eff = effectiveHours(dayLike, countSettings);
    const overtime =
      ex?.overtime_hours != null && ex.overtime_hours > 0
        ? ex.overtime_hours
        : isDayOff
          ? 0
          : calcOvertimeHours(eff);

    const dailyWork =
      hasManualTimes && totalHours != null ? totalHours : 0;

    rows.push({
      date: key,
      dateDisplay: formatOfficialDate(key, DAY_NAMES[dow]),
      dayName: DAY_NAMES[dow],
      startTime: absenceCode && !hasManualTimes ? "" : startTime,
      endTime: absenceCode && !hasManualTimes ? "" : endTime,
      breakDisplay: absenceCode && !hasManualTimes ? "" : formatBreakTime(breakMinutes),
      dailyWorkHours: formatHourValue(dailyWork),
      fieldWorkHours: formatHourValue(ex?.field_work_hours ?? 0),
      standbyHours: formatHourValue(ex?.standby_hours ?? 0),
      absenceDisplay: formatAbsenceCell(
        absenceCode && !hasManualTimes ? eff : 0,
        absenceCode
      ),
      otherDisplay: formatOtherCell(overtime, ex?.note ?? ""),
      totalDayHours: formatHourValue(eff),
      isDayOff,
    });
  }

  return rows;
}

export async function loadCountSettings(
  supabase: SupabaseClient,
  orgId: string,
  userId: string
): Promise<TimesheetCountSettings> {
  const { data } = await supabase
    .from("timesheet_settings")
    .select("count_annual_leave, count_holiday, count_sick_leave")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .single();

  return {
    countAnnualLeave: data?.count_annual_leave ?? DEFAULT_COUNT_SETTINGS.countAnnualLeave,
    countHoliday: data?.count_holiday ?? DEFAULT_COUNT_SETTINGS.countHoliday,
    countSickLeave: data?.count_sick_leave ?? DEFAULT_COUNT_SETTINGS.countSickLeave,
  };
}

export async function loadSihtericaPdfData(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  employeeId: string,
  year: number,
  month: number
): Promise<SihtericaPdfData | null> {
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, address, city, tax_id")
    .eq("id", orgId)
    .single();

  const { data: emp } = await supabase
    .from("employees")
    .select("id, first_name, last_name, jmbg, occupation_name")
    .eq("id", employeeId)
    .eq("organization_id", orgId)
    .single();

  if (!org || !emp) return null;

  const countSettings = await loadCountSettings(supabase, orgId, userId);

  const { data: timesheet } = await supabase
    .from("timesheets")
    .select("id")
    .eq("organization_id", orgId)
    .eq("employee_id", employeeId)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  const existing: Record<string, DbDay> = {};

  if (timesheet) {
    const { data: days } = await supabase
      .from("timesheet_days")
      .select("*")
      .eq("timesheet_id", timesheet.id)
      .order("date", { ascending: true });

    for (const day of days ?? []) {
      existing[normalizeDateKey(day.date)] = day as DbDay;
    }
  }

  const dayRows = buildDayRows(year, month, existing, countSettings);

  const totalEffectiveHours = dayRows.reduce((s, d) => {
    const v = parseFloat(d.totalDayHours.replace(",", ".")) || 0;
    return s + v;
  }, 0);

  return {
    orgName: org.name,
    orgAddress: org.address ?? "",
    orgCity: org.city ?? "",
    orgJib: org.tax_id ?? "",
    employeeName: `${emp.last_name} ${emp.first_name}`,
    employeeJmbg: emp.jmbg ?? "",
    employeeOccupation: emp.occupation_name ?? "",
    year,
    month,
    monthName: MONTH_NAMES[month],
    monthPeriod: monthPeriodLabel(MONTH_NAMES[month], month, year),
    days: dayRows,
    totalEffectiveHours: Math.round(totalEffectiveHours * 10) / 10,
    totalOvertimeHours: 0,
    totalFieldHours: 0,
    totalStandbyHours: 0,
    workDaysCount: dayRows.filter((d) => d.dailyWorkHours !== "").length,
  };
}

export function sihtericaPdfFilename(
  lastName: string,
  firstName: string,
  year: number,
  month: number
): string {
  const slug = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

  return `sihterica-${slug(lastName)}-${slug(firstName)}-${year}-${String(month).padStart(2, "0")}.pdf`;
}

export function sihtericaBulkZipFilename(year: number, month: number): string {
  return `sihterice-${year}-${String(month).padStart(2, "0")}.zip`;
}

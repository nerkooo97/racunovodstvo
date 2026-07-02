"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/supabase/get-active-org";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { localDateKey } from "@/lib/utils";
import {
  calcOvertimeHours,
  calcTotalHours,
  type TimesheetCountSettings,
} from "@/lib/calculations/timesheet";

type DayEntry = {
  date: string;
  start_time: string | null;
  end_time: string | null;
  break_minutes: number;
  total_hours: number | null;
  field_work_hours: number | null;
  standby_hours: number | null;
  absence_code: string | null;
  other_code: string | null;
  note: string | null;
  is_day_off: boolean;
};

async function getOrEnsureTimesheet(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  employeeId: string,
  year: number,
  month: number
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("timesheets")
    .select("id")
    .eq("organization_id", orgId)
    .eq("employee_id", employeeId)
    .eq("year", year)
    .eq("month", month)
    .single();

  if (existing) return existing.id;

  const { data: created } = await supabase
    .from("timesheets")
    .insert({ organization_id: orgId, employee_id: employeeId, year, month })
    .select("id")
    .single();

  return created?.id ?? null;
}

export async function saveTimesheetDays(
  employeeId: string,
  year: number,
  month: number,
  days: DayEntry[]
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const activeOrgId = await getActiveOrgId(supabase, user.id);
  const org = activeOrgId ? { id: activeOrgId } : null;

  if (!org) return { error: "Organizacija nije pronađena." };

  const timesheetId = await getOrEnsureTimesheet(supabase, org.id, employeeId, year, month);
  if (!timesheetId) return { error: "Greška pri kreiranju šihterice." };

  const upsertData = days.map((d) => {
    const total =
      d.total_hours ??
      (d.start_time && d.end_time
        ? calcTotalHours(d.start_time, d.end_time, d.break_minutes ?? 30)
        : null);
    const overtime = d.is_day_off ? 0 : calcOvertimeHours(total);

    return {
      timesheet_id: timesheetId,
      date: d.date,
      start_time: d.start_time || null,
      end_time: d.end_time || null,
      break_minutes: d.break_minutes ?? 30,
      total_hours: total,
      overtime_hours: overtime,
      field_work_hours: d.field_work_hours ?? null,
      standby_hours: d.standby_hours ?? null,
      absence_code: d.absence_code || null,
      other_code: d.other_code || null,
      note: d.note || null,
      is_day_off: d.is_day_off,
      manual_override: true,
    };
  });

  // Delete + insert je pouzdaniji od upsert jer uvijek šaljemo sve dane
  await supabase.from("timesheet_days").delete().eq("timesheet_id", timesheetId);

  const { error } = await supabase.from("timesheet_days").insert(upsertData);

  if (error) return { error: error.message };

  revalidatePath("/sihterica");
  return {};
}

export async function bulkFillTimesheet(
  employeeId: string,
  year: number,
  month: number
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const activeOrgId = await getActiveOrgId(supabase, user.id);
  const org = activeOrgId ? { id: activeOrgId } : null;

  if (!org) return { error: "Organizacija nije pronađena." };

  // Dohvati podešavanja ili koristi defaults
  const { data: settings } = await supabase
    .from("timesheet_settings")
    .select("*")
    .eq("organization_id", org.id)
    .eq("user_id", user.id)
    .single();

  const defaultStart = settings?.default_start ?? "08:00";
  const defaultEnd = settings?.default_end ?? "16:00";
  const defaultBreak = settings?.default_break_minutes ?? 30;
  const daysOff = settings?.days_off ?? [6, 7];

  const timesheetId = await getOrEnsureTimesheet(supabase, org.id, employeeId, year, month);
  if (!timesheetId) return { error: "Greška pri kreiranju šihterice." };

  const daysInMonth = new Date(year, month, 0).getDate();
  const entries = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = localDateKey(year, month, day);
    const date = new Date(year, month - 1, day);
    const dow = date.getDay() || 7; // 1=Mon, 7=Sun
    const isDayOff = (daysOff as number[]).includes(dow);

    if (isDayOff) {
      entries.push({
        timesheet_id: timesheetId,
        date: dateKey,
        is_day_off: true,
        start_time: null,
        end_time: null,
        break_minutes: 0,
        total_hours: null,
        absence_code: null,
        note: null,
        manual_override: false,
      });
    } else {
      const [sh, sm] = defaultStart.split(":").map(Number);
      const [eh, em] = defaultEnd.split(":").map(Number);
      const totalMins = (eh * 60 + em) - (sh * 60 + sm) - defaultBreak;
      const totalHours = Math.round((totalMins / 60) * 100) / 100;

      entries.push({
        timesheet_id: timesheetId,
        date: dateKey,
        is_day_off: false,
        start_time: defaultStart,
        end_time: defaultEnd,
        break_minutes: defaultBreak,
        total_hours: totalHours,
        absence_code: null,
        note: null,
        manual_override: false,
      });
    }
  }

  await supabase.from("timesheet_days").delete().eq("timesheet_id", timesheetId);

  const { error } = await supabase.from("timesheet_days").insert(entries);

  if (error) return { error: error.message };

  revalidatePath("/sihterica");
  return {};
}

export async function saveTimesheetSettings(
  settings: TimesheetCountSettings & {
    defaultStart?: string;
    defaultEnd?: string;
    defaultBreakMinutes?: number;
    daysOff?: number[];
  }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const activeOrgId = await getActiveOrgId(supabase, user.id);
  const org = activeOrgId ? { id: activeOrgId } : null;

  if (!org) return { error: "Organizacija nije pronađena." };

  const { error } = await supabase.from("timesheet_settings").upsert(
    {
      user_id: user.id,
      organization_id: org.id,
      count_annual_leave: settings.countAnnualLeave,
      count_holiday: settings.countHoliday,
      count_sick_leave: settings.countSickLeave,
      ...(settings.defaultStart != null && { default_start: settings.defaultStart }),
      ...(settings.defaultEnd != null && { default_end: settings.defaultEnd }),
      ...(settings.defaultBreakMinutes != null && {
        default_break_minutes: settings.defaultBreakMinutes,
      }),
      ...(settings.daysOff != null && { days_off: settings.daysOff }),
    },
    { onConflict: "user_id,organization_id" }
  );

  if (error) return { error: error.message };

  revalidatePath("/sihterica");
  return {};
}

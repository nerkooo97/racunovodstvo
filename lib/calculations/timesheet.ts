/** Zakonski dnevni fond sati (FBiH) — osnova za prekovremeni rad. */
export const DAILY_FUND_HOURS = 8;

/** Sati za plaćeno odsustvo bez upisanog vremena. */
export const FULL_DAY_ABSENCE_HOURS = 8;

export const ABSENCE_CODES = [
  { code: "9.1", label: "Godišnji odmor" },
  { code: "9.2", label: "Državni praznik" },
  { code: "9.3", label: "Bolovanje" },
  { code: "9.4", label: "Porodiljsko / roditeljsko" },
  { code: "9.5", label: "Plaćeno odsustvo" },
  { code: "9.6", label: "Neplaćeno odsustvo" },
  { code: "9.7", label: "Neprisutnost po zahtjevu radnika" },
  { code: "9.8", label: "Neprisutnost krivicom radnika" },
  { code: "9.9", label: "Štrajk" },
  { code: "9.10", label: "Lockout" },
] as const;

export type AbsenceCode = (typeof ABSENCE_CODES)[number]["code"];

/** Plaćena odsustva koja ulaze u mjesečni fond (bez podešavanja). */
export const ALWAYS_PAID_ABSENCE: AbsenceCode[] = ["9.4", "9.5"];

/** Neplaćena odsustva — 0 sati ako nema ručnog vremena. */
export const UNPAID_ABSENCE: AbsenceCode[] = ["9.6", "9.7", "9.8", "9.9", "9.10"];

export type TimesheetCountSettings = {
  countAnnualLeave: boolean;
  countHoliday: boolean;
  countSickLeave: boolean;
};

export const DEFAULT_COUNT_SETTINGS: TimesheetCountSettings = {
  countAnnualLeave: true,
  countHoliday: true,
  countSickLeave: false,
};

export type TimesheetDayLike = {
  start_time: string | null;
  end_time: string | null;
  break_minutes: number;
  total_hours: number | null;
  absence_code: string | null;
  is_day_off: boolean;
};

export function calcTotalHours(
  start: string | null,
  end: string | null,
  breakMin: number
): number | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm) - breakMin;
  if (mins <= 0) return null;
  return Math.round((mins / 60) * 100) / 100;
}

export function calcOvertimeHours(totalHours: number | null, dailyFund = DAILY_FUND_HOURS): number {
  if (totalHours == null || totalHours <= dailyFund) return 0;
  return Math.round((totalHours - dailyFund) * 100) / 100;
}

function isPaidAbsenceCounted(code: string, settings: TimesheetCountSettings): boolean {
  if (ALWAYS_PAID_ABSENCE.includes(code as AbsenceCode)) return true;
  if (code === "9.1") return settings.countAnnualLeave;
  if (code === "9.2") return settings.countHoliday;
  if (code === "9.3") return settings.countSickLeave;
  return false;
}

/** Ukupni sati za jedan dan prema pravilima šihterice. */
export function effectiveHours(
  day: TimesheetDayLike,
  settings: TimesheetCountSettings = DEFAULT_COUNT_SETTINGS
): number {
  if (day.is_day_off) return 0;

  // Ručno upisana vremena uvijek pobjeđuju
  if (day.start_time && day.end_time) {
    return day.total_hours ?? calcTotalHours(day.start_time, day.end_time, day.break_minutes) ?? 0;
  }

  if (day.absence_code) {
    if (UNPAID_ABSENCE.includes(day.absence_code as AbsenceCode)) return 0;
    if (isPaidAbsenceCounted(day.absence_code, settings)) return FULL_DAY_ABSENCE_HOURS;
    return 0;
  }

  return 0;
}

export function regularAndOvertimeHours(
  day: TimesheetDayLike,
  settings: TimesheetCountSettings = DEFAULT_COUNT_SETTINGS
): { regular: number; overtime: number } {
  const total = effectiveHours(day, settings);
  if (total <= 0) return { regular: 0, overtime: 0 };
  const overtime = calcOvertimeHours(total);
  return { regular: Math.round((total - overtime) * 100) / 100, overtime };
}

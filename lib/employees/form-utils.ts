import { WORK_TIME_PRESETS } from "@/lib/constants/employee-codes";

export function detectWorkTimePreset(hours?: number | null, weekly?: number | null): string {
  const h = Number(hours ?? 8);
  const w = Number(weekly ?? 40);
  const match = WORK_TIME_PRESETS.find(
    (p) => p.value !== "custom" && p.hoursPerDay === h && p.weeklyHours === w
  );
  return match?.value ?? "custom";
}

/** Radnici uključeni u obračun plate, šihtericu i PDF izvještaje. */
export const PAYROLL_ELIGIBLE_STATUSES = ["active", "probation"] as const;

export function isPayrollEligible(status: string | null | undefined, insuranceStatus: string | null | undefined): boolean {
  return (
    insuranceStatus === "registered" &&
    PAYROLL_ELIGIBLE_STATUSES.includes((status ?? "") as (typeof PAYROLL_ELIGIBLE_STATUSES)[number])
  );
}

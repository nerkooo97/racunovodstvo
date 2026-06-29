"use client";

import { saveTimesheetDays, saveTimesheetSettings } from "@/app/actions/timesheets";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import FormSection from "@/components/shared/form-section";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ABSENCE_CODES,
  calcOvertimeHours,
  calcTotalHours,
  DEFAULT_COUNT_SETTINGS,
  effectiveHours,
  type TimesheetCountSettings,
} from "@/lib/calculations/timesheet";
import { ChevronLeft, ChevronRight, Download, FileArchive } from "lucide-react";
import { useState, useTransition } from "react";
import {
  daysInMonth,
  formatDateKey,
  localDateKey,
  localDayOfWeek,
  parseDateKey,
} from "@/lib/utils";

const DAY_NAMES = ["", "Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"];

const WEEKDAY_OPTIONS = [
  { dow: 1, label: "Pon" },
  { dow: 2, label: "Uto" },
  { dow: 3, label: "Sri" },
  { dow: 4, label: "Čet" },
  { dow: 5, label: "Pet" },
  { dow: 6, label: "Sub" },
  { dow: 7, label: "Ned" },
] as const;

const DEFAULT_WORK_WEEKDAYS = ["1", "2", "3", "4", "5"];

const MONTH_NAMES = [
  "", "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

const DAY_STATUS = [
  { value: "work", label: "Radni dan" },
  { value: "off", label: "Slobodan dan" },
  ...ABSENCE_CODES.map(({ code, label }) => ({ value: code, label })),
] as const;

type DayStatusValue = (typeof DAY_STATUS)[number]["value"];

interface DayData {
  date: string;
  dow: number;
  start_time: string;
  end_time: string;
  break_minutes: number;
  total_hours: number | null;
  field_work_hours: number | null;
  standby_hours: number | null;
  absence_code: string | null;
  other_code: string | null;
  note: string;
  is_day_off: boolean;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface Props {
  employees: Employee[];
  initialYear: number;
  initialMonth: number;
  existingDaysMap: Record<string, Record<string, unknown>>;
  initialSettings?: TimesheetCountSettings;
}

function getDayStatus(day: DayData): DayStatusValue {
  if (day.absence_code) return day.absence_code as DayStatusValue;
  if (day.is_day_off) return "off";
  return "work";
}

function isDateInRange(date: string, from: string, to: string): boolean {
  if (!from || !to) return false;
  return date >= from && date <= to;
}

function buildMonthDays(year: number, month: number, existing: Record<string, unknown>): DayData[] {
  const count = daysInMonth(year, month);
  const days: DayData[] = [];
  for (let d = 1; d <= count; d++) {
    const key = localDateKey(year, month, d);
    const dow = localDayOfWeek(year, month, d);
    const isDayOff = dow >= 6;
    const ex = existing[key] as Partial<DayData> | undefined;
    days.push(
      ex
        ? {
            date: key,
            dow,
            start_time: ex.start_time ?? (isDayOff ? "" : "08:00"),
            end_time: ex.end_time ?? (isDayOff ? "" : "16:00"),
            break_minutes: ex.break_minutes ?? (isDayOff ? 0 : 30),
            total_hours: ex.total_hours ?? (isDayOff ? null : 7.5),
            field_work_hours: ex.field_work_hours ?? null,
            standby_hours: ex.standby_hours ?? null,
            absence_code: ex.absence_code ?? null,
            other_code: ex.other_code ?? null,
            note: ex.note ?? "",
            is_day_off: ex.is_day_off ?? isDayOff,
          }
        : {
            date: key,
            dow,
            start_time: isDayOff ? "" : "08:00",
            end_time: isDayOff ? "" : "16:00",
            break_minutes: isDayOff ? 0 : 30,
            total_hours: isDayOff ? null : 7.5,
            field_work_hours: null,
            standby_hours: null,
            absence_code: null,
            other_code: null,
            note: "",
            is_day_off: isDayOff,
          }
    );
  }
  return days;
}

export default function TimesheetGrid({
  employees,
  initialYear,
  initialMonth,
  existingDaysMap,
  initialSettings = DEFAULT_COUNT_SETTINGS,
}: Props) {
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id ?? "");
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [workStart, setWorkStart] = useState("08:00");
  const [workEnd, setWorkEnd] = useState("16:00");
  const [workBreak, setWorkBreak] = useState("30");
  const [workWeekdays, setWorkWeekdays] = useState<string[]>(DEFAULT_WORK_WEEKDAYS);

  const [countSettings, setCountSettings] = useState<TimesheetCountSettings>(initialSettings);

  const [leaveFrom, setLeaveFrom] = useState("");
  const [leaveTo, setLeaveTo] = useState("");
  const [holidayFrom, setHolidayFrom] = useState("");
  const [holidayTo, setHolidayTo] = useState("");
  const [sickFrom, setSickFrom] = useState("");
  const [sickTo, setSickTo] = useState("");

  const existing = existingDaysMap[`${selectedEmpId}-${year}-${month}`] ?? {};
  const [days, setDays] = useState<DayData[]>(() => buildMonthDays(year, month, existing));

  function loadDays(empId: string, y: number, m: number) {
    setDays(buildMonthDays(y, m, existingDaysMap[`${empId}-${y}-${m}`] ?? {}));
  }

  function updateEmployee(empId: string) {
    setSelectedEmpId(empId);
    loadDays(empId, year, month);
    setSuccess(false);
  }

  function updatePeriod(y: number, m: number) {
    setYear(y);
    setMonth(m);
    loadDays(selectedEmpId, y, m);
    setSuccess(false);
  }

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    updatePeriod(y, m);
  }

  function applyWorkTemplate(day: DayData): DayData {
    const breakMin = parseInt(workBreak) || 30;
    const total = calcTotalHours(workStart, workEnd, breakMin);
    return {
      ...day,
      is_day_off: false,
      absence_code: null,
      start_time: workStart,
      end_time: workEnd,
      break_minutes: breakMin,
      total_hours: total,
    };
  }

  function absenceForDate(date: string): string | null {
    if (isDateInRange(date, leaveFrom, leaveTo)) return "9.1";
    if (isDateInRange(date, holidayFrom, holidayTo)) return "9.2";
    if (isDateInRange(date, sickFrom, sickTo)) return "9.3";
    return null;
  }

  function applyMonthPattern() {
    const selected = new Set(workWeekdays.map(Number));
    if (selected.size === 0) return;

    const breakMin = parseInt(workBreak) || 30;
    const total = calcTotalHours(workStart, workEnd, breakMin);

    setDays((prev) =>
      prev.map((day) => {
        const absence = absenceForDate(day.date);

        if (absence) {
          return {
            ...day,
            is_day_off: false,
            absence_code: absence,
            start_time: "",
            end_time: "",
            break_minutes: 0,
            total_hours: null,
          };
        }

        if (selected.has(day.dow)) {
          return {
            ...day,
            is_day_off: false,
            absence_code: null,
            start_time: workStart,
            end_time: workEnd,
            break_minutes: breakMin,
            total_hours: total,
          };
        }

        return {
          ...day,
          is_day_off: true,
          absence_code: null,
          start_time: "",
          end_time: "",
          break_minutes: 0,
          total_hours: null,
        };
      })
    );
    setSuccess(false);
  }

  function setDayStatus(idx: number, status: DayStatusValue) {
    setDays((prev) => {
      const next = [...prev];
      const day = { ...next[idx] };

      if (status === "off") {
        day.is_day_off = true;
        day.absence_code = null;
        day.start_time = "";
        day.end_time = "";
        day.break_minutes = 0;
        day.total_hours = null;
      } else if (status === "work") {
        Object.assign(day, applyWorkTemplate(day));
      } else {
        day.is_day_off = false;
        day.absence_code = status;
        day.start_time = "";
        day.end_time = "";
        day.break_minutes = 0;
        day.total_hours = null;
      }

      next[idx] = day;
      return next;
    });
    setSuccess(false);
  }

  function updateDay<K extends keyof DayData>(idx: number, field: K, value: DayData[K]) {
    setDays((prev) => {
      const next = [...prev];
      const day = { ...next[idx], [field]: value };

      if (field === "start_time" || field === "end_time" || field === "break_minutes") {
        day.total_hours = calcTotalHours(day.start_time, day.end_time, day.break_minutes);
        if (day.start_time && day.end_time) {
          day.is_day_off = false;
        }
      }

      next[idx] = day;
      return next;
    });
    setSuccess(false);
  }

  function handleSave() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const settingsResult = await saveTimesheetSettings({
        ...countSettings,
        defaultStart: workStart,
        defaultEnd: workEnd,
        defaultBreakMinutes: parseInt(workBreak) || 30,
        daysOff: [1, 2, 3, 4, 5, 6, 7].filter((d) => !workWeekdays.includes(String(d))),
      });
      if (settingsResult.error) {
        setError(settingsResult.error);
        return;
      }

      const result = await saveTimesheetDays(
        selectedEmpId,
        year,
        month,
        days
          .filter((d) => {
            const { year: y, month: m } = parseDateKey(d.date);
            return y === year && m === month;
          })
          .map((d) => ({
            date: d.date,
            start_time: d.start_time || null,
            end_time: d.end_time || null,
            break_minutes: d.break_minutes,
            total_hours: d.total_hours,
            field_work_hours: d.field_work_hours,
            standby_hours: d.standby_hours,
            absence_code: d.absence_code,
            other_code: d.other_code,
            note: d.note || null,
            is_day_off: d.is_day_off,
          }))
      );
      if (result.error) setError(result.error);
      else setSuccess(true);
    });
  }

  const totalHours = days.reduce(
    (s, d) => s + effectiveHours(d, countSettings),
    0
  );
  const totalOvertime = days.reduce((s, d) => {
    const hrs = effectiveHours(d, countSettings);
    return s + (d.is_day_off ? 0 : calcOvertimeHours(hrs));
  }, 0);
  const workDays = days.filter((d) => getDayStatus(d) === "work").length;

  const pdfUrl = `/api/pdf/sihterica?employeeId=${encodeURIComponent(selectedEmpId)}&year=${year}&month=${month}`;
  const bulkZipUrl = `/api/pdf/sihterica/bulk?year=${year}&month=${month}`;

  return (
    <div className="flex flex-col gap-8 pb-8">
      <FormSection title="Period i radnik">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-2 min-w-[200px]">
            <span className="text-sm font-medium">Radnik</span>
            <Select value={selectedEmpId} onValueChange={updateEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Odaberi radnika" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.last_name} {e.first_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <span className="text-sm font-medium">Mjesec</span>
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="icon" onClick={() => shiftMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[140px] text-center text-sm font-medium px-2">
                {MONTH_NAMES[month]} {year}.
              </div>
              <Button type="button" variant="outline" size="icon" onClick={() => shiftMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-4 text-sm">
            <span>
              <span className="text-muted-foreground">Radnih dana:</span>{" "}
              <strong>{workDays}</strong>
            </span>
            <span>
              <span className="text-muted-foreground">Ukupno sati:</span>{" "}
              <strong className="font-mono">{totalHours.toFixed(1)}</strong>
            </span>
            <span>
              <span className="text-muted-foreground">Prekovremeno:</span>{" "}
              <strong className="font-mono">{totalOvertime.toFixed(1)}</strong>
            </span>
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Auto-popuna"
        description="Radni dani u sedmici, radno vrijeme, odsustva za period i način računanja plaćenih odsustava."
      >
        <div className="flex flex-col gap-6">
          <div className="grid gap-2">
            <span className="text-sm font-medium">Radni dani u sedmici</span>
            <ToggleGroup
              type="multiple"
              variant="outline"
              spacing={0}
              value={workWeekdays}
              onValueChange={setWorkWeekdays}
              className="flex-wrap"
            >
              {WEEKDAY_OPTIONS.map(({ dow, label }) => (
                <ToggleGroupItem key={dow} value={String(dow)} aria-label={label}>
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-2">
              <span className="text-sm">Početak</span>
              <Input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} className="w-32" />
            </div>
            <div className="grid gap-2">
              <span className="text-sm">Kraj</span>
              <Input type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} className="w-32" />
            </div>
            <div className="grid gap-2">
              <span className="text-sm">Pauza (min)</span>
              <Input
                type="number"
                value={workBreak}
                onChange={(e) => setWorkBreak(e.target.value)}
                className="w-20"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-2">
              <span className="text-sm font-medium">Godišnji odmor</span>
              <div className="flex gap-2">
                <Input type="date" value={leaveFrom} onChange={(e) => setLeaveFrom(e.target.value)} className="text-xs" />
                <Input type="date" value={leaveTo} onChange={(e) => setLeaveTo(e.target.value)} className="text-xs" />
              </div>
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Državni praznici</span>
              <div className="flex gap-2">
                <Input type="date" value={holidayFrom} onChange={(e) => setHolidayFrom(e.target.value)} className="text-xs" />
                <Input type="date" value={holidayTo} onChange={(e) => setHolidayTo(e.target.value)} className="text-xs" />
              </div>
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Bolovanje</span>
              <div className="flex gap-2">
                <Input type="date" value={sickFrom} onChange={(e) => setSickFrom(e.target.value)} className="text-xs" />
                <Input type="date" value={sickTo} onChange={(e) => setSickTo(e.target.value)} className="text-xs" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium">Plaćena odsustva u mjesečnom fondu</span>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={countSettings.countAnnualLeave}
                  onCheckedChange={(v) =>
                    setCountSettings((s) => ({ ...s, countAnnualLeave: v === true }))
                  }
                />
                Godišnji (9.1) kao pun dan
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={countSettings.countHoliday}
                  onCheckedChange={(v) =>
                    setCountSettings((s) => ({ ...s, countHoliday: v === true }))
                  }
                />
                Praznici (9.2) kao pun dan
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={countSettings.countSickLeave}
                  onCheckedChange={(v) =>
                    setCountSettings((s) => ({ ...s, countSickLeave: v === true }))
                  }
                />
                Bolovanje (9.3) kao pun dan
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Porodiljsko (9.4) i plaćeno odsustvo (9.5) uvijek ulaze u fond. Ručno upisana vremena uvijek pobjeđuju nad šifrom odsustva.
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={applyMonthPattern}
            disabled={workWeekdays.length === 0}
            className="w-fit"
          >
            Primijeni na cijeli mjesec
          </Button>
        </div>
      </FormSection>

      <FormSection title="Dnevni unos">
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-2 py-2 text-left font-medium w-24">Datum</th>
                <th className="px-2 py-2 text-left font-medium w-10">Dan</th>
                <th className="px-2 py-2 text-left font-medium min-w-[150px]">Status</th>
                <th className="px-2 py-2 text-left font-medium w-24">Od</th>
                <th className="px-2 py-2 text-left font-medium w-24">Do</th>
                <th className="px-2 py-2 text-right font-medium w-14">Pauza</th>
                <th className="px-2 py-2 text-right font-medium w-14">Sati</th>
                <th className="px-2 py-2 text-right font-medium w-14">Prek.</th>
                <th className="px-2 py-2 text-right font-medium w-14">Teren</th>
                <th className="px-2 py-2 text-right font-medium w-14">Prip.</th>
                <th className="px-2 py-2 text-left font-medium">Napomena</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day, idx) => {
                const status = getDayStatus(day);
                const hours = effectiveHours(day, countSettings);
                const overtime = day.is_day_off ? 0 : calcOvertimeHours(hours);
                const isWeekend = day.dow >= 6;

                return (
                  <tr
                    key={day.date}
                    className={`border-b last:border-0 ${isWeekend || status === "off" ? "bg-muted/30" : ""}`}
                  >
                    <td className="px-2 py-1.5 font-mono text-xs">
                      {formatDateKey(day.date)}
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">{DAY_NAMES[day.dow]}</td>
                    <td className="px-2 py-1.5">
                      <Select value={status} onValueChange={(v) => setDayStatus(idx, v as DayStatusValue)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAY_STATUS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="time"
                        value={day.start_time}
                        onChange={(e) => updateDay(idx, "start_time", e.target.value)}
                        className="h-8"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="time"
                        value={day.end_time}
                        onChange={(e) => updateDay(idx, "end_time", e.target.value)}
                        className="h-8"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        min={0}
                        value={day.break_minutes}
                        onChange={(e) => updateDay(idx, "break_minutes", parseInt(e.target.value) || 0)}
                        className="h-8 text-right"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-xs">
                      {hours > 0 ? hours.toFixed(1) : "—"}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-xs text-muted-foreground">
                      {overtime > 0 ? overtime.toFixed(1) : "—"}
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        value={day.field_work_hours ?? ""}
                        onChange={(e) =>
                          updateDay(
                            idx,
                            "field_work_hours",
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                        className="h-8 text-right"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        value={day.standby_hours ?? ""}
                        onChange={(e) =>
                          updateDay(
                            idx,
                            "standby_hours",
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                        className="h-8 text-right"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        value={day.note}
                        onChange={(e) => updateDay(idx, "note", e.target.value)}
                        className="h-8"
                        placeholder="Opcionalno"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </FormSection>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">Šihterica uspješno sačuvana.</p>}

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Čuvanje..." : "Sačuvaj šihtericu"}
        </Button>
        <Button asChild variant="outline">
          <a href={pdfUrl} download className="inline-flex items-center gap-2">
            <Download className="h-4 w-4" />
            Preuzmi PDF
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href={bulkZipUrl} download className="inline-flex items-center gap-2">
            <FileArchive className="h-4 w-4" />
            Preuzmi ZIP (svi radnici)
          </a>
        </Button>
      </div>
    </div>
  );
}

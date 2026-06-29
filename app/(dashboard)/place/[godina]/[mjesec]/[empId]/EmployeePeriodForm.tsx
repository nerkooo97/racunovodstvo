"use client";

import { useState, useMemo, useTransition } from "react";
import { calculateEmployee, calculateActiveDaysInMonth } from "@/lib/calculations/salary";
import { saveEmployeePeriodItem } from "@/app/actions/salary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatKM } from "@/lib/utils";
import FormSection from "@/components/shared/form-section";

const MONTH_NAMES = [
  "", "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

interface EmployeeBase {
  gross_salary: number;
  net_salary: number | null;
  salary_type: "target_net" | "net_contract" | "gross_base";
  tax_coefficient: number;
  hire_date?: string | null;
  termination_date?: string | null;
  meal_allowance_per_day?: number;
}

interface ExistingItem {
  hours_worked: number | null;
  hours_overtime: number;
  hours_night: number;
  hours_sunday: number;
  hours_holiday: number;
  hours_sick_leave: number;
  hours_annual_leave: number;
  meal_allowance: number;
  holiday_allowance: number;
  transport_allowance: number;
  other_allowances: number;
}

interface Props {
  employeeId: string;
  year: number;
  month: number;
  orgType: "obrt" | "doo";
  employee: EmployeeBase;
  existing: ExistingItem | null;
  hoursFromTimesheet: number | null;
}

function n(v: string): number {
  const x = parseFloat(v.replace(",", "."));
  return isNaN(x) ? 0 : x;
}

function Row({ label, pct, value, bold, muted, highlight }: {
  label: string; pct?: string; value: string; bold?: boolean; muted?: boolean; highlight?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-1 font-mono text-sm ${muted ? "text-muted-foreground" : ""} ${bold ? "font-semibold" : ""} ${highlight ? "text-emerald-600 dark:text-emerald-400 font-bold" : ""}`}>
      <span className="font-sans flex items-center gap-1.5">
        {label}
        {pct && <span className="text-xs text-muted-foreground">({pct})</span>}
      </span>
      <span>{value}</span>
    </div>
  );
}

export default function EmployeePeriodForm({
  employeeId, year, month, orgType, employee, existing, hoursFromTimesheet,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { activeDays, totalDays } = useMemo(() => {
    return calculateActiveDaysInMonth(year, month, employee.hire_date, employee.termination_date);
  }, [year, month, employee.hire_date, employee.termination_date]);

  const isPartialMonth = activeDays > 0 && activeDays < totalDays;
  const partialPct = Math.round((activeDays / totalDays) * 100);

  const [usePartialProRating, setUsePartialProRating] = useState(isPartialMonth);

  const defaultHours = Math.round(176 * (usePartialProRating ? activeDays / totalDays : 1));
  const [hoursWorked, setHoursWorked] = useState(String(existing?.hours_worked ?? hoursFromTimesheet ?? defaultHours));
  const [hoursOT, setHoursOT]         = useState(String(existing?.hours_overtime ?? 0));
  const [hoursNight, setHoursNight]   = useState(String(existing?.hours_night ?? 0));
  const [hoursSunday, setHoursSunday] = useState(String(existing?.hours_sunday ?? 0));
  const [hoursHoliday, setHoursHoliday] = useState(String(existing?.hours_holiday ?? 0));
  const [hoursSick, setHoursSick]     = useState(String(existing?.hours_sick_leave ?? 0));
  const [hoursAnnual, setHoursAnnual] = useState(String(existing?.hours_annual_leave ?? 0));

  const dailyRate = employee.meal_allowance_per_day ?? 16.0;
  const defaultMeal = isPartialMonth ? activeDays * dailyRate : 22 * dailyRate;
  const [mealAllowance, setMealAllowance]           = useState(String(existing?.meal_allowance ?? defaultMeal));
  const [holidayAllowance, setHolidayAllowance]     = useState(String(existing?.holiday_allowance ?? 0));
  const [transportAllowance, setTransportAllowance] = useState(String(existing?.transport_allowance ?? 0));
  const [otherAllowances, setOtherAllowances]       = useState(String(existing?.other_allowances ?? 0));

  const calc = useMemo(() => {
    return calculateEmployee(
      employee.salary_type,
      employee.gross_salary,
      employee.net_salary,
      employee.tax_coefficient,
      orgType,
      usePartialProRating ? activeDays : undefined,
      usePartialProRating ? totalDays : undefined
    );
  }, [employee, orgType, usePartialProRating, activeDays, totalDays]);

  const extras = n(mealAllowance) + n(holidayAllowance) + n(transportAllowance) + n(otherAllowances);
  const totalNetoPayout = calc ? calc.net_salary + extras : 0;
  const totalEmployerCostFinal = calc ? calc.total_employer_cost + extras : 0;

  const MINIMAL_GROSS_FBIH = 1605.48;
  const isBelowMinGross = calc ? calc.gross_salary < MINIMAL_GROSS_FBIH : false;

  function handleSave() {
    setError(null); setSuccess(false);
    startTransition(async () => {
      const res = await saveEmployeePeriodItem(employeeId, year, month, {
        hours_worked:        n(hoursWorked) || null,
        hours_overtime:      n(hoursOT),
        hours_night:         n(hoursNight),
        hours_sunday:        n(hoursSunday),
        hours_holiday:       n(hoursHoliday),
        hours_sick_leave:    n(hoursSick),
        hours_annual_leave:  n(hoursAnnual),
        meal_allowance:      n(mealAllowance),
        holiday_allowance:   n(holidayAllowance),
        transport_allowance: n(transportAllowance),
        other_allowances:    n(otherAllowances),
      });
      if (res.error) setError(res.error);
      else setSuccess(true);
    });
  }

  const contribOnPctLabel = orgType === "doo" ? "10,5%" : "5%";
  const contribOnSum = calc
    ? calc.pension_contribution_on + calc.health_contribution_on + calc.unemployment_contribution_on
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
      {/* Kolona za podešavanje (Forme) */}
      <div className="lg:col-span-2 space-y-6">

        <FormSection title="Osnovica, koeficijent i ugovoreni parametri">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Bruto osnovica (KM)</Label>
              <div className="font-mono font-bold text-base mt-1">{formatKM(employee.gross_salary)}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Neto po ugovoru (KM)</Label>
              <div className="font-mono font-bold text-base mt-1">{formatKM(employee.net_salary ?? 0)}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Porezni koeficijent</Label>
              <div className="font-mono font-bold text-base mt-1">{employee.tax_coefficient.toFixed(1)} ({employee.tax_coefficient * 300} KM)</div>
            </div>
          </div>

          {/* Djelimičan mjesec checkbox */}
          {isPartialMonth && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
              <label className="flex items-center gap-2 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={usePartialProRating}
                  onChange={(e) => setUsePartialProRating(e.target.checked)}
                  className="rounded border-amber-500 text-amber-600 focus:ring-amber-500 h-4 w-4"
                />
                <span>Razmjerno za djelimičan mjesec ({partialPct}% radnih dana · {activeDays}/{totalDays} dana)</span>
              </label>
              <p className="text-muted-foreground pl-6">
                Osnovica i doprinosi se skaliraju faktorom radnih dana. Isključi ako želiš puni ugovoreni iznos.
              </p>
            </div>
          )}

          {/* Minimalna osnovica upozorenje */}
          {isBelowMinGross && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200">
              <p className="font-semibold mb-0.5">⚠️ Bruto je ispod zakonske minimalne osnovice za doprinose ({formatKM(MINIMAL_GROSS_FBIH)})</p>
              <p className="text-muted-foreground">Obračun se izvršava na unesenu bruto platu prema zakonskim odobrenjima.</p>
            </div>
          )}
        </FormSection>

        <FormSection
          title="Radni sati"
          description={
            hoursFromTimesheet !== null
              ? `Šihterica: ${hoursFromTimesheet.toFixed(1)}h`
              : undefined
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Odrađeni sati</Label>
              <Input
                type="number"
                value={hoursWorked}
                onChange={(e) => setHoursWorked(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">Bolovanje (h)</Label>
              <Input
                type="number"
                value={hoursSick}
                onChange={(e) => setHoursSick(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">Godišnji odmor (h)</Label>
              <Input
                type="number"
                value={hoursAnnual}
                onChange={(e) => setHoursAnnual(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
          </div>

          <div className="pt-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Uvećanja sati</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Prekovremeni (h)</Label>
                <Input type="number" value={hoursOT} onChange={(e) => setHoursOT(e.target.value)} className="mt-1 font-mono text-sm" />
              </div>
              <div>
                <Label className="text-xs">Noćni rad (h)</Label>
                <Input type="number" value={hoursNight} onChange={(e) => setHoursNight(e.target.value)} className="mt-1 font-mono text-sm" />
              </div>
              <div>
                <Label className="text-xs">Nedjelja (h)</Label>
                <Input type="number" value={hoursSunday} onChange={(e) => setHoursSunday(e.target.value)} className="mt-1 font-mono text-sm" />
              </div>
              <div>
                <Label className="text-xs">Praznici (h)</Label>
                <Input type="number" value={hoursHoliday} onChange={(e) => setHoursHoliday(e.target.value)} className="mt-1 font-mono text-sm" />
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection title="Neoporezivi dodaci (KM)">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Topli obrok (KM)</Label>
              <Input
                type="number"
                value={mealAllowance}
                onChange={(e) => setMealAllowance(e.target.value)}
                className="mt-1 font-mono"
              />
              <p className="text-[11px] text-muted-foreground mt-1">{dailyRate.toFixed(2).replace('.', ',')} KM × {isPartialMonth ? activeDays : 22} dana = {formatKM((isPartialMonth ? activeDays : 22) * dailyRate)}</p>
            </div>
            <div>
              <Label className="text-xs">Putni trošak (KM)</Label>
              <Input
                type="number"
                value={transportAllowance}
                onChange={(e) => setTransportAllowance(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">Regres (KM)</Label>
              <Input
                type="number"
                value={holidayAllowance}
                onChange={(e) => setHolidayAllowance(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">Ostalo / Korist u naravi (KM)</Label>
              <Input
                type="number"
                value={otherAllowances}
                onChange={(e) => setOtherAllowances(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
          </div>
        </FormSection>

        {error   && <p className="text-sm font-medium text-destructive">{error}</p>}
        {success && <p className="text-sm font-medium text-emerald-600">Obračun je uspješno sačuvan.</p>}

        <Button onClick={handleSave} disabled={isPending} size="lg" className="w-full sm:w-auto">
          {isPending ? "Čuvanje..." : "Sačuvaj obračun"}
        </Button>
      </div>

      <div className="lg:col-span-1">
        <FormSection
          title="Preliminarni izračun"
          description={`${MONTH_NAMES[month]} ${year}.`}
          className="sticky top-6"
        >
          {calc ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <Row label="Bruto" value={formatKM(calc.gross_salary)} bold />
                <Row label="Doprinosi iz plate" pct="31%" value={`− ${formatKM(calc.total_contributions_from)}`} muted />
                <Row label="Poreska osnovica" value={formatKM(calc.tax_base)} muted />
                <Row label="Porez na dohodak" pct="10%" value={`− ${formatKM(calc.income_tax)}`} muted />
                <Row label="Neto plata" value={formatKM(calc.net_salary)} bold />
              </div>

              {extras > 0 && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <Row label="Neoporezivi dodaci" value={`+ ${formatKM(extras)}`} muted />
                  <Row label="Neto za isplatu" value={formatKM(totalNetoPayout)} highlight />
                </div>
              )}

              <div className="p-3 rounded-lg bg-muted/30 space-y-1 text-xs">
                <p className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider mb-1">Doprinosi na platu (poslodavac)</p>
                <Row label="Doprinosi na platu" pct={contribOnPctLabel} value={formatKM(contribOnSum)} muted />
                <Row label="Vodna + nesreće" pct={calc.disability_fund > 0 ? "1.5%" : "1%"} value={formatKM(calc.water_contribution + calc.disaster_contribution + calc.disability_fund)} muted />
              </div>

              <div className="pt-2 border-t flex items-center justify-between">
                <span className="font-bold text-sm">Ukupan trošak poslodavca</span>
                <span className="font-bold text-base font-mono text-primary">{formatKM(totalEmployerCostFinal)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Unesite ugovorenu platu za radnika u profilu.</p>
          )}
        </FormSection>
      </div>
    </div>
  );
}

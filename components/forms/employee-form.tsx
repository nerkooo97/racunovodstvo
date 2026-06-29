"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { createEmployee, updateEmployee } from "@/app/actions/employees";
import { searchCities, type City } from "@/lib/constants/cities";
import {
  applyBrckoDistrict,
  clearResidenceLocation,
  RESIDENCE_ENTITY_HELP,
  searchRsMunicipalities,
  type RsMunicipality,
} from "@/lib/constants/residence-locations";
import {
  EDUCATION_LEVELS,
  INSURANCE_BASIS_CODES,
  PAYMENT_BASIS_CODES,
  SALARY_TYPES,
  CONTRACT_TYPES,
  EMPLOYEE_ROLES,
  RESIDENCE_ENTITIES,
  PROBATION_MONTH_OPTIONS,
  WORK_TIME_PRESETS,
} from "@/lib/constants/employee-codes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FormSection from "@/components/shared/form-section";
import { Save, Loader2 } from "lucide-react";
import { detectWorkTimePreset } from "@/lib/employees/form-utils";
import { cn } from "@/lib/utils";

const schema = z.object({
  first_name: z.string().min(1, "Ime je obavezno"),
  last_name: z.string().min(1, "Prezime je obavezno"),
  maiden_name: z.string().optional(),
  jmbg: z
    .string()
    .length(13, "JMBG mora imati tačno 13 cifara")
    .regex(/^\d+$/, "JMBG smije sadržavati samo cifre"),
  date_of_birth: z.string().optional(),
  gender: z.enum(["M", "F"]).optional(),
  email: z.union([z.string().email("Nevažeća email adresa"), z.literal("")]).optional(),
  employee_role: z.enum(["radnik", "vlasnik", "poslovodja", "sezonski"]),
  id_card_number: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  municipality: z.string().optional(),
  municipality_code: z.string().optional(),
  canton: z.string().optional(),
  residence_entity: z.enum(["FBiH", "RS", "BD"]),
  insurance_registration_date: z.string().optional(),
  insurance_deregistration_date: z.string().optional(),
  education_level: z.string().optional(),
  occupation_name: z.string().optional(),
  occupation_code: z
    .string()
    .regex(/^\d{7}$/, "Šifra zanimanja mora imati 7 cifara")
    .optional()
    .or(z.literal("")),
  insurance_basis_name: z.string().optional(),
  insurance_basis_code: z.string().optional(),
  payment_basis_name: z.string().optional(),
  payment_basis_code: z.string().optional(),
  job_title: z.string().optional(),
  job_position_code: z.string().optional(),
  work_time_preset: z.string().optional(),
  work_hours_per_day: z.string().optional(),
  work_minutes_per_day: z.string().optional(),
  weekly_hours: z.string().optional(),
  gross_salary: z.string().optional(),
  net_salary: z.string().optional(),
  salary_type: z.enum(["target_net", "net_contract", "gross_base"]),
  tax_coefficient: z.string().optional(),
  meal_allowance_per_day: z.string().optional(),
  first_employment_date: z.string().optional(),
  prior_experience_years: z.string().optional(),
  prior_experience_months: z.string().optional(),
  bank_account: z.string().optional(),
  bank_name: z.string().optional(),
  hire_date: z.string().min(1, "Datum zaposlenja je obavezan"),
  contract_type: z.enum(["indefinite", "fixed"]),
  contract_number: z.string().optional(),
  contract_end_date: z.string().optional(),
  probation: z.boolean(),
  probation_months: z.string().optional(),
  probation_end_date: z.string().optional(),
  notice_period: z.string().optional(),
  is_owner: z.boolean(),
  send_payslip_email: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function FormGrid({
  children,
  cols = 2,
  className,
}: {
  children: React.ReactNode;
  cols?: 2 | 3;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-3",
        cols === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2",
        className
      )}
    >
      {children}
    </div>
  );
}

function FormField({
  label,
  htmlFor,
  children,
  error,
  hint,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  error?: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground font-normal">
        {label}
      </Label>
      {children}
      {error}
      {hint && <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>}
    </div>
  );
}

function FormSubheading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground col-span-full pt-2 first:pt-0">
      {children}
    </p>
  );
}

function LocationMeta({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 col-span-full">
      {items.map((item) => (
        <div
          key={item.label}
          className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-xs"
        >
          <span className="text-muted-foreground">{item.label}</span>
          <span className="font-medium">{item.value || "—"}</span>
        </div>
      ))}
    </div>
  );
}

const inputClass = "h-9 text-sm";
const selectTriggerClass = "h-9 text-sm";

interface Props {
  employeeId?: string;
  initialValues?: Partial<FormValues>;
  defaultMealAllowance?: number;
}

export default function EmployeeForm({ employeeId, initialValues, defaultMealAllowance = 16 }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [citySearch, setCitySearch] = useState(initialValues?.city ?? "");
  const [citySuggestions, setCitySuggestions] = useState<City[]>([]);
  const [rsSuggestions, setRsSuggestions] = useState<RsMunicipality[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  const mealDefault = String(defaultMealAllowance);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employee_role: "radnik",
      residence_entity: "FBiH",
      salary_type: "net_contract",
      contract_type: "indefinite",
      work_time_preset: detectWorkTimePreset(
        initialValues?.work_hours_per_day ? Number(initialValues.work_hours_per_day) : undefined,
        initialValues?.weekly_hours ? Number(initialValues.weekly_hours) : undefined
      ),
      work_hours_per_day: "8",
      work_minutes_per_day: "0",
      weekly_hours: "40",
      tax_coefficient: "1.00",
      prior_experience_years: "0",
      prior_experience_months: "0",
      probation_months: "0",
      notice_period: "30 dana",
      probation: false,
      is_owner: false,
      send_payslip_email: false,
      ...initialValues,
      meal_allowance_per_day: initialValues?.meal_allowance_per_day ?? mealDefault,
    },
  });

  const salaryType = watch("salary_type");
  const contractType = watch("contract_type");
  const probationMonths = watch("probation_months");
  const genderValue = watch("gender");
  const educationValue = watch("education_level");
  const insuranceBasisValue = watch("insurance_basis_code");
  const paymentBasisValue = watch("payment_basis_code");
  const roleValue = watch("employee_role");
  const residenceValue = watch("residence_entity");
  const workTimePreset = watch("work_time_preset");
  const cantonValue = watch("canton");
  const municipalityValue = watch("municipality");
  const municipalityCodeValue = watch("municipality_code");

  const locationSetters = {
    setCity: (v: string) => setValue("city", v),
    setMunicipality: (v: string) => setValue("municipality", v),
    setMunicipalityCode: (v: string) => setValue("municipality_code", v),
    setCanton: (v: string) => setValue("canton", v),
    setCitySearch,
  };

  function handleResidenceEntityChange(entity: FormValues["residence_entity"]) {
    setValue("residence_entity", entity);
    setCitySuggestions([]);
    setRsSuggestions([]);
    setShowLocationSuggestions(false);

    if (entity === "BD") {
      applyBrckoDistrict(locationSetters);
      return;
    }

    clearResidenceLocation(locationSetters);
  }

  function handleLocationSearch(value: string) {
    setCitySearch(value);
    setValue("city", value);
    setShowLocationSuggestions(true);

    if (residenceValue === "FBiH") {
      setCitySuggestions(searchCities(value));
      setRsSuggestions([]);
      setValue("municipality", "");
      setValue("municipality_code", "");
      setValue("canton", "");
    } else if (residenceValue === "RS") {
      setRsSuggestions(searchRsMunicipalities(value));
      setCitySuggestions([]);
      setValue("municipality", "");
      setValue("municipality_code", "");
      setValue("canton", "");
    }
  }

  function selectFbihCity(city: City) {
    setValue("city", city.name);
    setValue("municipality", city.municipality);
    setValue("municipality_code", city.municipalityCode);
    setValue("canton", city.canton);
    setCitySearch(city.name);
    setCitySuggestions([]);
    setShowLocationSuggestions(false);
  }

  function selectRsMunicipality(municipality: RsMunicipality) {
    setValue("city", municipality.name);
    setValue("municipality", municipality.name);
    setValue("municipality_code", municipality.code);
    setValue("canton", "");
    setCitySearch(municipality.name);
    setRsSuggestions([]);
    setShowLocationSuggestions(false);
  }

  useEffect(() => {
    if (residenceValue === "BD" && !municipalityCodeValue) {
      applyBrckoDistrict(locationSetters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectInsuranceBasis(code: string) {
    const found = INSURANCE_BASIS_CODES.find((b) => b.code === code);
    if (found) {
      setValue("insurance_basis_code", found.code);
      setValue("insurance_basis_name", found.name);
    }
  }

  function selectPaymentBasis(code: string) {
    const found = PAYMENT_BASIS_CODES.find((b) => b.code === code);
    if (found) {
      setValue("payment_basis_code", found.code);
      setValue("payment_basis_name", found.name);
    }
  }

  function applyWorkTimePreset(preset: string) {
    setValue("work_time_preset", preset);
    const found = WORK_TIME_PRESETS.find((p) => p.value === preset);
    if (found && preset !== "custom") {
      setValue("work_hours_per_day", String(found.hoursPerDay));
      setValue("work_minutes_per_day", String(found.minutesPerDay));
      setValue("weekly_hours", String(found.weeklyHours));
    }
  }

  function onSubmit(data: FormValues) {
    setServerError(null);
    const months = Number(data.probation_months ?? 0);
    const fd = new FormData();
    (Object.entries({
      ...data,
      probation: months > 0 || data.probation,
    }) as [string, unknown][]).forEach(([k, v]) => {
      if (v !== null && v !== undefined) fd.append(k, String(v));
    });

    startTransition(async () => {
      const result = employeeId
        ? await updateEmployee(employeeId, fd)
        : await createEmployee(fd);
      if ("error" in result) {
        setServerError(result.error);
      } else {
        router.push("/radnici");
      }
    });
  }

  const fieldError = (name: keyof FormValues) =>
    errors[name]?.message ? (
      <p className="text-xs text-destructive mt-1">{errors[name]!.message as string}</p>
    ) : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8 w-full pb-4">
      <FormSection title="Osnovni podaci">
        <FormGrid>
          <FormField label="Ime *" htmlFor="first_name" error={fieldError("first_name")}>
            <Input id="first_name" className={inputClass} placeholder="Marko" {...register("first_name")} />
          </FormField>
          <FormField label="Prezime *" htmlFor="last_name" error={fieldError("last_name")}>
            <Input id="last_name" className={inputClass} placeholder="Marković" {...register("last_name")} />
          </FormField>
          <FormField label="Djevojačko prezime" htmlFor="maiden_name">
            <Input id="maiden_name" className={inputClass} {...register("maiden_name")} />
          </FormField>
          <FormField label="JMBG *" htmlFor="jmbg" error={fieldError("jmbg")}>
            <Input id="jmbg" className={inputClass} placeholder="0101990123456" maxLength={13} {...register("jmbg")} />
          </FormField>
          <FormField label="Broj lične karte" htmlFor="id_card_number">
            <Input id="id_card_number" className={inputClass} placeholder="B1234567" {...register("id_card_number")} />
          </FormField>
          <FormField label="Datum rođenja" htmlFor="date_of_birth">
            <Input id="date_of_birth" className={inputClass} type="date" {...register("date_of_birth")} />
          </FormField>
          <FormField label="Spol">
            <Select value={genderValue ?? ""} onValueChange={(v) => setValue("gender", v as "M" | "F")}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="Odaberi..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Muški</SelectItem>
                <SelectItem value="F">Ženski</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Uloga">
            <Select value={roleValue} onValueChange={(v) => setValue("employee_role", v as FormValues["employee_role"])}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYEE_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Email" htmlFor="email" error={fieldError("email")} className="sm:col-span-2">
            <Input id="email" className={inputClass} type="email" placeholder="radnik@primjer.ba" {...register("email")} />
          </FormField>
          <div className="sm:col-span-2 flex items-center gap-2 pt-0.5">
            <Checkbox
              id="send_payslip_email"
              checked={watch("send_payslip_email")}
              onCheckedChange={(v) => setValue("send_payslip_email", v === true)}
            />
            <Label htmlFor="send_payslip_email" className="font-normal cursor-pointer text-xs text-muted-foreground">
              Slati platne listiće na email
            </Label>
          </div>
        </FormGrid>
      </FormSection>

      <FormSection title="Adresa i prebivalište" description={RESIDENCE_ENTITY_HELP[residenceValue]}>
        <FormGrid>
          <FormField label="Entitet">
            <Select
              value={residenceValue}
              onValueChange={(v) => handleResidenceEntityChange(v as FormValues["residence_entity"])}
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESIDENCE_ENTITIES.map((e) => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Ulica i broj" htmlFor="address">
            <Input id="address" className={inputClass} placeholder="Titova 1" {...register("address")} />
          </FormField>

          {residenceValue === "BD" ? (
            <LocationMeta
              items={[
                { label: "Grad", value: municipalityValue || "Brčko distrikt" },
                { label: "Općina", value: municipalityValue || "Brčko distrikt" },
                { label: "Šifra", value: municipalityCodeValue || "144" },
              ]}
            />
          ) : (
            <>
              <FormField
                label={residenceValue === "FBiH" ? "Grad / općina" : "Općina / grad (RS)"}
                htmlFor="city-search"
                className="sm:col-span-2"
                hint={!municipalityCodeValue && citySearch.length >= 2 ? "Odaberite stavku iz liste." : undefined}
              >
                <div className="relative">
                  <Input
                    id="city-search"
                    className={inputClass}
                    placeholder={residenceValue === "FBiH" ? "Pretraži grad..." : "Pretraži općinu..."}
                    value={citySearch}
                    onChange={(e) => handleLocationSearch(e.target.value)}
                    onFocus={() => {
                      if (
                        (residenceValue === "FBiH" && citySuggestions.length > 0) ||
                        (residenceValue === "RS" && rsSuggestions.length > 0)
                      ) {
                        setShowLocationSuggestions(true);
                      }
                    }}
                    onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 150)}
                    autoComplete="off"
                  />
                  {showLocationSuggestions && residenceValue === "FBiH" && citySuggestions.length > 0 && (
                    <ul className="absolute top-full left-0 right-0 z-30 mt-1 rounded-md border bg-popover shadow-lg max-h-48 overflow-auto py-1">
                      {citySuggestions.map((city) => (
                        <li key={`${city.municipalityCode}-${city.name}`}>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex justify-between gap-2"
                            onMouseDown={() => selectFbihCity(city)}
                          >
                            <span className="font-medium truncate">{city.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{city.canton}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {showLocationSuggestions && residenceValue === "RS" && rsSuggestions.length > 0 && (
                    <ul className="absolute top-full left-0 right-0 z-30 mt-1 rounded-md border bg-popover shadow-lg max-h-48 overflow-auto py-1">
                      {rsSuggestions.map((m) => (
                        <li key={m.code}>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex justify-between gap-2"
                            onMouseDown={() => selectRsMunicipality(m)}
                          >
                            <span className="font-medium truncate">{m.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">{m.code}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </FormField>
              <LocationMeta
                items={[
                  ...(residenceValue === "FBiH"
                    ? [{ label: "Kanton", value: cantonValue ?? "" }]
                    : []),
                  { label: "Općina", value: municipalityValue ?? "" },
                  { label: "Šifra", value: municipalityCodeValue ?? "" },
                ]}
              />
            </>
          )}
        </FormGrid>
      </FormSection>

      <FormSection title="Posao i osiguranje">
        <FormGrid>
          <FormSubheading>Radno mjesto</FormSubheading>
          <FormField label="Naziv radnog mjesta" htmlFor="job_title">
            <Input id="job_title" className={inputClass} placeholder="Programer" {...register("job_title")} />
          </FormField>
          <FormField label="Šifra RM (4 cifre)" htmlFor="job_position_code">
            <Input id="job_position_code" className={inputClass} placeholder="2512" maxLength={4} {...register("job_position_code")} />
          </FormField>
          <FormField label="Radno vrijeme">
            <Select value={workTimePreset ?? "8-40"} onValueChange={applyWorkTimePreset}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORK_TIME_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {workTimePreset === "custom" && (
            <>
              <FormField label="Sati / dan" htmlFor="work_hours_per_day">
                <Input id="work_hours_per_day" className={inputClass} type="number" min={1} max={12} {...register("work_hours_per_day")} />
              </FormField>
              <FormField label="Sedmično sati" htmlFor="weekly_hours">
                <Input id="weekly_hours" className={inputClass} type="number" min={1} max={60} {...register("weekly_hours")} />
              </FormField>
            </>
          )}

          <FormSubheading>Kvalifikacije</FormSubheading>
          <FormField label="Stručna sprema">
            <Select value={educationValue ?? ""} onValueChange={(v) => setValue("education_level", v)}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="Odaberi..." />
              </SelectTrigger>
              <SelectContent>
                {EDUCATION_LEVELS.map((e) => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Šifra zanimanja" htmlFor="occupation_code" error={fieldError("occupation_code")}>
            <Input id="occupation_code" className={inputClass} placeholder="2512012" maxLength={7} {...register("occupation_code")} />
          </FormField>
          <FormField label="Naziv zanimanja" htmlFor="occupation_name" className="sm:col-span-2">
            <Input id="occupation_name" className={inputClass} {...register("occupation_name")} />
          </FormField>
          <FormField label="Osnov osiguranja">
            <Select value={insuranceBasisValue ?? ""} onValueChange={selectInsuranceBasis}>
              <SelectTrigger className={cn(selectTriggerClass, "text-left")}>
                <SelectValue placeholder="Odaberi..." />
              </SelectTrigger>
              <SelectContent className="max-w-sm">
                {INSURANCE_BASIS_CODES.map((b) => (
                  <SelectItem key={b.code} value={b.code}>
                    <span className="font-mono font-bold mr-1">{b.code}</span>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Osnov isplate">
            <Select value={paymentBasisValue ?? ""} onValueChange={selectPaymentBasis}>
              <SelectTrigger className={cn(selectTriggerClass, "text-left")}>
                <SelectValue placeholder="Odaberi..." />
              </SelectTrigger>
              <SelectContent className="max-w-sm">
                {PAYMENT_BASIS_CODES.map((b) => (
                  <SelectItem key={b.code} value={b.code}>
                    <span className="font-mono font-bold mr-1">{b.code}</span>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormSubheading>JS3100 datumi</FormSubheading>
          <FormField label="Datum prijave" htmlFor="insurance_registration_date">
            <Input id="insurance_registration_date" className={inputClass} type="date" {...register("insurance_registration_date")} />
          </FormField>
          <FormField label="Datum odjave" htmlFor="insurance_deregistration_date">
            <Input id="insurance_deregistration_date" className={inputClass} type="date" {...register("insurance_deregistration_date")} />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Plata i isplata">
        <FormGrid>
          <FormField label="Tip plate">
            <Select value={salaryType} onValueChange={(v) => setValue("salary_type", v as FormValues["salary_type"])}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SALARY_TYPES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="PK-1 koeficijent" htmlFor="tax_coefficient">
            <Input id="tax_coefficient" className={inputClass} type="number" step="0.01" min={0} max={99} {...register("tax_coefficient")} />
          </FormField>
          {salaryType === "gross_base" ? (
            <FormField label="Bruto plaća (KM)" htmlFor="gross_salary" error={fieldError("gross_salary")}>
              <Input id="gross_salary" className={inputClass} type="number" step="0.01" placeholder="1500" {...register("gross_salary")} />
            </FormField>
          ) : (
            <FormField
              label={salaryType === "target_net" ? "Ciljani neto (KM)" : "Neto plaća (KM)"}
              htmlFor="net_salary"
              error={fieldError("net_salary")}
            >
              <Input id="net_salary" className={inputClass} type="number" step="0.01" placeholder="1000" {...register("net_salary")} />
            </FormField>
          )}
          <FormField label="Topli obrok (KM/dan)" htmlFor="meal_allowance_per_day" hint={`Zadano iz firme: ${mealDefault} KM`}>
            <Input id="meal_allowance_per_day" className={inputClass} type="number" step="0.01" {...register("meal_allowance_per_day")} />
          </FormField>

          <FormSubheading>Staž (minuli rad)</FormSubheading>
          <FormField label="Prvo zaposlenje" htmlFor="first_employment_date">
            <Input id="first_employment_date" className={inputClass} type="date" {...register("first_employment_date")} />
          </FormField>
          <FormGrid cols={2} className="sm:col-span-2 !grid-cols-2">
            <FormField label="Staž prije (god.)" htmlFor="prior_experience_years">
              <Input id="prior_experience_years" className={inputClass} type="number" min={0} max={50} {...register("prior_experience_years")} />
            </FormField>
            <FormField label="Staž prije (mj.)" htmlFor="prior_experience_months">
              <Input id="prior_experience_months" className={inputClass} type="number" min={0} max={11} {...register("prior_experience_months")} />
            </FormField>
          </FormGrid>

          <FormSubheading>Bankovni račun</FormSubheading>
          <FormField label="Broj računa" htmlFor="bank_account">
            <Input id="bank_account" className={inputClass} placeholder="1610000000000001" {...register("bank_account")} />
          </FormField>
          <FormField label="Banka" htmlFor="bank_name">
            <Input id="bank_name" className={inputClass} placeholder="Raiffeisen" {...register("bank_name")} />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Ugovor o radu">
        <FormGrid>
          <FormField label="Broj ugovora" htmlFor="contract_number">
            <Input id="contract_number" className={inputClass} placeholder="UR-001/2026" {...register("contract_number")} />
          </FormField>
          <FormField label="Datum zaposlenja *" htmlFor="hire_date" error={fieldError("hire_date")}>
            <Input id="hire_date" className={inputClass} type="date" {...register("hire_date")} />
          </FormField>
          <FormField label="Vrsta ugovora">
            <Select value={contractType} onValueChange={(v) => setValue("contract_type", v as FormValues["contract_type"])}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTRACT_TYPES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {contractType === "fixed" ? (
            <FormField label="Istek ugovora" htmlFor="contract_end_date">
              <Input id="contract_end_date" className={inputClass} type="date" {...register("contract_end_date")} />
            </FormField>
          ) : (
            <div className="hidden sm:block" />
          )}
          <FormField label="Otkazni rok" htmlFor="notice_period">
            <Input id="notice_period" className={inputClass} placeholder="30 dana" {...register("notice_period")} />
          </FormField>
          <FormField label="Probni rad">
            <Select
              value={probationMonths ?? "0"}
              onValueChange={(v) => {
                setValue("probation_months", v);
                setValue("probation", Number(v) > 0);
              }}
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROBATION_MONTH_OPTIONS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m === 0 ? "Bez probnog" : `${m} mj.`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <div className="sm:col-span-2 flex items-center gap-2 pt-1">
            <Checkbox
              id="is_owner"
              checked={watch("is_owner")}
              onCheckedChange={(v) => setValue("is_owner", v === true)}
            />
            <Label htmlFor="is_owner" className="font-normal cursor-pointer text-xs text-muted-foreground">
              Vlasnik obrta / samostalni privrednik
            </Label>
          </div>
        </FormGrid>
      </FormSection>

      {serverError && (
        <div className="px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {serverError}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pb-8">
        <Button type="button" variant="outline" onClick={() => router.push("/radnici")} disabled={isPending}>
          Odustani
        </Button>
        <Button type="submit" disabled={isPending} className="min-w-36 gap-2">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Čuvanje...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {employeeId ? "Sačuvaj izmjene" : "Dodaj radnika"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

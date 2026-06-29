export const EDUCATION_LEVELS = [
  { value: "VSS",  label: "VSS — Visoka stručna sprema (VII)" },
  { value: "VŠS",  label: "VŠS — Viša stručna sprema (VI)" },
  { value: "SSS",  label: "SSS — Srednja stručna sprema (IV)" },
  { value: "VKV",  label: "VKV — Visoko kvalifikovani radnik (III)" },
  { value: "KV",   label: "KV — Kvalifikovani radnik (III)" },
  { value: "PKV",  label: "PKV — Polukvalifikovani radnik (II)" },
  { value: "NKV",  label: "NKV — Nekvalifikovani radnik (I)" },
  { value: "OŠ",   label: "OŠ — Osnovna škola" },
] as const;

export const INSURANCE_BASIS_CODES = [
  { code: "01", name: "Radnici u radnom odnosu na neodređeno" },
  { code: "02", name: "Radnici u radnom odnosu na određeno" },
  { code: "03", name: "Radnici na probnom radu" },
  { code: "11", name: "Vlasnici obrta koji obavljaju djelatnost" },
  { code: "12", name: "Suvlasnici koji rade u zajedničkom obrtu" },
  { code: "13", name: "Poslovodna lica d.o.o." },
  { code: "51", name: "Zaposleni koji rade nepuno radno vrijeme" },
] as const;

export const PAYMENT_BASIS_CODES = [
  { code: "01", name: "Plaća" },
  { code: "02", name: "Naknada plaće — godišnji odmor" },
  { code: "03", name: "Naknada plaće — bolovanje (na teret poslodavca)" },
  { code: "04", name: "Naknada plaće — porodiljsko" },
  { code: "05", name: "Naknada plaće — državni praznik" },
  { code: "06", name: "Naknada plaće — plaćeno odsustvo" },
] as const;

export const SALARY_TYPES = [
  { value: "net_contract",  label: "Neto po ugovoru" },
  { value: "target_net",    label: "Ciljani neto (bruto se izračunava)" },
  { value: "gross_base",    label: "Bruto baza" },
] as const;

export const CONTRACT_TYPES = [
  { value: "indefinite", label: "Na neodređeno" },
  { value: "fixed",      label: "Na određeno" },
] as const;

export const EMPLOYEE_ROLES = [
  { value: "radnik",      label: "Radnik" },
  { value: "vlasnik",     label: "Vlasnik / samostalni" },
  { value: "poslovodja",  label: "Poslovodno lice" },
  { value: "sezonski",    label: "Sezonski radnik" },
] as const;

export const RESIDENCE_ENTITIES = [
  { value: "FBiH", label: "Federacija BiH" },
  { value: "RS",   label: "Republika Srpska" },
  { value: "BD",   label: "Brčko distrikt" },
] as const;

export const INSURANCE_STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft:      { label: "Draft",      variant: "outline" },
  registered: { label: "Prijavljen", variant: "default" },
};

export const EMPLOYMENT_STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft:      { label: "Nacrt",      variant: "outline" },
  active:     { label: "Aktivan",    variant: "default" },
  probation:  { label: "Probni rad", variant: "secondary" },
  terminated: { label: "Prestanak",  variant: "destructive" },
};

export const PROBATION_MONTH_OPTIONS = [0, 1, 2, 3, 4, 5, 6] as const;

export const WORK_TIME_PRESETS = [
  { value: "8-40",  label: "Puno RV — 8h / 40h sedmično",  hoursPerDay: 8, minutesPerDay: 0, weeklyHours: 40 },
  { value: "7-35",  label: "7h dnevno / 35h sedmično",     hoursPerDay: 7, minutesPerDay: 0, weeklyHours: 35 },
  { value: "6-30",  label: "6h dnevno / 30h sedmično",     hoursPerDay: 6, minutesPerDay: 0, weeklyHours: 30 },
  { value: "4-20",  label: "Nepuno RV — 4h / 20h",         hoursPerDay: 4, minutesPerDay: 0, weeklyHours: 20 },
  { value: "custom", label: "Prilagođeno",                 hoursPerDay: 8, minutesPerDay: 0, weeklyHours: 40 },
] as const;

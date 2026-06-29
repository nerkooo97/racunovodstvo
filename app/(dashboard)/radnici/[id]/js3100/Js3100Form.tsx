"use client";

import { useState, useTransition } from "react";
import { EDUCATION_LEVELS, INSURANCE_BASIS_CODES } from "@/lib/constants/employee-codes";
import { activateEmployee } from "@/app/actions/employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FormSection from "@/components/shared/form-section";
import {
  Printer,
  UserCheck,
  RefreshCw,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface OrgData {
  jib: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
}

interface EmployeeData {
  jmbg: string;
  date_of_birth: string;
  last_name: string;
  first_name: string;
  maiden_name: string;
  gender: "M" | "F" | null;
  address: string;
  city: string;
  email: string;
  education_level: string;
  work_hours_per_day: number;
  work_minutes_per_day: number;
  insurance_basis_name: string;
  insurance_basis_code: string;
  occupation_name: string;
  occupation_code: string;
  job_position_code: string;
  payment_basis_name: string;
  payment_basis_code: string;
  hire_date: string;
}

interface Props {
  employeeId: string;
  insuranceStatus: string;
  org: OrgData;
  employee: EmployeeData;
}

const APPLICATION_TYPES = [
  { value: "prijava",  label: "Prijava osiguranja", desc: "Prva prijava radnika na Poreznu upravu" },
  { value: "promjena", label: "Promjena podataka",  desc: "Izmjena ugovornih ili ličnih podataka" },
  { value: "odjava",   label: "Odjava osiguranja",  desc: "Prekid radnog odnosa i odjava" },
] as const;

const today = () => new Date().toISOString().slice(0, 10);

export default function Js3100Form({ employeeId, insuranceStatus, org, employee }: Props) {
  const [isPending, startTransition] = useTransition();
  const [activateMsg, setActivateMsg] = useState<string | null>(null);
  const [printed, setPrinted] = useState(false);

  const [appType, setAppType] = useState<typeof APPLICATION_TYPES[number]["value"]>("prijava");
  const [appDate, setAppDate] = useState(today());

  const [jib,     setJib]     = useState(org.jib);
  const [orgName, setOrgName] = useState(org.name);
  const [orgAddr, setOrgAddr] = useState(org.address);
  const [orgCity, setOrgCity] = useState(org.city);
  const [orgPhone,setOrgPhone]= useState(org.phone);
  const [orgEmail,setOrgEmail]= useState(org.email);

  const [jmbg,       setJmbg]       = useState(employee.jmbg);
  const [dob,        setDob]        = useState(employee.date_of_birth);
  const [lastName,   setLastName]   = useState(employee.last_name);
  const [firstName,  setFirstName]  = useState(employee.first_name);
  const [maidenName, setMaidenName] = useState(employee.maiden_name);
  const [gender,     setGender]     = useState<string>(employee.gender ?? "M");
  const [address,    setAddress]    = useState(employee.address);
  const [city,       setCity]       = useState(employee.city);
  const [contactAddr,setContactAddr]= useState("");
  const [empEmail,   setEmpEmail]   = useState(employee.email);
  const [eduLevel,   setEduLevel]   = useState(employee.education_level);

  const [workHours, setWorkHours]   = useState(String(employee.work_hours_per_day));
  const [workMins,  setWorkMins]    = useState(String(employee.work_minutes_per_day));
  const [insName,   setInsName]     = useState(employee.insurance_basis_name);
  const [insCode,   setInsCode]     = useState(employee.insurance_basis_code);
  const [occName,   setOccName]     = useState(employee.occupation_name);
  const [occCode,   setOccCode]     = useState(employee.occupation_code);
  const [requiredEdu, setRequiredEdu] = useState(employee.education_level);
  const [changeDate,  setChangeDate]  = useState(employee.hire_date);
  const [changeNote,  setChangeNote]  = useState("");
  const [payBasisName,setPayBasisName]= useState(employee.payment_basis_name);
  const [payBasisCode,setPayBasisCode]= useState(employee.payment_basis_code);
  const [jobPosCode,  setJobPosCode]  = useState(employee.job_position_code);
  const [partTimeNum, setPartTimeNum] = useState("");
  const [partTimeDen, setPartTimeDen] = useState("12");

  const [fillerName,  setFillerName]  = useState("");
  const [fillerPhone, setFillerPhone] = useState(org.phone);
  const [fillDate,    setFillDate]    = useState(today());

  function fillOrg() {
    setJib(org.jib);
    setOrgName(org.name);
    setOrgAddr(org.address);
    setOrgCity(org.city);
    setOrgPhone(org.phone);
    setOrgEmail(org.email);
  }

  function fillEmployee() {
    setJmbg(employee.jmbg);
    setDob(employee.date_of_birth);
    setLastName(employee.last_name);
    setFirstName(employee.first_name);
    setMaidenName(employee.maiden_name);
    setGender(employee.gender ?? "M");
    setAddress(employee.address);
    setCity(employee.city);
    setEmpEmail(employee.email);
    setEduLevel(employee.education_level);
    setWorkHours(String(employee.work_hours_per_day));
    setWorkMins(String(employee.work_minutes_per_day));
    setInsName(employee.insurance_basis_name);
    setInsCode(employee.insurance_basis_code);
    setOccName(employee.occupation_name);
    setOccCode(employee.occupation_code);
    setJobPosCode(employee.job_position_code);
    setPayBasisName(employee.payment_basis_name);
    setPayBasisCode(employee.payment_basis_code);
    setChangeDate(employee.hire_date);
  }

  function onInsCodeChange(code: string) {
    setInsCode(code);
    const found = INSURANCE_BASIS_CODES.find((c) => c.code === code);
    if (found) setInsName(found.name);
  }

  function handlePrint() {
    setPrinted(true);
    const params = new URLSearchParams({
      type: "js3100",
      id: employeeId,
      appType,
      appDate,
      jib,
      orgName,
      orgAddr,
      orgCity,
      orgPhone,
      orgEmail,
      jmbg,
      dob,
      lastName,
      firstName,
      maidenName,
      gender,
      address,
      contactCityZip: city,
      contactAddr,
      empEmail,
      eduLevel,
      workHours,
      workMins,
      insCode,
      insName,
      occCode,
      occName,
      requiredEdu,
      changeDate,
      changeNote,
      payBasisCode,
      payBasisName,
      jobPosCode,
      partTimeNum,
      partTimeDen,
      fillerName,
      fillerPhone,
      fillDate,
    });
    window.open(`/api/pdf/js3100?${params.toString()}`, "_blank");
  }

  function handleActivate() {
    if (insuranceStatus === "registered") return;
    startTransition(async () => {
      const res = await activateEmployee(employeeId, appDate);
      setActivateMsg(res.error ?? "Radnik je uspješno prijavljen na PIO.");
    });
  }

  return (
    <div className="flex flex-col gap-8 pb-8">
      <FormSection
        title="Vrsta i datum podnošenja prijave"
        description="Odaberite svrhu podnošenja službenog obrasca JS3100"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {APPLICATION_TYPES.map((t) => {
            const active = appType === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setAppType(t.value)}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  active
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                    : "border-border hover:border-muted-foreground/30 hover:bg-accent/50"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>
                    {t.label}
                  </span>
                  <input
                    type="radio"
                    name="appType"
                    value={t.value}
                    checked={active}
                    onChange={() => setAppType(t.value)}
                    className="h-4 w-4 text-primary accent-primary"
                  />
                </div>
                <span className="text-xs text-muted-foreground">{t.desc}</span>
              </button>
            );
          })}
        </div>
        <div className="max-w-xs grid gap-2">
          <Label htmlFor="appDate">Datum podnošenja prijave</Label>
          <Input id="appDate" type="date" value={appDate} onChange={(e) => setAppDate(e.target.value)} />
        </div>
      </FormSection>

      <FormSection
        title="Dio 1 — Obveznik uplate doprinosa"
        description="Podaci o poslodavcu / pravnom licu"
      >
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={fillOrg} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Učitaj podatke firme
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="grid gap-2">
            <Label>1) JIB poslodavca</Label>
            <Input value={jib} onChange={(e) => setJib(e.target.value)} maxLength={13} placeholder="4200000000000" />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>2) Naziv obveznika uplate</Label>
            <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Naziv d.o.o. / obrt" />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>3) Adresa obveznika</Label>
            <Input value={orgAddr} onChange={(e) => setOrgAddr(e.target.value)} placeholder="Ulica i broj" />
          </div>
          <div className="grid gap-2">
            <Label>4) Grad i poštanski broj</Label>
            <Input value={orgCity} onChange={(e) => setOrgCity(e.target.value)} placeholder="Sarajevo 71000" />
          </div>
          <div className="grid gap-2">
            <Label>7) Kontakt telefon</Label>
            <Input value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)} placeholder="033 123 456" />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>8) Email adresa</Label>
            <Input type="email" value={orgEmail} onChange={(e) => setOrgEmail(e.target.value)} placeholder="info@firma.ba" />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Dio 2 — Podaci o osiguraniku"
        description="Matični i kontakt podaci zaposlenika"
      >
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={fillEmployee} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Učitaj podatke radnika
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="grid gap-2">
            <Label>JMBG radnika</Label>
            <Input value={jmbg} onChange={(e) => setJmbg(e.target.value)} maxLength={13} />
          </div>
          <div className="grid gap-2">
            <Label>Datum rođenja</Label>
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Spol</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Muški</SelectItem>
                <SelectItem value="F">Ženski</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Ime</Label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Prezime</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Djevojačko prezime</Label>
            <Input value={maidenName} onChange={(e) => setMaidenName(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="grid gap-2 sm:col-span-2">
            <Label>Adresa prebivališta</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Mjesto / Grad</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Kontakt adresa (ako se razlikuje od prebivališta)</Label>
            <Input value={contactAddr} onChange={(e) => setContactAddr(e.target.value)} placeholder="Nije obavezno" />
          </div>
          <div className="grid gap-2">
            <Label>Email radnika</Label>
            <Input type="email" value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} />
          </div>
        </div>
        <div className="max-w-md grid gap-2">
          <Label>Stručna sprema radnika</Label>
          <Select value={eduLevel} onValueChange={setEduLevel}>
            <SelectTrigger><SelectValue placeholder="Odaberi..." /></SelectTrigger>
            <SelectContent>
              {EDUCATION_LEVELS.map((e) => (
                <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FormSection>

      <FormSection
        title="Dio 3 — Podaci o osiguranju i radnom mjestu"
        description="Parametri osiguranja, radno vrijeme i klasifikacijske šifre"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="grid gap-2">
            <Label>Dnevno sati</Label>
            <Input type="number" min={0} max={24} value={workHours} onChange={(e) => setWorkHours(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Dnevno minuta</Label>
            <Input type="number" min={0} max={59} value={workMins} onChange={(e) => setWorkMins(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Šifra radnog mjesta (4 cifre)</Label>
            <Input value={jobPosCode} onChange={(e) => setJobPosCode(e.target.value)} maxLength={4} placeholder="2512" />
          </div>
          <div className="grid gap-2">
            <Label>Šifra zanimanja (7 cifara)</Label>
            <Input value={occCode} onChange={(e) => setOccCode(e.target.value)} maxLength={7} placeholder="2512012" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Osnov osiguranja (Šifra)</Label>
            <Select value={insCode} onValueChange={onInsCodeChange}>
              <SelectTrigger className="w-full text-left truncate"><SelectValue placeholder="Odaberi šifru..." /></SelectTrigger>
              <SelectContent className="max-w-md">
                {INSURANCE_BASIS_CODES.map((c) => (
                  <SelectItem key={c.code} value={c.code}><span className="font-mono font-bold mr-1">{c.code}</span> — {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Osnov osiguranja (Opis)</Label>
            <Input value={insName} onChange={(e) => setInsName(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Zanimanje (Opis)</Label>
            <Input value={occName} onChange={(e) => setOccName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Stručna sprema tražena na radnom mjestu</Label>
            <Select value={requiredEdu} onValueChange={setRequiredEdu}>
              <SelectTrigger><SelectValue placeholder="Odaberi..." /></SelectTrigger>
              <SelectContent>
                {EDUCATION_LEVELS.map((e) => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="grid gap-2">
            <Label>
              Datum {appType === "odjava" ? "odjave" : appType === "promjena" ? "promjene" : "prijave"} osiguranja
            </Label>
            <Input type="date" value={changeDate} onChange={(e) => setChangeDate(e.target.value)} />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Napomena uz datum (opcionalno)</Label>
            <Input value={changeNote} onChange={(e) => setChangeNote(e.target.value)} placeholder="npr. Osnov prestanka radnog odnosa" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="grid gap-2 md:col-span-2">
            <Label>Osnov za uplatu doprinosa — Opis</Label>
            <Input value={payBasisName} onChange={(e) => setPayBasisName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Osnov za uplatu — Šifra</Label>
            <Input value={payBasisCode} onChange={(e) => setPayBasisCode(e.target.value)} maxLength={2} placeholder="01" />
          </div>
        </div>
        <div className="max-w-sm grid gap-2">
          <Label>Stepen uvećanja (X / 12) — za nepuno radno vrijeme</Label>
          <div className="flex items-center gap-2">
            <Input value={partTimeNum} onChange={(e) => setPartTimeNum(e.target.value)} placeholder="X" className="w-20 text-center" />
            <span className="text-muted-foreground font-semibold">/</span>
            <Input value={partTimeDen} onChange={(e) => setPartTimeDen(e.target.value)} className="w-20 text-center" />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Dio 4 — Lice koje je popunilo prijavu"
        description="Odgovorno lice ili ovlašteni računovođa poslodavca"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="grid gap-2 sm:col-span-2 lg:col-span-1">
            <Label>Ime i prezime lica</Label>
            <Input value={fillerName} onChange={(e) => setFillerName(e.target.value)} placeholder="npr. Ana Anić" />
          </div>
          <div className="grid gap-2">
            <Label>Telefonski broj</Label>
            <Input value={fillerPhone} onChange={(e) => setFillerPhone(e.target.value)} placeholder="033 123 456" />
          </div>
          <div className="grid gap-2">
            <Label>Datum popunjavanja</Label>
            <Input type="date" value={fillDate} onChange={(e) => setFillDate(e.target.value)} />
          </div>
        </div>
      </FormSection>

      <FormSection title="Akcije">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Button type="button" variant="secondary" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Prikaži pregled / Štampaj PDF
            </Button>

            {insuranceStatus !== "registered" && (
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                onClick={handleActivate}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Prijavljujem...
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4" />
                    Samo prijavi radnika →
                  </>
                )}
              </Button>
            )}
          </div>

          {insuranceStatus === "registered" && (
            <div className="flex items-center gap-2 text-emerald-600 font-medium text-sm bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              Radnik je prijavljen na PIO
            </div>
          )}
        </div>

        {activateMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{activateMsg}</span>
          </div>
        )}

        {printed && (
          <p className="text-xs text-muted-foreground">
            Napomena: Obrazac se štampa u standardnom formatu. Preporučujemo da odštampate 2 primjerka (jedan za nadležnu ispostavu Porezne uprave FBiH, a drugi za internu arhivu i dosje radnika).
          </p>
        )}
      </FormSection>
    </div>
  );
}

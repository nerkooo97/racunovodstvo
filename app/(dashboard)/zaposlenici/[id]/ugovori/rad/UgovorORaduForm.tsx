"use client";

import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { EDUCATION_LEVELS } from "@/lib/constants/employee-codes";

interface OrgData {
  name: string;
  address: string;
  city: string;
  jib: string;
}

interface EmpData {
  first_name: string;
  last_name: string;
  jmbg: string;
  address: string;
  city: string;
  education_level: string;
  job_title: string;
  job_position_code: string;
  work_hours_per_day: number;
  gross_salary: number;
  net_salary: number | null;
  contract_type: "indefinite" | "fixed";
  contract_end_date: string;
  probation: boolean;
  probation_end_date: string;
  hire_date: string;
  notice_period: string;
}

interface Props {
  employeeId: string;
  org: OrgData;
  employee: EmpData;
}

export default function UgovorORaduForm({ org, employee }: Props) {
  const [orgName,    setOrgName]    = useState(org.name);
  const [orgAddress, setOrgAddress] = useState(org.address + (org.city ? `, ${org.city}` : ""));
  const [orgJib,     setOrgJib]     = useState(org.jib);
  const [zastupnik,  setZastupnik]  = useState("");

  const [lastName,   setLastName]   = useState(employee.last_name);
  const [firstName,  setFirstName]  = useState(employee.first_name);
  const [jmbg,       setJmbg]       = useState(employee.jmbg);
  const [address,    setAddress]    = useState(employee.address + (employee.city ? `, ${employee.city}` : ""));
  const [eduLevel,   setEduLevel]   = useState(employee.education_level);

  const [jobTitle,     setJobTitle]     = useState(employee.job_title);
  const [jobDesc,      setJobDesc]      = useState("");
  const [jobPosCode,   setJobPosCode]   = useState(employee.job_position_code);

  const [contractType,     setContractType]     = useState<"indefinite" | "fixed">(employee.contract_type);
  const [contractEndDate,  setContractEndDate]  = useState(employee.contract_end_date);
  const [probation,        setProbation]        = useState(employee.probation);
  const [probationEnd,     setProbationEnd]     = useState(employee.probation_end_date);

  const [fullTime,    setFullTime]    = useState(true);
  const [workHours,   setWorkHours]   = useState(String(employee.work_hours_per_day));

  const [grossSalary,  setGrossSalary]  = useState(String(employee.gross_salary));
  const [netSalary,    setNetSalary]    = useState(String(employee.net_salary ?? ""));
  const [paymentDate,  setPaymentDate]  = useState("");
  const [annualLeave,  setAnnualLeave]  = useState("20");
  const [noticePeriod, setNoticePeriod] = useState(employee.notice_period);

  const [contractNum,  setContractNum]  = useState("");
  const [contractDate, setContractDate] = useState(new Date().toISOString().slice(0, 10));
  const [hireDate,     setHireDate]     = useState(employee.hire_date);

  const [showTermination, setShowTermination] = useState(false);
  const [terminationReason, setTerminationReason] = useState<"sporazumni" | "radnik" | "poslodavac">("sporazumni");
  const [terminationDate,   setTerminationDate]   = useState("");
  const [terminationNotice, setTerminationNotice] = useState("30 dana");
  const [severancePay,      setSeverancePay]       = useState("");

  return (
    <div className="max-w-2xl space-y-6">
      <div className="border rounded-md p-4">
        <h2 className="font-semibold text-sm mb-3">Podaci o poslodavcu</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1">
            <Label className="text-xs">Naziv pravnog lica</Label>
            <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Adresa i sjedište</Label>
            <Input value={orgAddress} onChange={(e) => setOrgAddress(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">JIB</Label>
            <Input value={orgJib} onChange={(e) => setOrgJib(e.target.value)} />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <Label className="text-xs">Zakonski zastupnik (ime i prezime)</Label>
            <Input value={zastupnik} onChange={(e) => setZastupnik(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="border rounded-md p-4">
        <h2 className="font-semibold text-sm mb-3">Podaci o radniku</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Prezime</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Ime</Label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">JMBG</Label>
            <Input value={jmbg} onChange={(e) => setJmbg(e.target.value)} maxLength={13} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Adresa i mjesto</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <Label className="text-xs">Stručna sprema</Label>
            <Select value={eduLevel} onValueChange={setEduLevel}>
              <SelectTrigger><SelectValue placeholder="Odaberi..." /></SelectTrigger>
              <SelectContent>
                {EDUCATION_LEVELS.map((e) => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="border rounded-md p-4">
        <h2 className="font-semibold text-sm mb-3">Radno mjesto</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Naziv radnog mjesta</Label>
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Šifra radnog mjesta (4 cifre)</Label>
            <Input value={jobPosCode} onChange={(e) => setJobPosCode(e.target.value)} maxLength={4} />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <Label className="text-xs">Opis poslova</Label>
            <Input value={jobDesc} onChange={(e) => setJobDesc(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="border rounded-md p-4">
        <h2 className="font-semibold text-sm mb-3">Vrsta i uslovi radnog odnosa</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Vrsta radnog odnosa</Label>
            <Select value={contractType} onValueChange={(v) => setContractType(v as "indefinite" | "fixed")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="indefinite">Na neodređeno</SelectItem>
                <SelectItem value="fixed">Na određeno</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {contractType === "fixed" && (
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Datum završetka ugovora</Label>
              <Input type="date" value={contractEndDate} onChange={(e) => setContractEndDate(e.target.value)} />
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Checkbox id="probation" checked={probation} onCheckedChange={(v) => setProbation(v === true)} />
            <label htmlFor="probation" className="text-xs">Probni rad</label>
          </div>
          {probation && (
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Probni rad do</Label>
              <Input type="date" value={probationEnd} onChange={(e) => setProbationEnd(e.target.value)} />
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Checkbox id="fulltime" checked={fullTime} onCheckedChange={(v) => setFullTime(v === true)} />
            <label htmlFor="fulltime" className="text-xs">Puno radno vrijeme</label>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Sati/dan (ako nepuno)</Label>
            <Input type="number" value={workHours} onChange={(e) => setWorkHours(e.target.value)} className="w-20" disabled={fullTime} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Datum stupanja na rad</Label>
            <Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="border rounded-md p-4">
        <h2 className="font-semibold text-sm mb-3">Plata i odmori</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Bruto plata (KM)</Label>
            <Input type="number" value={grossSalary} onChange={(e) => setGrossSalary(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Neto plata (KM) — po ugovoru</Label>
            <Input type="number" value={netSalary} onChange={(e) => setNetSalary(e.target.value)} placeholder="opciono" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Datum isplate (dan u mjesecu)</Label>
            <Input value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} placeholder="npr. 25. u tekućem" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Godišnji odmor (min. 20 radnih dana)</Label>
            <Input type="number" value={annualLeave} onChange={(e) => setAnnualLeave(e.target.value)} className="w-24" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Otkazni rok</Label>
            <Input value={noticePeriod} onChange={(e) => setNoticePeriod(e.target.value)} placeholder="30 dana" />
          </div>
        </div>
      </div>

      <div className="border rounded-md p-4">
        <h2 className="font-semibold text-sm mb-3">Detalji ugovora</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Broj ugovora</Label>
            <Input value={contractNum} onChange={(e) => setContractNum(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Datum zaključenja</Label>
            <Input type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="button" onClick={() => window.print()}>
          Prikaži / Štampaj PDF
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-amber-400 text-amber-700"
          disabled
          title="Business plan"
        >
          Preuzmi DOCX (Business plan)
        </Button>
      </div>

      <div className="border rounded-md p-4 mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Odluka o prestanku radnog odnosa</h2>
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowTermination(!showTermination)}>
            {showTermination ? "Sakrij" : "Prikaži"}
          </Button>
        </div>
        {showTermination && (
          <div className="mt-3 space-y-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Razlog prestanka</Label>
              <Select value={terminationReason} onValueChange={(v) => setTerminationReason(v as typeof terminationReason)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sporazumni">Sporazumni prestanak</SelectItem>
                  <SelectItem value="radnik">Otkaz od strane radnika</SelectItem>
                  <SelectItem value="poslodavac">Otkaz od strane poslodavca</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Datum prestanka</Label>
                <Input type="date" value={terminationDate} onChange={(e) => setTerminationDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Otkazni rok</Label>
                <Input value={terminationNotice} onChange={(e) => setTerminationNotice(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Otpremnina (KM) — ako postoji</Label>
                <Input type="number" value={severancePay} onChange={(e) => setSeverancePay(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Napomena: Nakon kreiranja odluke o otkazu, potrebno je kreirati JS3100 odjavu u roku 7 dana.
            </p>
            <div className="flex gap-3 mt-2">
              <Button type="button" variant="outline" onClick={() => window.print()}>
                Štampaj odluku
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-amber-400 text-amber-700"
                disabled
                title="Business plan"
              >
                Preuzmi DOCX (Business plan)
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

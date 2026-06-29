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
import { EDUCATION_LEVELS } from "@/lib/constants/employee-codes";

export default function UgovorORaduPage() {
  const [submitted, setSubmitted] = useState(false);
  const [fields, setFields] = useState({
    employer_name:    "",
    employer_jib:     "",
    employer_address: "",
    employee_name:    "",
    employee_jmbg:    "",
    employee_address: "",
    job_title:        "",
    start_date:       "",
    end_date:         "",
    contract_type:    "indefinite",
    weekly_hours:     "40",
    salary:           "",
    salary_type:      "net",
    education_level:  EDUCATION_LEVELS[0].value as string,
    probation_months: "3",
    notice_period:    "30",
    place:            "Sarajevo",
    sign_date:        new Date().toISOString().slice(0, 10),
  });

  function set(field: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields((prev) => ({ ...prev, [field]: e.target.value }));
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Ugovor o radu</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Generator ugovora o radu prema Zakonu o radu FBiH.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="col-span-2">
          <h2 className="font-semibold text-sm mb-2">Poslodavac</h2>
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <Label>Naziv poslodavca</Label>
          <Input value={fields.employer_name} onChange={set("employer_name")} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>JIB</Label>
          <Input value={fields.employer_jib} onChange={set("employer_jib")} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Adresa</Label>
          <Input value={fields.employer_address} onChange={set("employer_address")} />
        </div>

        <div className="col-span-2 pt-2">
          <h2 className="font-semibold text-sm mb-2">Radnik</h2>
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <Label>Ime i prezime</Label>
          <Input value={fields.employee_name} onChange={set("employee_name")} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>JMBG</Label>
          <Input value={fields.employee_jmbg} onChange={set("employee_jmbg")} maxLength={13} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Adresa stanovanja</Label>
          <Input value={fields.employee_address} onChange={set("employee_address")} />
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <Label>Stepen obrazovanja</Label>
          <Select value={fields.education_level}
            onValueChange={(v) => setFields((p) => ({ ...p, education_level: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EDUCATION_LEVELS.map((e) => (
                <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 pt-2">
          <h2 className="font-semibold text-sm mb-2">Radno mjesto i uvjeti</h2>
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <Label>Naziv radnog mjesta</Label>
          <Input value={fields.job_title} onChange={set("job_title")} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Vrsta ugovora</Label>
          <Select value={fields.contract_type}
            onValueChange={(v) => setFields((p) => ({ ...p, contract_type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="indefinite">Na neodređeno</SelectItem>
              <SelectItem value="fixed">Na određeno</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Sedmični fond sati</Label>
          <Input type="number" value={fields.weekly_hours} onChange={set("weekly_hours")} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Datum početka rada</Label>
          <Input type="date" value={fields.start_date} onChange={set("start_date")} />
        </div>
        {fields.contract_type === "fixed" && (
          <div className="flex flex-col gap-1">
            <Label>Datum isteka ugovora</Label>
            <Input type="date" value={fields.end_date} onChange={set("end_date")} />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <Label>Probni rad (mjeseci)</Label>
          <Input type="number" min={0} max={6} value={fields.probation_months} onChange={set("probation_months")} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Otkazni rok (dani)</Label>
          <Input type="number" value={fields.notice_period} onChange={set("notice_period")} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Plaća (KM)</Label>
          <Input type="text" inputMode="decimal" value={fields.salary} onChange={set("salary")} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Vrsta plate</Label>
          <Select value={fields.salary_type}
            onValueChange={(v) => setFields((p) => ({ ...p, salary_type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="net">Neto</SelectItem>
              <SelectItem value="gross">Bruto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Mjesto potpisivanja</Label>
          <Input value={fields.place} onChange={set("place")} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Datum potpisivanja</Label>
          <Input type="date" value={fields.sign_date} onChange={set("sign_date")} />
        </div>
      </div>

      <Button onClick={() => setSubmitted(true)} className="mb-6">Generiši ugovor</Button>

      {submitted && (
        <div className="border rounded-md p-6 text-sm space-y-3 bg-white print:shadow-none">
          <div className="text-center">
            <h2 className="font-bold text-base uppercase">UGOVOR O RADU</h2>
            <p className="text-muted-foreground text-xs">broj: _______/</p>
          </div>
          <p>
            Zaključen između: <strong>{fields.employer_name}</strong>, JIB: {fields.employer_jib},
            sa sjedištem u {fields.employer_address} (u daljem tekstu: Poslodavac),
          </p>
          <p>
            i <strong>{fields.employee_name}</strong>, JMBG: {fields.employee_jmbg},
            sa adresom stanovanja u {fields.employee_address} (u daljem tekstu: Radnik).
          </p>
          <p><strong>Radno mjesto:</strong> {fields.job_title}</p>
          <p><strong>Vrsta ugovora:</strong> {fields.contract_type === "indefinite" ? "Na neodređeno" : `Na određeno do ${fields.end_date}`}</p>
          <p><strong>Početak rada:</strong> {fields.start_date}</p>
          <p><strong>Sedmični fond:</strong> {fields.weekly_hours} sati</p>
          <p><strong>Plaća:</strong> {fields.salary} KM {fields.salary_type === "net" ? "neto" : "bruto"}</p>
          {fields.probation_months !== "0" && (
            <p><strong>Probni rad:</strong> {fields.probation_months} {Number(fields.probation_months) === 1 ? "mjesec" : "mjeseca"}</p>
          )}
          <p><strong>Otkazni rok:</strong> {fields.notice_period} dana</p>
          <div className="mt-6 grid grid-cols-2 gap-8 pt-6 border-t">
            <div>
              <p className="text-muted-foreground text-xs mb-8">Poslodavac:</p>
              <p className="border-t border-foreground/30 pt-1">{fields.employer_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-8">Radnik:</p>
              <p className="border-t border-foreground/30 pt-1">{fields.employee_name}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-right">{fields.place}, {fields.sign_date}</p>
          <div className="flex justify-end gap-2 print:hidden mt-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>Štampaj</Button>
          </div>
        </div>
      )}
    </div>
  );
}

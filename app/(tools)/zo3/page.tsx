"use client";

import { useState } from "react";
import { EDUCATION_LEVELS, INSURANCE_BASIS_CODES } from "@/lib/constants/employee-codes";
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

const CANTONS = [
  { code: "01", name: "Unsko-sanski kanton" },
  { code: "02", name: "Posavski kanton" },
  { code: "03", name: "Tuzlanski kanton" },
  { code: "04", name: "Zeničko-dobojski kanton" },
  { code: "05", name: "Bosansko-podrinjski kanton" },
  { code: "06", name: "Srednjobosanski kanton" },
  { code: "07", name: "Hercegovačko-neretvanski kanton" },
  { code: "08", name: "Zapadnohercegovački kanton" },
  { code: "09", name: "Sarajevski kanton" },
  { code: "10", name: "Kanton 10" },
];

const CHANGE_TYPES = [
  { code: "01", name: "Prijava" },
  { code: "02", name: "Promjena" },
  { code: "03", name: "Odjava" },
];

interface FamilyMember {
  id: number;
  jmbg: string;
  fullName: string;
  relationship: string;
}

let nextId = 1;

export default function Zo3Page() {
  // Zaglavlje
  const [canton, setCanton]         = useState<string>("09");
  const [office, setOffice]         = useState("");

  // Obligator (poslodavac)
  const [jib, setJib]               = useState("");
  const [regNumber, setRegNumber]   = useState("");
  const [activityCode, setActivityCode] = useState("");
  const [activityName, setActivityName] = useState("");
  const [weeklyHoursObl, setWeeklyHoursObl] = useState("40");

  // Osiguranik (radnik)
  const [jmbg, setJmbg]             = useState("");
  const [lastName, setLastName]     = useState("");
  const [firstName, setFirstName]   = useState("");
  const [maidenName, setMaidenName] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity]             = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [occupation, setOccupation] = useState("");
  const [occupationCode, setOccupationCode] = useState("");
  const [hireDate, setHireDate]     = useState("");
  const [citizenship, setCitizenship] = useState("Bosansko-Hercegovačko");
  const [weeklyHoursEmp, setWeeklyHoursEmp] = useState("40");
  const [insCode, setInsCode]       = useState<string>(INSURANCE_BASIS_CODES[0]?.code ?? "");
  const [insDesc, setInsDesc]       = useState<string>(INSURANCE_BASIS_CODES[0]?.name ?? "");
  const [endDate, setEndDate]       = useState("");
  const [changeDate, setChangeDate] = useState("");
  const [changeType, setChangeType] = useState("01");

  // Članovi porodice
  const [members, setMembers] = useState<FamilyMember[]>([
    { id: nextId++, jmbg: "", fullName: "", relationship: "" },
  ]);

  // Napomena i potpis
  const [note, setNote]             = useState("");
  const [place, setPlace]           = useState("");
  const [signDate, setSignDate]     = useState("");

  const [submitted, setSubmitted]   = useState(false);

  function addMember() {
    if (members.length >= 10) return;
    setMembers((prev) => [...prev, { id: nextId++, jmbg: "", fullName: "", relationship: "" }]);
  }

  function updateMember(id: number, field: keyof FamilyMember, value: string) {
    setMembers((prev) => prev.map((m) => m.id === id ? { ...m, [field]: value } : m));
  }

  function removeMember(id: number) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  function onInsCodeChange(code: string) {
    setInsCode(code);
    const found = INSURANCE_BASIS_CODES.find((c) => c.code === code);
    if (found) setInsDesc(found.name);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">ZO-3</h1>
      <p className="text-muted-foreground text-sm mb-1">
        Zahtjev za matičnu evidenciju osiguranika i članova njihovih porodica.
      </p>
      <p className="text-xs text-muted-foreground mb-6">
        Ko se može prijaviti: supružnik, djeca (maloljetna/na školovanju), roditelji bez drugog osiguranja.
        Rok predaje: <strong>8 dana od nastanka promjene</strong>.
      </p>

      <div className="space-y-6">
        {/* Zaglavlje */}
        <section className="border rounded-md p-4">
          <h2 className="font-semibold text-sm mb-3">Zaglavlje</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Kanton FBiH</Label>
              <Select value={canton} onValueChange={setCanton}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CANTONS.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Poslovnica / Područni ured</Label>
              <Input value={office} onChange={(e) => setOffice(e.target.value)} />
            </div>
          </div>
        </section>

        {/* Obligator */}
        <section className="border rounded-md p-4">
          <h2 className="font-semibold text-sm mb-3">Podaci o obvezniku uplate doprinosa (poslodavac)</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">1) JIB</Label>
              <Input value={jib} onChange={(e) => setJib(e.target.value)} maxLength={13} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">2) Registarski broj obveznika</Label>
              <Input value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">3) Šifra djelatnosti</Label>
              <Input value={activityCode} onChange={(e) => setActivityCode(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Naziv djelatnosti</Label>
              <Input value={activityName} onChange={(e) => setActivityName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">4) Sedmično radno vrijeme (sati)</Label>
              <Input type="number" value={weeklyHoursObl} onChange={(e) => setWeeklyHoursObl(e.target.value)} className="w-24" />
            </div>
          </div>
        </section>

        {/* Osiguranik */}
        <section className="border rounded-md p-4">
          <h2 className="font-semibold text-sm mb-3">Podaci o osiguraniku (radnik)</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">5) JMBG</Label>
              <Input value={jmbg} onChange={(e) => setJmbg(e.target.value)} maxLength={13} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">6) Prezime</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">7) Ime</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">8) Djevojačko prezime</Label>
              <Input value={maidenName} onChange={(e) => setMaidenName(e.target.value)} />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <Label className="text-xs">9) Ulica i broj prebivališta</Label>
              <Input value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Grad</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">10) Broj pošte</Label>
              <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="w-24" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">11) Zanimanje</Label>
              <Input value={occupation} onChange={(e) => setOccupation(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Šifra zanimanja</Label>
              <Input value={occupationCode} onChange={(e) => setOccupationCode(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">12) Datum stupanja na rad</Label>
              <Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">13) Državljanstvo</Label>
              <Input value={citizenship} onChange={(e) => setCitizenship(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">14) Sedmično radno vrijeme (sati)</Label>
              <Input type="number" value={weeklyHoursEmp} onChange={(e) => setWeeklyHoursEmp(e.target.value)} className="w-24" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">15) Osnov osiguranja</Label>
              <Select value={insCode} onValueChange={onInsCodeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSURANCE_BASIS_CODES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">16) Datum prestanka rada</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">17) Datum promjene</Label>
              <Input type="date" value={changeDate} onChange={(e) => setChangeDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">18) Vrsta promjene</Label>
              <Select value={changeType} onValueChange={setChangeType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANGE_TYPES.map((t) => (
                    <SelectItem key={t.code} value={t.code}>{t.code} — {t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Članovi porodice */}
        <section className="border rounded-md p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Podaci o članovima porodice (maks. 10)</h2>
            <Button type="button" variant="outline" size="sm" onClick={addMember} disabled={members.length >= 10}>
              + Dodaj člana
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-1 px-2 text-left text-xs text-muted-foreground w-6">RBr</th>
                  <th className="py-1 px-2 text-left text-xs text-muted-foreground">JMBG</th>
                  <th className="py-1 px-2 text-left text-xs text-muted-foreground">Prezime i ime</th>
                  <th className="py-1 px-2 text-left text-xs text-muted-foreground">Srodstvo</th>
                  <th className="py-1 px-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, idx) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-1 px-2 text-muted-foreground text-xs">{idx + 19}</td>
                    <td className="py-1 px-1">
                      <Input
                        value={m.jmbg}
                        onChange={(e) => updateMember(m.id, "jmbg", e.target.value)}
                        maxLength={13}
                        className="h-7 text-xs w-32"
                      />
                    </td>
                    <td className="py-1 px-1">
                      <Input
                        value={m.fullName}
                        onChange={(e) => updateMember(m.id, "fullName", e.target.value)}
                        className="h-7 text-xs"
                      />
                    </td>
                    <td className="py-1 px-1">
                      <Input
                        value={m.relationship}
                        onChange={(e) => updateMember(m.id, "relationship", e.target.value)}
                        placeholder="npr. suprug/a, dijete"
                        className="h-7 text-xs"
                      />
                    </td>
                    <td className="py-1 px-1">
                      <button
                        type="button"
                        onClick={() => removeMember(m.id)}
                        className="text-muted-foreground hover:text-destructive text-xs"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Napomena i potpis */}
        <section className="border rounded-md p-4">
          <h2 className="font-semibold text-sm mb-3">Napomena i potpis</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1">
              <Label className="text-xs">Napomena</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">U (mjesto)</Label>
              <Input value={place} onChange={(e) => setPlace(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Dana (datum)</Label>
              <Input type="date" value={signDate} onChange={(e) => setSignDate(e.target.value)} />
            </div>
          </div>
        </section>

        <div className="flex gap-3">
          <Button type="button" onClick={() => setSubmitted(true)}>
            Prikaži pregled
          </Button>
          {submitted && (
            <Button type="button" variant="outline" onClick={() => window.print()}>
              Štampaj / PDF (2 primjerka)
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

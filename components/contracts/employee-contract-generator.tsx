"use client";

import { useEffect, useMemo, useState } from "react";
import { getNextDocumentNumber } from "@/app/actions/organization-documents";
import {
  groupTemplatesByCategory,
  isOtkazTemplate,
  isPeriodTemplate,
  isSporazumniTemplate,
  isUgovorTemplate,
  type ContractTemplate,
} from "@/lib/contracts/templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FormSection from "@/components/shared/form-section";
import { Download, FileText, Loader2, RefreshCw, Save } from "lucide-react";

interface Props {
  employeeId: string;
  employeeName: string;
  defaultPlace?: string;
  defaultDocumentNumber?: string;
  defaultWorkLocation?: string;
  initialTemplateId?: string;
  defaultContractSignedDate?: string;
  onDocumentSaved?: () => void;
}

export default function EmployeeContractGenerator({
  employeeId,
  employeeName,
  defaultPlace = "",
  defaultDocumentNumber = "",
  defaultWorkLocation = "",
  initialTemplateId = "ugovor-o-radu",
  defaultContractSignedDate = "",
  onDocumentSaved,
}: Props) {
  const groups = useMemo(() => groupTemplatesByCategory(), []);
  const allTemplates = useMemo(
    () => groups.flatMap((g) => g.templates),
    [groups]
  );

  const [templateId, setTemplateId] = useState(initialTemplateId);
  const [documentNumber, setDocumentNumber] = useState("");
  const [numberLoading, setNumberLoading] = useState(false);
  const [documentDate, setDocumentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [documentPlace, setDocumentPlace] = useState(defaultPlace);
  const [representative, setRepresentative] = useState("");
  const [reason, setReason] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [extraNote, setExtraNote] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [workLocation, setWorkLocation] = useState(defaultWorkLocation);
  const [paymentDay, setPaymentDay] = useState("15.");
  const [annualLeaveDays, setAnnualLeaveDays] = useState("20");
  const [fullTime, setFullTime] = useState(true);
  const [severancePay, setSeverancePay] = useState("");
  const [terminationNotice, setTerminationNotice] = useState("30 dana");
  const [durationDays, setDurationDays] = useState("");
  const [contractSignedDate, setContractSignedDate] = useState(defaultContractSignedDate);
  const [annualLeaveUsage, setAnnualLeaveUsage] = useState<"full" | "remaining">("full");
  const [handoverItems, setHandoverItems] = useState("");
  const [referencedContractNumber, setReferencedContractNumber] = useState(
    defaultDocumentNumber
  );
  const [loading, setLoading] = useState(false);

  // ZO-3 states
  const [office, setOffice] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [activityCode, setActivityCode] = useState("");
  const [activityName, setActivityName] = useState("");
  const [changeType, setChangeType] = useState("01");
  const [changeDate, setChangeDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [familyMembers, setFamilyMembers] = useState<Array<{ id: number; jmbg: string; fullName: string; relationship: string }>>([]);

  const selected = allTemplates.find((t) => t.id === templateId);
  const showUgovorFields = isUgovorTemplate(templateId);
  const showPeriodFields = isPeriodTemplate(templateId);
  const showOtkazFields = isOtkazTemplate(templateId);
  const showSporazumniFields = isSporazumniTemplate(templateId);

  function buildPayload() {
    return {
      employeeId,
      templateId,
      documentNumber: documentNumber || undefined,
      documentDate,
      documentPlace: documentPlace || undefined,
      representative: representative || undefined,
      reason: reason || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      extraNote: extraNote || undefined,
      jobDescription: jobDescription || undefined,
      workLocation: workLocation || undefined,
      paymentDay: paymentDay || undefined,
      annualLeaveDays: annualLeaveDays || undefined,
      fullTime: String(fullTime),
      severancePay: severancePay || undefined,
      terminationNotice: terminationNotice || undefined,
      durationDays: durationDays || undefined,
      contractSignedDate: contractSignedDate || undefined,
      annualLeaveUsage,
      handoverItems: handoverItems || undefined,
      referencedContractNumber: referencedContractNumber || undefined,
      office: office || undefined,
      regNumber: regNumber || undefined,
      activityCode: activityCode || undefined,
      activityName: activityName || undefined,
      changeType: changeType || undefined,
      changeDate: changeDate || undefined,
      endDate: endDate || undefined,
      membersJson: familyMembers.length > 0 ? JSON.stringify(familyMembers.map(m => ({ jmbg: m.jmbg, fullName: m.fullName, relationship: m.relationship }))) : undefined,
    };
  }

  async function refreshDocumentNumber() {
    setNumberLoading(true);
    try {
      const res = await getNextDocumentNumber(templateId, documentDate);
      if (!("error" in res)) {
        setDocumentNumber(res.documentNumber);
      }
    } finally {
      setNumberLoading(false);
    }
  }

  useEffect(() => {
    refreshDocumentNumber();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, documentDate]);

  function buildQuery(inline = false): string {
    const params = new URLSearchParams({
      employeeId,
      templateId,
    });
    if (documentNumber) params.set("documentNumber", documentNumber);
    if (documentDate) params.set("documentDate", documentDate);
    if (documentPlace) params.set("documentPlace", documentPlace);
    if (representative) params.set("representative", representative);
    if (reason) params.set("reason", reason);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (extraNote) params.set("extraNote", extraNote);
    if (jobDescription) params.set("jobDescription", jobDescription);
    if (workLocation) params.set("workLocation", workLocation);
    if (paymentDay) params.set("paymentDay", paymentDay);
    if (annualLeaveDays) params.set("annualLeaveDays", annualLeaveDays);
    params.set("fullTime", String(fullTime));
    if (severancePay) params.set("severancePay", severancePay);
    if (terminationNotice) params.set("terminationNotice", terminationNotice);
    if (durationDays) params.set("durationDays", durationDays);
    if (contractSignedDate) params.set("contractSignedDate", contractSignedDate);
    params.set("annualLeaveUsage", annualLeaveUsage);
    if (handoverItems) params.set("handoverItems", handoverItems);
    if (referencedContractNumber) {
      params.set("referencedContractNumber", referencedContractNumber);
    }
    if (templateId === "zo3") {
      if (office) params.set("office", office);
      if (regNumber) params.set("regNumber", regNumber);
      if (activityCode) params.set("activityCode", activityCode);
      if (activityName) params.set("activityName", activityName);
      if (changeType) params.set("changeType", changeType);
      if (changeDate) params.set("changeDate", changeDate);
      if (endDate) params.set("endDate", endDate);
      if (familyMembers.length > 0) {
        params.set("membersJson", JSON.stringify(familyMembers.map(m => ({ jmbg: m.jmbg, fullName: m.fullName, relationship: m.relationship }))));
      }
    }
    if (inline) params.set("inline", "1");
    return params.toString();
  }

  async function downloadPdf() {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/radnik-dokument?${buildQuery()}`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selected.id}-${employeeName.replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Greška pri preuzimanju.");
    } finally {
      setLoading(false);
    }
  }

  async function saveAndDownload() {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch("/api/documents/radnik-dokument", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const savedNumber = res.headers.get("X-Document-Number");
      a.download = `${selected.id}-${savedNumber ?? employeeName.replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      onDocumentSaved?.();
      await refreshDocumentNumber();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Greška pri spremanju.");
    } finally {
      setLoading(false);
    }
  }

  function openPdfPreview() {
    if (!selected) return;
    window.open(
      `/api/documents/radnik-dokument?${buildQuery(true)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <FormSection
      title="Ugovori i rješenja"
      description="Generišite PDF dokumente na osnovu službenog sadržaja. Podaci radnika i poslodavca se automatski uključuju."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Vrsta dokumenta</Label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Odaberite predložak..." />
            </SelectTrigger>
            <SelectContent>
              {groups.map((group) => (
                <SelectGroup key={group.category}>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.templates.map((tpl: ContractTemplate) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {tpl.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Broj dokumenta</Label>
          <div className="flex gap-2">
            <Input
              className="h-9 text-sm font-mono flex-1"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder={numberLoading ? "..." : "01/2026"}
              disabled={numberLoading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 px-2"
              onClick={refreshDocumentNumber}
              disabled={numberLoading || loading}
              title="Sljedeći slobodan broj"
            >
              <RefreshCw className={`h-4 w-4 ${numberLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Automatski: redni broj po vrsti dokumenta i godini (npr. GO-01/2026).
          </p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Datum dokumenta</Label>
          <Input
            className="h-9 text-sm"
            type="date"
            value={documentDate}
            onChange={(e) => setDocumentDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Mjesto</Label>
          <Input
            className="h-9 text-sm"
            value={documentPlace}
            onChange={(e) => setDocumentPlace(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Zastupnik poslodavca</Label>
          <Input
            className="h-9 text-sm"
            value={representative}
            onChange={(e) => setRepresentative(e.target.value)}
            placeholder="Ime i prezime"
          />
        </div>

        {showUgovorFields ? (
          <>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">
                Opis poslova (svaki red = stavka u članu 2.)
              </Label>
              <Textarea
                className="text-sm min-h-[72px]"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="npr. prodaja i nalog robe u prodajnom objektu..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Mjesto rada</Label>
              <Input
                className="h-9 text-sm"
                value={workLocation}
                onChange={(e) => setWorkLocation(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Isplata do (u mjesecu)</Label>
              <Input
                className="h-9 text-sm"
                value={paymentDay}
                onChange={(e) => setPaymentDay(e.target.value)}
                placeholder="15."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Godišnji odmor (dana)</Label>
              <Input
                className="h-9 text-sm"
                type="number"
                min={20}
                value={annualLeaveDays}
                onChange={(e) => setAnnualLeaveDays(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2 pt-1">
              <Checkbox
                id="fullTime"
                checked={fullTime}
                onCheckedChange={(v) => setFullTime(v === true)}
              />
              <Label htmlFor="fullTime" className="text-sm font-normal cursor-pointer">
                Puno radno vrijeme (inače se koristi sati/dan iz profila radnika)
              </Label>
            </div>
          </>
        ) : null}

        {!showUgovorFields && !showSporazumniFields && templateId !== "zo3" ? (
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Obrazloženje</Label>
            <Textarea
              className="text-sm min-h-[72px]"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Razlog za rješenje..."
            />
          </div>
        ) : null}

        {showSporazumniFields ? (
          <>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">
                Broj ugovora o radu (referenca u tački I)
              </Label>
              <Input
                className="h-9 text-sm font-mono"
                value={referencedContractNumber}
                onChange={(e) => setReferencedContractNumber(e.target.value)}
                placeholder="UR-01/2026"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Datum zaključenja ugovora o radu
              </Label>
              <Input
                className="h-9 text-sm"
                type="date"
                value={contractSignedDate}
                onChange={(e) => setContractSignedDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Datum prestanka radnog odnosa
              </Label>
              <Input
                className="h-9 text-sm"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Godišnji odmor</Label>
              <Select
                value={annualLeaveUsage}
                onValueChange={(v) => setAnnualLeaveUsage(v as "full" | "remaining")}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Cijeli godišnji odmor</SelectItem>
                  <SelectItem value="remaining">Preostali dio godišnjeg odmora</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Otpremnina (opciono)</Label>
              <Input
                className="h-9 text-sm"
                value={severancePay}
                onChange={(e) => setSeverancePay(e.target.value)}
                placeholder="npr. 1.500,00 KM"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">
                Predaja dužnosti / razduženje (tačka III, opciono)
              </Label>
              <Textarea
                className="text-sm min-h-[56px]"
                value={handoverItems}
                onChange={(e) => setHandoverItems(e.target.value)}
                placeholder="imovinu, sredstva rada, zaštitna oprema, spise..."
              />
            </div>
          </>
        ) : null}

        {showPeriodFields ? (
          <>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Period od</Label>
              <Input
                className="h-9 text-sm"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Period do</Label>
              <Input
                className="h-9 text-sm"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            {templateId.includes("odmor") ? (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Trajanje (radnih dana)</Label>
                <Input
                  className="h-9 text-sm"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  placeholder="npr. 20"
                />
              </div>
            ) : null}
          </>
        ) : null}

        {showOtkazFields ? (
          <>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Otkazni rok</Label>
              <Input
                className="h-9 text-sm"
                value={terminationNotice}
                onChange={(e) => setTerminationNotice(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Datum prestanka rada</Label>
              <Input
                className="h-9 text-sm"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Otpremnina (opciono)</Label>
              <Input
                className="h-9 text-sm"
                value={severancePay}
                onChange={(e) => setSeverancePay(e.target.value)}
                placeholder="npr. 1.500,00 KM"
              />
            </div>
          </>
        ) : null}

        {templateId === "zo3" ? (
          <>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Poslovnica / Područni ured</Label>
              <Input
                className="h-9 text-sm"
                value={office}
                onChange={(e) => setOffice(e.target.value)}
                placeholder="npr. Novo Sarajevo"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Registarski broj obveznika</Label>
              <Input
                className="h-9 text-sm"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Šifra djelatnosti poslodavca</Label>
              <Input
                className="h-9 text-sm"
                value={activityCode}
                onChange={(e) => setActivityCode(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Naziv djelatnosti poslodavca</Label>
              <Input
                className="h-9 text-sm"
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Vrsta promjene</Label>
              <Select value={changeType} onValueChange={setChangeType}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="01">01 — Prijava</SelectItem>
                  <SelectItem value="02">02 — Promjena</SelectItem>
                  <SelectItem value="03">03 — Odjava</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Datum promjene</Label>
              <Input
                className="h-9 text-sm"
                type="date"
                value={changeDate}
                onChange={(e) => setChangeDate(e.target.value)}
              />
            </div>
            {changeType === "03" ? (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Datum prestanka rada</Label>
                <Input
                  className="h-9 text-sm"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            ) : null}

            {/* Članovi porodice */}
            <div className="col-span-2 pt-2 border-t">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-semibold">Članovi porodice (opciono, max 10)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    if (familyMembers.length < 10) {
                      setFamilyMembers(prev => [...prev, { id: Date.now(), jmbg: "", fullName: "", relationship: "" }]);
                    }
                  }}
                >
                  + Dodaj člana
                </Button>
              </div>
              
              {familyMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground italic mb-2">Nema dodanih članova porodice.</p>
              ) : (
                <div className="space-y-3">
                  {familyMembers.map((m) => (
                    <div key={m.id} className="flex gap-2 items-end border p-2 rounded-md bg-muted/20">
                      <div className="flex-1 space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Ime i prezime</Label>
                        <Input
                          className="h-7 text-xs"
                          value={m.fullName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFamilyMembers(prev => prev.map(x => x.id === m.id ? { ...x, fullName: val } : x));
                          }}
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-[10px] text-muted-foreground">JMBG</Label>
                        <Input
                          className="h-7 text-xs"
                          value={m.jmbg}
                          maxLength={13}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFamilyMembers(prev => prev.map(x => x.id === m.id ? { ...x, jmbg: val } : x));
                          }}
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Srodstvo</Label>
                        <Input
                          className="h-7 text-xs"
                          value={m.relationship}
                          placeholder="npr. supružnik, dijete"
                          onChange={(e) => {
                            const val = e.target.value;
                            setFamilyMembers(prev => prev.map(x => x.id === m.id ? { ...x, relationship: val } : x));
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setFamilyMembers(prev => prev.filter(x => x.id !== m.id));
                        }}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}

        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Napomena (opciono)</Label>
          <Textarea
            className="text-sm min-h-[56px]"
            value={extraNote}
            onChange={(e) => setExtraNote(e.target.value)}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground pt-2">
        Vrsta ugovora (određeno/neodređeno), probni rad, plata, datum zaposlenja i ostali
        podaci učitavaju se iz profila radnika. Za ugovor o radu možete dopuniti opis
        poslova i mjesto rada prije generisanja.
      </p>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          onClick={saveAndDownload}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Spremi i preuzmi
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={downloadPdf}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Preuzmi PDF (bez spremanja)
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={openPdfPreview}
          disabled={loading}
        >
          <FileText className="h-4 w-4" />
          Pregled / štampaj
        </Button>
      </div>
    </FormSection>
  );
}

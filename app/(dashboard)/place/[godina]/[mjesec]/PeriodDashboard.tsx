"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { formatKM } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  Copy,
  Check,
  Users,
  CreditCard,
  Building,
  TrendingUp,
  FileCheck,
  Receipt,
  HelpCircle,
} from "lucide-react";

interface PeriodDashboardProps {
  items: any[];
  totals: {
    gross: number;
    net: number;
    tax: number;
    contribFrom: number;
    meal: number;
    transport: number;
    other: number;
    totalPayout: number;
    cost: number;
  };
  vouchers: any[];
  org: {
    id: string;
    name: string;
    type: string;
  };
  year: number;
  month: number;
  periodId: string | null;
  status: string | null;
  partialEmployees: any[];
}

const MONTH_NAMES = [
  "", "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

export default function PeriodDashboard({
  items,
  totals,
  vouchers,
  org,
  year,
  month,
  periodId,
  status,
  partialEmployees,
}: PeriodDashboardProps) {
  const [activeTab, setActiveTab] = useState<"zaposlenici" | "virmani" | "dokumenti">("zaposlenici");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isDraft = status === "DRAFT" || !status;
  const totalVouchersSum = vouchers.reduce((sum, v) => sum + v.amount, 0);

  return (
    <div className="space-y-6">
      {/* Gornji statusni panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-muted-foreground">
            <Building className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-sm text-foreground">{org.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted uppercase tracking-wider text-muted-foreground">
                {org.type === "doo" ? "D.O.O." : "Obrt"}
              </span>
              <span className="text-xs text-muted-foreground">· Period: {MONTH_NAMES[month]} {year}.</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Status obračuna:</span>
          {isDraft ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground border">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" />
              Nacrt
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-foreground text-background">
              <FileCheck className="w-3.5 h-3.5" />
              Potvrđen
            </span>
          )}
        </div>
      </div>

      {/* Djelimičan mjesec upozorenje */}
      {partialEmployees.length > 0 && (
        <div className="p-4 rounded-xl bg-muted/30 border text-foreground shadow-sm">
          <div className="flex items-center gap-2 font-semibold mb-1.5 text-sm">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <span>Djelimičan mjesec, provjerite bruto plate</span>
          </div>
          {partialEmployees.map((pe, i) => (
            <p key={i} className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">{pe?.empName}</span> je prijavljen/a {pe?.hireDate ? new Date(pe.hireDate).toLocaleDateString('bs-BA') : ''}, aktivan/na je samo {pe?.activeDays} dana u mjesecu ({pe?.activeDays}/{pe?.totalDays}). Bruto plata je automatski srazmjerno obračunata.
            </p>
          ))}
        </div>
      )}

      {/* SaaS KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Bruto */}
        <div className="p-5 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bruto ukupno</span>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono mt-2 text-foreground">{formatKM(totals.gross)}</div>
          <p className="text-[10px] text-muted-foreground mt-1">Osnovica za doprinose</p>
        </div>

        {/* KPI 2: Neto za isplatu */}
        <div className="p-5 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Neto za isplatu</span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono mt-2 text-foreground">
            {formatKM(totals.net)}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Iznos nakon poreza i doprinosa</p>
        </div>

        {/* KPI 3: Naknade / Topli obrok */}
        <div className="p-5 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Topli obrok & dodaci</span>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono mt-2 text-foreground">{formatKM(totals.meal)}</div>
          <p className="text-[10px] text-muted-foreground mt-1">Neoporezive naknade radnicima</p>
        </div>

        {/* KPI 4: Ukupan trošak poslodavca */}
        <div className="p-5 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ukupan trošak</span>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono mt-2 text-foreground">{formatKM(totals.cost)}</div>
          <p className="text-[10px] text-muted-foreground mt-1">Bruto + doprinosi + naknade</p>
        </div>
      </div>

      {/* Tabovi navigacije */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab("zaposlenici")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all -mb-[2px] ${
            activeTab === "zaposlenici"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Radnici & Plate ({items.length})
        </button>
        <button
          onClick={() => setActiveTab("virmani")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all -mb-[2px] ${
            activeTab === "virmani"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Uplatnice & Isplate ({vouchers.length + items.length})
        </button>
        <button
          onClick={() => setActiveTab("dokumenti")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all -mb-[2px] ${
            activeTab === "dokumenti"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Obrasci & Dokumenti
        </button>
      </div>

      {/* Sadržaj tabova */}
      <div className="space-y-6">
        {/* TAB 1: RADNICI & PLATE */}
        {activeTab === "zaposlenici" && (
          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="py-3 text-muted-foreground">Radnik</TableHead>
                  <TableHead className="text-right py-3 text-muted-foreground">Bruto plata</TableHead>
                  <TableHead className="text-right py-3 text-muted-foreground">Doprinosi IZ (31%)</TableHead>
                  <TableHead className="text-right py-3 text-muted-foreground">Porez (10%)</TableHead>
                  <TableHead className="text-right py-3 font-semibold text-foreground">Neto plata</TableHead>
                  <TableHead className="text-right py-3 text-muted-foreground">Ukupan trošak</TableHead>
                  <TableHead className="text-right py-3 w-32 text-muted-foreground">Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const emp = Array.isArray(item.employee) ? item.employee[0] : item.employee;
                  return (
                    <TableRow key={item.id} className="hover:bg-muted/10 transition-colors">
                      <TableCell className="py-3">
                        <div className="font-semibold text-sm text-foreground">{emp ? `${emp.last_name} ${emp.first_name}` : "—"}</div>
                        {emp?.occupation_name && (
                          <div className="text-[11px] text-muted-foreground font-medium">{emp.occupation_name}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm py-3 text-foreground">
                        {formatKM(item.gross_salary ?? 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs py-3 text-muted-foreground">
                        {formatKM(item.total_contributions_from ?? 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs py-3 text-muted-foreground">
                        {formatKM(item.income_tax ?? 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm py-3 font-semibold text-foreground">
                        {formatKM(item.net_salary ?? 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm py-3 text-foreground">
                        {formatKM(item.total_employer_cost ?? 0)}
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <div className="flex items-center justify-end gap-3">
                          <Button asChild variant="outline" size="sm" className="h-7 px-2 text-xs">
                            <Link href={`/place/${year}/${month}/${emp?.id}`}>Uredi</Link>
                          </Button>
                          <a
                            href={`/api/pdf/platni-listic?id=${item.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline whitespace-nowrap"
                          >
                            <FileText className="h-3 w-3" />
                            Platna lista
                          </a>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="font-bold bg-muted/30 border-t-2">
                  <TableCell className="py-4 text-foreground">UKUPNO ({items.length})</TableCell>
                  <TableCell className="text-right font-mono py-4 text-foreground">{formatKM(totals.gross)}</TableCell>
                  <TableCell className="text-right font-mono py-4 text-muted-foreground">{formatKM(totals.contribFrom)}</TableCell>
                  <TableCell className="text-right font-mono py-4 text-muted-foreground">{formatKM(totals.tax)}</TableCell>
                  <TableCell className="text-right font-mono py-4 text-foreground">{formatKM(totals.net)}</TableCell>
                  <TableCell className="text-right font-mono py-4 text-foreground">{formatKM(totals.cost)}</TableCell>
                  <TableCell className="py-4" />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        {/* TAB 2: VIRMANI & ISPLATE */}
        {activeTab === "virmani" && (
          <div className="space-y-8">
            {/* Sekcija 1: Javni prihodi */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-foreground">Zbirni nalozi za javne prihode</h3>
                  <p className="text-xs text-muted-foreground">Porezi i doprinosi koji se plaćaju na zbirne račune</p>
                </div>
                <div className="px-3 py-1.5 bg-muted rounded-lg font-bold font-mono text-sm border text-foreground">
                  Zbir: {formatKM(totalVouchersSum)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vouchers.map((v, i) => {
                  const voucherId = `voucher-${v.id || i}`;
                  return (
                    <div
                      key={voucherId}
                      className="relative overflow-hidden bg-card border rounded-xl shadow-sm hover:border-foreground/30 transition-colors flex flex-col"
                    >
                      {/* Header uplatnice */}
                      <div className="p-4 border-b flex items-start justify-between gap-3 bg-muted/10">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-muted text-[10px] font-bold text-muted-foreground border">
                              {i + 1}
                            </span>
                            <span className="font-bold text-sm tracking-tight text-foreground">{v.label}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">Nalog za uplatu</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-base text-foreground block">{formatKM(v.amount)}</span>
                        </div>
                      </div>

                      {/* Detalji uplatnice */}
                      <div className="p-4 space-y-2.5 text-xs flex-grow font-mono">
                        <div>
                          <span className="font-sans text-[10px] font-semibold text-muted-foreground uppercase block mb-0.5">Račun primaoca</span>
                          <div className="flex items-center justify-between p-1.5 bg-muted/40 rounded border font-bold text-[13px] tracking-wide text-foreground">
                            <span>{v.account}</span>
                            <button
                              onClick={() => handleCopy(v.account, `${voucherId}-acc`)}
                              className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-muted transition-all"
                              title="Kopiraj žiro-račun"
                            >
                              {copiedId === `${voucherId}-acc` ? (
                                <Check className="h-3.5 w-3.5 text-foreground" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="font-sans text-[10px] font-semibold text-muted-foreground uppercase block mb-0.5">Vrsta prihoda</span>
                            <div className="font-bold p-1 bg-muted/20 rounded border border-dashed text-center text-foreground">{v.vrstaPrihoda}</div>
                          </div>
                          <div>
                            <span className="font-sans text-[10px] font-semibold text-muted-foreground uppercase block mb-0.5">Budžetska org.</span>
                            <div className="font-bold p-1 bg-muted/20 rounded border border-dashed text-center text-foreground">{v.budgetOrg || "0000000"}</div>
                          </div>
                        </div>

                        <div>
                          <span className="font-sans text-[10px] font-semibold text-muted-foreground uppercase block mb-0.5">Primalac</span>
                          <p className="text-foreground text-[11px] leading-relaxed bg-muted/10 p-1.5 rounded border border-dashed font-sans">
                            {v.primalac.filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sekcija 2: Neto uplate radnicima */}
            <div className="space-y-4 border-t pt-6">
              <div>
                <h3 className="text-base font-bold text-foreground">Uplate radnicima (Neto plate i topli obrok)</h3>
                <p className="text-xs text-muted-foreground">Pojedinačne isplate na tekuće račune radnika</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((it, idx) => {
                  const emp = Array.isArray(it.employee) ? it.employee[0] : it.employee;
                  const empName = emp ? `${emp.first_name} ${emp.last_name}` : "Radnik";
                  const bankAcc = emp?.bank_account || "";
                  const bankName = emp?.bank_name || "Nije unesena banka";
                  const payoutId = `payout-${it.id || idx}`;
                  const payoutAmount = it.total_payment ?? it.net_salary;

                  return (
                    <div
                      key={payoutId}
                      className="bg-card border rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-foreground/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="font-bold text-sm text-foreground">{empName}</div>
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">Neto plata + naknade</span>
                        </div>
                        <span className="font-mono font-bold text-base text-foreground">
                          {formatKM(payoutAmount)}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs font-mono">
                        <div>
                          <span className="font-sans text-[10px] font-semibold text-muted-foreground uppercase block mb-0.5">Tekući račun radnika</span>
                          {bankAcc ? (
                            <div className="flex items-center justify-between p-1.5 bg-muted/40 rounded border font-bold text-[12px] tracking-wide text-foreground">
                              <span>{bankAcc}</span>
                              <button
                                onClick={() => handleCopy(bankAcc, `${payoutId}-acc`)}
                                className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-muted transition-all"
                                title="Kopiraj račun radnika"
                              >
                                {copiedId === `${payoutId}-acc` ? (
                                  <Check className="h-3.5 w-3.5 text-foreground" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <div className="p-1.5 bg-muted text-muted-foreground text-[11px] rounded border border-dashed font-sans">
                              Nije unesen broj računa radnika
                            </div>
                          )}
                        </div>

                        {bankAcc && (
                          <div className="text-[10px] text-muted-foreground font-sans">
                            Banka: <span className="font-semibold text-foreground">{bankName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DOKUMENTI & OBRASCI */}
        {activeTab === "dokumenti" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Kolona 1: Banka i interne potrebe */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-2 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Interni dokumenti i isplate
              </h3>

              <div className="space-y-3">
                {/* 1. Platne liste */}
                <div className="p-4 rounded-xl border bg-card shadow-sm flex items-start gap-4 hover:shadow transition-shadow">
                  <div className="p-3 rounded-xl bg-muted text-muted-foreground">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="space-y-1.5 flex-grow">
                    <div className="font-bold text-sm text-foreground">Platne liste (Svi radnici)</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Zajednički PDF sa spojenim pojedinačnim platnim listama za sve zaposlenike. Podijeliti radnicima.
                    </p>
                    <Button asChild size="sm" variant="outline" className="h-8 gap-2 text-xs">
                      <a href={`/api/pdf/platni-listic?periodId=${periodId}`} target="_blank" rel="noreferrer">
                        <Download className="h-3.5 w-3.5" />
                        Preuzmi PDF
                      </a>
                    </Button>
                  </div>
                </div>

                {/* 2. Zbirne uplatnice */}
                <div className="p-4 rounded-xl border bg-card shadow-sm flex items-start gap-4 hover:shadow transition-shadow">
                  <div className="p-3 rounded-xl bg-muted text-muted-foreground">
                    <Download className="h-5 w-5" />
                  </div>
                  <div className="space-y-1.5 flex-grow">
                    <div className="font-bold text-sm text-foreground">Uplatnice za banku (PDF)</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Generiše popunjene uplatnice (virmane) spremne za štampu na papiru i uplatu na šalteru banke.
                    </p>
                    <Button asChild size="sm" variant="outline" className="h-8 gap-2 text-xs">
                      <a href={`/api/pdf/uplatnice?periodId=${periodId}`} target="_blank" rel="noreferrer">
                        <Download className="h-3.5 w-3.5" />
                        Preuzmi PDF
                      </a>
                    </Button>
                  </div>
                </div>

                {/* 3. Nalog za knjiženje */}
                <div className="p-4 rounded-xl border bg-card shadow-sm flex items-start gap-4 hover:shadow transition-shadow">
                  <div className="p-3 rounded-xl bg-muted text-muted-foreground">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div className="space-y-1.5 flex-grow">
                    <div className="font-bold text-sm text-foreground">Nalog za knjiženje (PDF)</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Specifikacija i rekapitulacija knjiženja troškova plata i doprinosa za potrebe računovodstva.
                    </p>
                    <Button asChild size="sm" variant="outline" className="h-8 gap-2 text-xs">
                      <a href={`/api/pdf/nalog-knjizenje?periodId=${periodId}`} target="_blank" rel="noreferrer">
                        <Download className="h-3.5 w-3.5" />
                        Preuzmi PDF
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Kolona 2: Porezna Uprava */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-2 flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                Porezna uprava (PUFBiH)
              </h3>

              <div className="space-y-3">
                {/* 1. Obrazac 2001 */}
                <div className="p-4 rounded-xl border bg-card shadow-sm flex items-start gap-4 hover:shadow transition-shadow">
                  <div className="p-3 rounded-xl bg-muted text-muted-foreground">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="space-y-1.5 flex-grow">
                    <div className="font-bold text-sm text-foreground">Obrazac 2001 (Specifikacija)</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Specifikacija uz isplatu plata. Podnosi se Poreznoj upravi na dan isplate plata.
                    </p>
                    <Button asChild size="sm" variant="outline" className="h-8 gap-2 text-xs">
                      <a href={`/api/pdf/obrazac-2001?periodId=${periodId}`} target="_blank" rel="noreferrer">
                        <Download className="h-3.5 w-3.5" />
                        Preuzmi PDF
                      </a>
                    </Button>
                  </div>
                </div>

                {/* 2. MIP-1023 */}
                <div className="p-4 rounded-xl border bg-card shadow-sm flex items-start gap-4 hover:shadow transition-shadow">
                  <div className="p-3 rounded-xl bg-muted text-muted-foreground">
                    <Download className="h-5 w-5" />
                  </div>
                  <div className="space-y-1.5 flex-grow">
                    <div className="font-bold text-sm text-foreground">MIP-1023 (Mesečni izvještaj)</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Mesečni izvještaj o isplaćenim platama, ostvarenim koristima i uplaćenim doprinosima.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" variant="outline" className="h-8 gap-2 text-xs">
                        <a href={`/api/pdf/mip-1023?periodId=${periodId}`} target="_blank" rel="noreferrer">
                          <Download className="h-3.5 w-3.5" />
                          MIP PDF
                        </a>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-8 gap-2 text-xs">
                        <a href={`/api/xml/mip-1023?periodId=${periodId}`} target="_blank" rel="noreferrer">
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                          MIP XML
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 3. GIP-1022 */}
                <div className="p-4 rounded-xl border bg-card shadow-sm flex items-start gap-4 hover:shadow transition-shadow">
                  <div className="p-3 rounded-xl bg-muted text-muted-foreground">
                    <Download className="h-5 w-5" />
                  </div>
                  <div className="space-y-1.5 flex-grow">
                    <div className="font-bold text-sm text-foreground">GIP-1022 (Godišnji izvještaj)</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Godišnji izvještaj o isplaćenim platama i uplaćenim doprinosima radnika.
                    </p>
                    <Button asChild size="sm" variant="outline" className="h-8 gap-2 text-xs">
                      <a href={`/api/pdf/gip-1022?periodId=${periodId}`} target="_blank" rel="noreferrer">
                        <Download className="h-3.5 w-3.5" />
                        Preuzmi PDF
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatKM, formatDate } from "@/lib/utils";
import { requireOrgFeature } from "@/lib/organization/server";
import { monthName } from "@/lib/pdv/period";
import { documentTypeLabel } from "@/lib/pdv/constants";
import { toLedgerEntry } from "@/lib/pdv/row";
import { hasFeature } from "@/lib/organization/regime";
import PeriodActions from "./PeriodActions";
import PostToGlButton from "./PostToGlButton";

export default async function PdvPeriodPage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  const { year: yearStr, month: monthStr } = await params;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    notFound();
  }

  const { supabase, org } = await requireOrgFeature("pdv");

  const [{ data: rawEntries }, { data: periodRow }] = await Promise.all([
    supabase
      .from("pdv_ledger_entries")
      .select("*")
      .eq("organization_id", org.id)
      .eq("period_year", year)
      .eq("period_month", month)
      .order("record_type", { ascending: true })
      .order("serial_number", { ascending: true }),
    supabase
      .from("pdv_periods")
      .select("status")
      .eq("organization_id", org.id)
      .eq("year", year)
      .eq("month", month)
      .maybeSingle(),
  ]);

  const entries = (rawEntries ?? []).map((r) => toLedgerEntry(r as Record<string, unknown>));
  const kif = entries.filter((e) => e.record_type === "kif");
  const kuf = entries.filter((e) => e.record_type === "kuf");
  const isLocked = periodRow?.status === "locked" || periodRow?.status === "submitted";

  const kifVat = kif.reduce((s, e) => s + e.kif_vat_registered + e.kif_vat_unregistered, 0);
  const kufDeductible = kuf.reduce((s, e) => s + e.kuf_vat_deductible, 0);
  const liability = kifVat - kufDeductible;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`PDV — ${monthName(month)} ${year}`}
        description={org.name}
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/pdv">Svi periodi</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/pdv/${year}/${month}/prijava`}>PDV prijava</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/pdv/${year}/${month}/export`}>Export e-Porezi</Link>
        </Button>
        {hasFeature(org.type, "general_ledger") && (
          <PostToGlButton year={year} month={month} />
        )}
        <PeriodActions year={year} month={month} isLocked={isLocked} />
      </PageHeader>

      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-md p-4">
          <p className="text-xs text-muted-foreground">Izlazni PDV (KIF)</p>
          <p className="text-xl font-bold mt-1 font-mono">{formatKM(kifVat)}</p>
        </div>
        <div className="border rounded-md p-4">
          <p className="text-xs text-muted-foreground">Odbitni ulazni PDV (KUF)</p>
          <p className="text-xl font-bold mt-1 font-mono">{formatKM(kufDeductible)}</p>
        </div>
        <div className="border rounded-md p-4">
          <p className="text-xs text-muted-foreground">Obaveza prema UIO</p>
          <p
            className={`text-xl font-bold mt-1 font-mono ${
              liability > 0 ? "text-destructive" : "text-emerald-600"
            }`}
          >
            {formatKM(liability)}
          </p>
        </div>
      </div>

      {isLocked && (
        <div className="rounded-lg border border-secondary bg-muted/40 px-4 py-2 text-sm">
          Period je zaključan — stavke se ne mogu mijenjati.
        </div>
      )}

      {/* KIF */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold flex items-center gap-2">
            e-KIF <Badge>Isporuke</Badge>
            <span className="text-sm text-muted-foreground font-normal">
              {kif.length} {kif.length === 1 ? "stavka" : "stavki"}
            </span>
          </h2>
          {!isLocked && (
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href={`/pdv/${year}/${month}/kif/zbirno`}>+ Maloprodaja</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/pdv/${year}/${month}/kif/novi`}>+ Ručni KIF</Link>
              </Button>
            </div>
          )}
        </div>
        {kif.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Rb.</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Dokument</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Kupac</TableHead>
                  <TableHead className="text-right">Ukupno</TableHead>
                  <TableHead className="text-right">Osnovica</TableHead>
                  <TableHead className="text-right">PDV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kif.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-sm">{e.serial_number}</TableCell>
                    <TableCell className="text-xs">
                      {documentTypeLabel("kif", e.uio_document_type)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{e.document_number}</TableCell>
                    <TableCell className="text-sm">{formatDate(e.document_date)}</TableCell>
                    <TableCell className="text-sm">{e.partner_name}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatKM(e.kif_amount_total)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatKM(e.kif_base_registered + e.kif_base_unregistered)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatKM(e.kif_vat_registered + e.kif_vat_unregistered)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground border border-dashed rounded-md p-6 text-center">
            Nema KIF stavki. Izlazne fakture se automatski upisuju kad ih izdate.
          </p>
        )}
      </section>

      {/* KUF */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold flex items-center gap-2">
            e-KUF <Badge variant="secondary">Nabavke</Badge>
            <span className="text-sm text-muted-foreground font-normal">
              {kuf.length} {kuf.length === 1 ? "stavka" : "stavki"}
            </span>
          </h2>
          {!isLocked && (
            <Button asChild size="sm">
              <Link href={`/pdv/${year}/${month}/kuf/novi`}>+ Ulazni račun</Link>
            </Button>
          )}
        </div>
        {kuf.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Rb.</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Dokument</TableHead>
                  <TableHead>Prijem</TableHead>
                  <TableHead>Dobavljač</TableHead>
                  <TableHead className="text-right">Sa PDV</TableHead>
                  <TableHead className="text-right">Ulazni PDV</TableHead>
                  <TableHead className="text-right">Odbitni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kuf.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-sm">{e.serial_number}</TableCell>
                    <TableCell className="text-xs">
                      {documentTypeLabel("kuf", e.uio_document_type)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{e.document_number}</TableCell>
                    <TableCell className="text-sm">{formatDate(e.receipt_date)}</TableCell>
                    <TableCell className="text-sm">{e.partner_name}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatKM(e.kuf_amount_with_vat)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatKM(e.kuf_vat_input_total)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatKM(e.kuf_vat_deductible)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground border border-dashed rounded-md p-6 text-center">
            Nema KUF stavki. Dodajte ulazne račune dobavljača.
          </p>
        )}
      </section>
    </div>
  );
}

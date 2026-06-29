import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
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
import PageHeader from "@/components/shared/page-header";
import FormSection from "@/components/shared/form-section";
import { formatKM, formatDate } from "@/lib/utils";
import InvoiceStatusActions from "./InvoiceStatusActions";
import { ArrowLeft } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft:     { label: "Nacrt",     variant: "outline" },
  open:      { label: "Izdana",    variant: "secondary" },
  paid:      { label: "Plaćena",   variant: "default" },
  cancelled: { label: "Otkazana",  variant: "destructive" },
  overdue:   { label: "Dospijela", variant: "destructive" },
};

const TYPE_MAP: Record<string, string> = {
  invoice:     "FAKTURA",
  proforma:    "PREDRAČUN",
  credit_note: "KREDITNA NOTA",
};

export default async function FakturaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, address, city, tax_id, vat_number")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!org) redirect("/nova-djelatnost");

  const { data: invoice } = await supabase
    .from("invoices")
    .select(`
      *,
      partner:partner_id (name, address, city, tax_id, vat_number),
      items:invoice_items (*)
    `)
    .eq("id", id)
    .eq("organization_id", org.id)
    .single();

  if (!invoice) notFound();

  const st = STATUS_MAP[invoice.status] ?? STATUS_MAP.draft;
  const partner = Array.isArray(invoice.partner) ? invoice.partner[0] : invoice.partner;
  const items = (invoice.items ?? []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
  );

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <PageHeader
        title={`${TYPE_MAP[invoice.type] ?? "FAKTURA"} ${invoice.invoice_number ?? ""}`}
        description={org.name}
      >
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/fakture">
            <ArrowLeft className="h-4 w-4" />
            Nazad na fakture
          </Link>
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-8">
      <FormSection title="Status i akcije">
      <div className="flex items-center gap-3">
        <Badge variant={st.variant}>{st.label}</Badge>
        <InvoiceStatusActions invoiceId={invoice.id} currentStatus={invoice.status} />
        <Button asChild variant="outline" size="sm">
          <a href={`/api/pdf/faktura?id=${invoice.id}`} target="_blank" rel="noreferrer">
            PDF
          </a>
        </Button>
      </div>
      </FormSection>

      <FormSection title="Pregled dokumenta">
      <div className="border rounded-lg p-6 space-y-6 bg-white">
        {/* Header */}
        <div className="flex justify-between">
          <div>
            <h2 className="font-bold text-lg">{org.name}</h2>
            {org.address && <p className="text-sm text-muted-foreground">{org.address}</p>}
            {org.city && <p className="text-sm text-muted-foreground">{org.city}</p>}
            {org.tax_id && <p className="text-sm text-muted-foreground">JIB: {org.tax_id}</p>}
            {org.vat_number && <p className="text-sm text-muted-foreground">PDV: {org.vat_number}</p>}
          </div>
          <div className="text-right">
            <h1 className="font-bold text-xl">{TYPE_MAP[invoice.type] ?? "FAKTURA"}</h1>
            <p className="font-mono text-sm">{invoice.invoice_number}</p>
            <p className="text-sm text-muted-foreground">Datum: {formatDate(invoice.issue_date)}</p>
            {invoice.due_date && (
              <p className="text-sm text-muted-foreground">Dospijeće: {formatDate(invoice.due_date)}</p>
            )}
          </div>
        </div>

        {/* Partner */}
        {partner && (
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground mb-1">KUPAC / NARUČILAC</p>
            <p className="font-medium">{partner.name}</p>
            {partner.address && <p className="text-sm">{partner.address}</p>}
            {partner.city && <p className="text-sm">{partner.city}</p>}
            {partner.tax_id && <p className="text-sm text-muted-foreground">JIB: {partner.tax_id}</p>}
          </div>
        )}

        {/* Stavke */}
        <div className="border-t pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opis</TableHead>
                <TableHead className="text-right w-16">JM</TableHead>
                <TableHead className="text-right w-20">Kol.</TableHead>
                <TableHead className="text-right w-24">Cijena</TableHead>
                <TableHead className="text-right w-16">PDV%</TableHead>
                <TableHead className="text-right w-24">Ukupno</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: {
                id: string;
                description: string;
                unit: string | null;
                quantity: number;
                unit_price: number;
                discount: number;
                vat_rate: number;
                total: number;
              }) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.unit ?? ""}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{item.quantity}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatKM(item.unit_price)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{item.vat_rate}%</TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">{formatKM(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Totali */}
        <div className="border-t pt-4 flex justify-end">
          <table className="text-sm w-64">
            <tbody>
              <tr>
                <td className="py-0.5 text-muted-foreground">Osnova (17%):</td>
                <td className="py-0.5 text-right font-mono">{formatKM(invoice.vat_base_17)}</td>
              </tr>
              {invoice.vat_base_0 > 0 && (
                <tr>
                  <td className="py-0.5 text-muted-foreground">Osnova (0%):</td>
                  <td className="py-0.5 text-right font-mono">{formatKM(invoice.vat_base_0)}</td>
                </tr>
              )}
              <tr>
                <td className="py-0.5 text-muted-foreground">PDV (17%):</td>
                <td className="py-0.5 text-right font-mono">{formatKM(invoice.vat_amount_17)}</td>
              </tr>
              <tr className="font-bold border-t">
                <td className="py-1.5">UKUPNO ZA UPLATU:</td>
                <td className="py-1.5 text-right font-mono text-base">{formatKM(invoice.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Napomena */}
        {invoice.note && (
          <div className="border-t pt-3 text-sm text-muted-foreground">
            <strong>Napomena:</strong> {invoice.note}
          </div>
        )}
      </div>
      </FormSection>
      </div>
    </div>
  );
}

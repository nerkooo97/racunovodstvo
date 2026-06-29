import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import InvoiceForm from "@/components/forms/invoice-form";
import { ArrowLeft } from "lucide-react";

export default async function NovaFakturaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, vat_number, address, city, tax_id, phone, email, bank_account")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!org) redirect("/nova-djelatnost");

  const [{ data: partners }, { data: advanceInvoices }] = await Promise.all([
    supabase
      .from("partners")
      .select("id, name, address, city, tax_id")
      .eq("organization_id", org.id)
      .order("name", { ascending: true }),
    supabase
      .from("invoices")
      .select("id, invoice_number, total")
      .eq("organization_id", org.id)
      .eq("type", "advance")
      .in("status", ["open", "paid", "overdue"])
      .order("issue_date", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <PageHeader title="Nova faktura" description={org.name}>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/fakture">
            <ArrowLeft className="h-4 w-4" />
            Nazad na fakture
          </Link>
        </Button>
      </PageHeader>
      <InvoiceForm
        partners={partners ?? []}
        advanceInvoices={(advanceInvoices ?? []).map((a) => ({
          id: a.id,
          invoice_number: a.invoice_number ?? "",
          total: a.total ?? 0,
        }))}
        seller={{
          name:    org.name ?? "",
          address: org.address ?? "",
          city:    org.city ?? "",
          jib:     org.tax_id ?? "",
          vat_no:  org.vat_number ?? "",
          phone:   org.phone ?? "",
          email:   org.email ?? "",
          account: org.bank_account ?? "",
        }}
      />
    </div>
  );
}

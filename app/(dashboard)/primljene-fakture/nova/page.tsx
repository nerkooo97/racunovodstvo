import Link from "next/link";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/page-header";
import ReceivedInvoiceForm from "@/components/forms/received-invoice-form";
import { ArrowLeft } from "lucide-react";
import { requireOrgFeature } from "@/lib/organization/server";

export default async function PrimljeneFaktureNovaPage() {
  const { supabase, org } = await requireOrgFeature("received_invoices");

  const { data: partners } = await supabase
    .from("partners")
    .select("id, name, tax_id")
    .eq("organization_id", org.id)
    .order("name", { ascending: true });

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6">
      <PageHeader
        title="Nova primljena faktura"
        description={
          org.type === "doo"
            ? "Ulazni račun — automatsko knjiženje u Glavnu knjigu"
            : "Evidentiranje ulaznog računa od dobavljača"
        }
      >
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/primljene-fakture">
            <ArrowLeft className="h-4 w-4" />
            Nazad
          </Link>
        </Button>
      </PageHeader>

      <ReceivedInvoiceForm
        partners={partners ?? []}
        orgType={org.type}
        isVatRegistered={org.is_vat_registered}
      />
    </div>
  );
}

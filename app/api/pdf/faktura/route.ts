import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/supabase/get-active-org";
import { FakturaPdf } from "@/lib/pdf/faktura";

export async function handleFakturaPdf(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const invoiceId = searchParams.get("id");
  if (!invoiceId) return new NextResponse("Missing id", { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const activeOrgId = await getActiveOrgId(supabase, user.id);
  const { data: org } = activeOrgId
    ? await supabase.from("organizations").select("id, name, address, city, tax_id, vat_number").eq("id", activeOrgId).single()
    : { data: null };

  if (!org) return new NextResponse("No organization", { status: 404 });

  const { data: invoice } = await supabase
    .from("invoices")
    .select(`*, partner:partner_id(*), items:invoice_items(*)`)
    .eq("id", invoiceId)
    .eq("organization_id", org.id)
    .single();

  if (!invoice) return new NextResponse("Not found", { status: 404 });

  const partner = Array.isArray(invoice.partner) ? invoice.partner[0] : invoice.partner;
  const items   = (invoice.items ?? []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
  );

  const pdfData = {
    invoice_number:  invoice.invoice_number ?? "",
    type:            invoice.type,
    issue_date:      invoice.issue_date,
    due_date:        invoice.due_date,
    org_name:        org.name,
    org_address:     org.address,
    org_city:        org.city,
    org_tax_id:      org.tax_id,
    org_vat_number:  org.vat_number,
    partner_name:    partner?.name,
    partner_address: partner?.address,
    partner_city:    partner?.city,
    partner_tax_id:  partner?.tax_id,
    items,
    subtotal:        invoice.subtotal,
    vat_base_17:     invoice.vat_base_17,
    vat_amount_17:   invoice.vat_amount_17,
    vat_base_0:      invoice.vat_base_0,
    total:           invoice.total,
    note:            invoice.note,
  };

  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createElement(FakturaPdf, { data: pdfData }) as any
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `inline; filename="faktura-${invoice.invoice_number}.pdf"`,
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    return await handleFakturaPdf(req);
  } catch (err) {
    console.error("Faktura PDF error:", err);
    return new NextResponse("PDF generation failed", { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { getActiveYear } from "@/lib/year";
import { getActiveOrgId } from "@/lib/supabase/get-active-org";
import { Kpr1041Document, type Kpr1041Data, type Kpr1041Entry } from "@/lib/pdf/kpr-1041";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const year = parseInt(searchParams.get("godina") ?? "", 10) || (await getActiveYear());

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const orgId = await getActiveOrgId(supabase, user.id);
    if (!orgId) return new NextResponse("Organization not found", { status: 404 });

    // Fetch org details and KPR entries in parallel
    const [orgRes, kprRes] = await Promise.all([
      supabase
        .from("organizations")
        .select("name, tax_id, address, city, activity_code, activity_name")
        .eq("id", orgId)
        .single(),
      supabase
        .from("kpr_entries")
        .select("*")
        .eq("organization_id", orgId)
        .eq("year", year)
        .order("entry_number", { ascending: true }),
    ]);

    if (orgRes.error || !orgRes.data) {
      return new NextResponse("Organization data error", { status: 500 });
    }

    const org = orgRes.data;
    const entriesRaw = kprRes.data ?? [];

    const entries: Kpr1041Entry[] = entriesRaw.map((e) => ({
      entry_number: e.entry_number,
      entry_date: new Date(e.entry_date).toLocaleDateString("bs-BA"),
      document_type: e.document_type || "",
      document_number: e.document_number || "",
      partner_name: e.partner_name || "",
      description: e.description || "",
      
      income_cash: Number(e.income_cash || 0),
      income_bank: Number(e.income_bank || 0),
      income_other: Number(e.income_other || 0),
      income_vat: Number(e.income_vat || 0),
      income_total: Number(e.income_total || e.credit || 0),
      
      expense_goods: Number(e.expense_goods || 0),
      expense_salaries: Number(e.expense_salaries || 0),
      expense_contribs: Number(e.expense_contribs || 0),
      expense_other: Number(e.expense_other || 0),
      expense_vat: Number(e.expense_vat || 0),
      expense_total: Number(e.expense_total || e.debit || 0),
    }));

    const activity = [org.activity_code, org.activity_name].filter(Boolean).join(" - ") || "—";

    const data: Kpr1041Data = {
      year,
      orgName: org.name || "—",
      orgJib: org.tax_id || "—",
      orgAddress: org.address || "—",
      orgCity: org.city || "—",
      orgActivity: activity,
      entries,
    };

    const buffer = await renderToBuffer(
      createElement(Kpr1041Document, { data }) as any
    );

    const filename = `kpr-1041-${year}.pdf`;

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("KPR-1041 PDF Route error:", err);
    return new NextResponse(`PDF generation failed: ${message}`, { status: 500 });
  }
}

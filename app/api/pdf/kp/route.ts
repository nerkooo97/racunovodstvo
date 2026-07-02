import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveYear } from "@/lib/year";
import { getActiveOrgId } from "@/lib/supabase/get-active-org";
import { generateFilledKp1042Pdf, type Kp1042FillData, type Kp1042EntryItem } from "@/lib/pdf/kp-1042-fill";

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

    // Fetch org details and KP entries in parallel
    const [orgRes, kpRes] = await Promise.all([
      supabase
        .from("organizations")
        .select("name, tax_id, address, city, activity_code, activity_name")
        .eq("id", orgId)
        .single(),
      supabase
        .from("kp_entries")
        .select("*")
        .eq("organization_id", orgId)
        .eq("year", year)
        .order("entry_number", { ascending: true }),
    ]);

    if (orgRes.error || !orgRes.data) {
      return new NextResponse("Organization data error", { status: 500 });
    }

    const org = orgRes.data;
    const entriesRaw = kpRes.data ?? [];

    const entries: Kp1042EntryItem[] = entriesRaw.map((e) => ({
      entry_number: e.entry_number,
      entry_date: e.entry_date,
      document_type: e.document_type || null,
      document_number: e.document_number || null,
      description: e.description || null,
      cash_amount: Number(e.cash_amount || 0),
      noncash_amount: Number(e.noncash_amount || 0),
      total_amount: Number(e.total_amount || 0),
    }));

    const activity = [org.activity_code, org.activity_name].filter(Boolean).join(" - ") || "—";

    const data: Kp1042FillData = {
      year,
      orgName: org.name || "—",
      orgJib: org.tax_id || "—",
      orgAddress: org.address || "—",
      orgCity: org.city || "—",
      orgActivity: activity,
      entries,
    };

    const pdfBytes = await generateFilledKp1042Pdf(data);

    const filename = `kp-1042-${year}.pdf`;

    return new NextResponse(pdfBytes as unknown as BodyInit, {
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
    console.error("KP-1042 PDF Route error:", err);
    return new NextResponse(`PDF generation failed: ${message}`, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/supabase/get-active-org";
import { toLedgerEntry } from "@/lib/pdv/row";
import { normalizeDigits } from "@/lib/pdv/partner-ids";
import { aggregatePdvReturn } from "@/lib/pdv/pdv-sd/aggregate";
import { PdvSdDocument } from "@/lib/pdf/pdv-sd";

export async function handlePdvSdPdf(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const year = parseInt(searchParams.get("year") ?? "", 10);
  const month = parseInt(searchParams.get("month") ?? "", 10);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return new NextResponse("Neispravan period", { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const orgId = await getActiveOrgId(supabase, user.id);
  if (!orgId) return new NextResponse("No organization", { status: 404 });

  const [{ data: rawEntries }, { data: orgRow }] = await Promise.all([
    supabase
      .from("pdv_ledger_entries")
      .select("*")
      .eq("organization_id", orgId)
      .eq("period_year", year)
      .eq("period_month", month),
    supabase
      .from("organizations")
      .select("name, vat_number, address, tax_id")
      .eq("id", orgId)
      .single(),
  ]);

  const entries = (rawEntries ?? []).map((r) =>
    toLedgerEntry(r as Record<string, unknown>)
  );

  const ret = aggregatePdvReturn({
    period: { year, month },
    kif: entries.filter((e) => e.record_type === "kif"),
    kuf: entries.filter((e) => e.record_type === "kuf"),
  });

  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createElement(PdvSdDocument, {
      data: {
        ret,
        org: {
          name: orgRow?.name ?? "",
          vatNumber: normalizeDigits(orgRow?.vat_number),
          address: orgRow?.address ?? null,
          jib: orgRow?.tax_id ?? null,
        },
      },
    }) as any
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="pdv-prijava-${year}-${String(month).padStart(2, "0")}.pdf"`,
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    return await handlePdvSdPdf(req);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("PDV-SD PDF error:", err);
    return new NextResponse(`PDF generation failed: ${message}`, { status: 500 });
  }
}

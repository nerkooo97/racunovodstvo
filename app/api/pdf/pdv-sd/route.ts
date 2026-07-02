import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/supabase/get-active-org";
import { toLedgerEntry } from "@/lib/pdv/row";
import { normalizeDigits } from "@/lib/pdv/partner-ids";
import { aggregatePdvReturn } from "@/lib/pdv/pdv-sd/aggregate";
import { generateFilledPdvSdPdf, type PdvSdFillData } from "@/lib/pdf/pdv-sd-fill";
import { round2 } from "@/lib/pdv/amounts";

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
}

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
      .select("name, vat_number, address, tax_id, city, municipality")
      .eq("id", orgId)
      .single(),
  ]);

  if (!orgRow) {
    return new NextResponse("No organization info", { status: 404 });
  }

  const entries = (rawEntries ?? []).map((r) =>
    toLedgerEntry(r as Record<string, unknown>)
  );

  const kif = entries.filter((e) => e.record_type === "kif");
  const kuf = entries.filter((e) => e.record_type === "kuf");

  const ret = aggregatePdvReturn({
    period: { year, month },
    kif,
    kuf,
  });

  // Calculate detailed splits for inputs (domestic vs import vs flat fee)
  const importEntries = kuf.filter((e) => e.uio_document_type === "04");
  const domesticEntries = kuf.filter((e) => e.uio_document_type !== "04");

  const r41_vat = round2(sum(domesticEntries.map((e) => e.kuf_vat_deductible)));
  const r42_vat = round2(sum(importEntries.map((e) => e.kuf_vat_deductible)));
  const r43_vat = round2(sum(kuf.map((e) => e.kuf_flat_fee))); // in kuf mapper, flat fee itself is the deductible input tax (8%)

  // Krajnja potrošnja sums (III. Podaci o krajnjoj potrošnji)
  const r32 = round2(sum(kuf.map((e) => e.field_32 ?? 0)));
  const r33 = round2(sum(kuf.map((e) => e.field_33 ?? 0)));
  const r34 = round2(sum(kuf.map((e) => e.field_34 ?? 0)));

  // Try to parse postal code from municipality or city, fallback to empty
  const cityStr = orgRow.city || "";
  const postalCodeMatch = cityStr.match(/\b\d{5}\b/);
  const postalCode = postalCodeMatch ? postalCodeMatch[0] : "";
  const cityClean = cityStr.replace(/\b\d{5}\b/, "").trim();

  // Determine submitTo based on city
  let submitTo = "";
  const cityLower = cityStr.toLowerCase();
  if (cityLower.includes("sarajevo") || cityLower.includes("zenica") || cityLower.includes("bihać") || cityLower.includes("travnik") || cityLower.includes("goražde")) {
    submitTo = "RC Sarajevo";
  } else if (cityLower.includes("banja luka") || cityLower.includes("prijedor") || cityLower.includes("doboj") || cityLower.includes("trebinje")) {
    submitTo = "RC Banja Luka";
  } else if (cityLower.includes("mostar") || cityLower.includes("livno") || cityLower.includes("široki")) {
    submitTo = "RC Mostar";
  } else if (cityLower.includes("tuzla") || cityLower.includes("brčko") || cityLower.includes("bijeljina") || cityLower.includes("orašje")) {
    submitTo = "RC Tuzla";
  }

  // Fallback to active user's full name for responsible person
  const responsiblePersonName = user.user_metadata?.full_name || user.email || "";

  const data: PdvSdFillData = {
    year,
    month,
    orgName: orgRow.name || "",
    orgAddress: orgRow.address || "",
    orgCity: cityClean || orgRow.city || "",
    orgJib: orgRow.tax_id || "",
    orgVatNumber: normalizeDigits(orgRow.vat_number) || "",
    postalCode,
    submitTo,

    // I. Isporuke i nabavke (osnovice)
    r11: ret.taxableSuppliesBase,
    r12: ret.exportSupplies,
    r13: ret.exemptSupplies,
    r21: ret.domesticPurchasesBase,
    r22: ret.importBase,
    r23: ret.flatFee,

    // II. PDV
    r41: r41_vat,
    r42: r42_vat,
    r43: r43_vat,
    r51: ret.outputVat,
    r61: ret.deductibleVat,
    r71: ret.vatLiability > 0 ? ret.vatLiability : ret.vatCredit,
    r80: ret.vatCredit > 0,

    // III. Krajnja potrošnja
    r32,
    r33,
    r34,

    responsiblePersonName,
  };

  const pdfBytes = await generateFilledPdvSdPdf(data);

  return new NextResponse(pdfBytes as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="pdv-prijava-${year}-${String(month).padStart(2, "0")}.pdf"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
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

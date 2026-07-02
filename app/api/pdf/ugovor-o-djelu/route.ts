import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { UgovorODjeluDocument, type UgovorODjeluData } from "@/lib/pdf/ugovor-o-djelu";
import { type UodExpenseType } from "@/lib/calculations/ugovor-o-djelu";

export async function handleUgovorODjeluPdf(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = req.nextUrl;

  const data: UgovorODjeluData = {
    naruciocNaziv: searchParams.get("naruciocNaziv") || "",
    naruciocAdresa: searchParams.get("naruciocAdresa") || "",
    naruciocJib: searchParams.get("naruciocJib") || "",
    izvrsName: searchParams.get("izvrsName") || "",
    izvrsAdresa: searchParams.get("izvrsAdresa") || "",
    izvrsJmbg: searchParams.get("izvrsJmbg") || "",
    izvrsZiro: searchParams.get("izvrsZiro") || "",
    opis: searchParams.get("opis") || "",
    datumZakl: searchParams.get("datumZakl") || "",
    rokIzvrs: searchParams.get("rokIzvrs") || "",
    brojUgovora: searchParams.get("brojUgovora") || "",
    mjesto: searchParams.get("mjesto") || "",
    sud: searchParams.get("sud") || "",
    kanton: searchParams.get("kanton") || "09",
    direction: (searchParams.get("direction") || "neto") as "neto" | "bruto",
    expenseType: (searchParams.get("expenseType") || "standard") as UodExpenseType,
    amount: parseFloat(searchParams.get("amount") || "0"),
  };

  const buffer = await renderToBuffer(
    createElement(UgovorODjeluDocument, { data }) as any
  );

  const filename = `ugovor-o-djelu-${data.izvrsName.replace(/\s+/g, "-") || "dokument"}.pdf`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    return await handleUgovorODjeluPdf(req);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Ugovor o djelu PDF error:", err);
    return new NextResponse(`PDF generation failed: ${message}`, { status: 500 });
  }
}

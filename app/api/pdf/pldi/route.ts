import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateFilledPldiPdf, type PldiFillData } from "@/lib/pdf/pldi-fill";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    
    // Construct valid PldiFillData
    const data: PldiFillData = {
      year: String(body.year || new Date().getFullYear()),
      jmb: String(body.jmb || ""),
      fullName: String(body.fullName || ""),
      address: String(body.address || ""),
      jib: String(body.jib || ""),
      businessName: String(body.businessName || ""),
      businessAddress: String(body.businessAddress || ""),
      activityCode: String(body.activityCode || ""),
      activityName: String(body.activityName || ""),
      manualPeriod: !!body.manualPeriod,
      rows: (body.rows || []).map((row: any) => ({
        name: String(row.name || ""),
        acquisition_date: String(row.acquisition_date || ""),
        doc_number: String(row.doc_number || ""),
        acquisition_value: parseFloat(row.acquisition_value) || 0,
        kv_start: parseFloat(row.kv_start) || 0,
        years: parseFloat(row.years) || 0,
        rate: parseFloat(row.rate) || 0,
        sale_date: row.sale_date ? String(row.sale_date) : undefined,
        written_off: !!row.written_off,
      })),
    };

    const pdfBytes = await generateFilledPldiPdf(data);

    return new NextResponse(pdfBytes as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="pldi-1043-${data.year}.pdf"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("PLDI PDF generation error:", err);
    return new NextResponse(`PDF generation failed: ${message}`, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateFilledSpr1053Pdf, type Spr1053FillData } from "@/lib/pdf/spr-1053-fill";
import { getTaxConfig } from "@/lib/constants/tax-config";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();

    const n = (v: any) => parseFloat(String(v || "").replace(",", ".")) || 0;

    const r11 = n(body.r11);
    const r12 = n(body.r12);
    const r13 = n(body.r13);
    const r14 = n(body.r14);
    const r15 = n(body.r15);
    const r16 = r11 + r12 + r13 + r14 + r15;

    const r17 = n(body.r17);
    const r18 = n(body.r18);
    const r19 = n(body.r19);
    const r20 = n(body.r20);
    const r21 = n(body.r21);
    const r22 = n(body.r22);
    const r23 = n(body.r23);
    const r24 = r17 + r18 + r19 + r20 + r21 + r22 + r23;

    const r25 = r16;
    const r26 = r24;
    const r27 = n(body.r27);
    const r28 = r25 - r26 + r27;

    const yearVal = String(body.year || new Date().getFullYear() - 1);
    const cfg = getTaxConfig(`${yearVal}-12-31`);
    const r29 = Math.max(0, (r28 * cfg.incomeTaxRate) / 12);

    const data: Spr1053FillData = {
      jmb: String(body.jmb || ""),
      fullName: String(body.fullName || ""),
      address: String(body.address || ""),
      city: String(body.city || ""),
      jib: String(body.jib || ""),
      year: String(body.year || new Date().getFullYear() - 1),
      contactChanged: !!body.contactChanged,
      businessName: String(body.businessName || ""),
      businessAddress: String(body.businessAddress || ""),
      activityCode: String(body.activityCode || ""),
      activityName: String(body.activityName || ""),

      r11,
      r12,
      r13,
      r14,
      r15,
      r16,

      r17,
      r18,
      r19,
      r20,
      r21,
      r22,
      r23,
      r24,

      r25,
      r26,
      r27,
      r28,
      r29,

      fillDate: new Date().toLocaleDateString("bs-BA"),
      place: String(body.city || "Sarajevo"),
    };

    const pdfBytes = await generateFilledSpr1053Pdf(data);

    return new NextResponse(pdfBytes as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="spr-1053-${data.year}.pdf"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("SPR-1053 PDF generation error:", err);
    return new NextResponse(`PDF generation failed: ${message}`, { status: 500 });
  }
}

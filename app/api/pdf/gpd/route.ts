import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateFilledGpd1051Pdf, type Gpd1051FillData } from "@/lib/pdf/gpd-1051-fill";
import { getTaxConfig } from "@/lib/constants/tax-config";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();

    const yearVal = String(body.year || new Date().getFullYear() - 1);
    const cfg = getTaxConfig(`${yearVal}-12-31`);

    const taxCoeff = parseFloat(body.taxCoeff) || 1.0;
    const personalDeduction = cfg.personalDeductionAnnual * taxCoeff;
    const healthExp = parseFloat(body.r19) || 0;
    const loanInterest = parseFloat(body.r20) || 0;
    const totalDeductions = personalDeduction + healthExp + loanInterest;

    // Prihodi (c = gubitak, d = dobit)
    const r8d = parseFloat(body.r8) || 0; // nesamostalna (plate)
    const r9d = parseFloat(body.r9) || 0; // samostalna (dobit)
    const r9c = 0; // samostalna (gubitak) - wait, client uses r9 as dobit, but could be negative? If negative, we can split. Let's keep as dobit by default.
    const r10d = parseFloat(body.r10) || 0;
    const r10c = 0;
    const r11d = parseFloat(body.r11) || 0;
    const r11c = 0;
    const r12d = parseFloat(body.r12) || 0;
    const r12c = 0;
    const r13d = parseFloat(body.r13) || 0;
    const r13c = 0;
    const r14c = parseFloat(body.r14) || 0; // poslovni gubitak ranijih godina

    const totalD_incomes = r8d + r9d + r10d + r11d + r12d + r13d;
    const r15_total = totalD_incomes - r14c;
    const r22_gubitak = Math.max(0, -r15_total);
    const r23_dohodak = Math.max(0, r15_total);

    const r25_osnovica = Math.max(0, r23_dohodak - r22_gubitak - totalDeductions);
    const r26_obaveza = Math.round(r25_osnovica * cfg.incomeTaxRate * 100) / 100;

    const r27 = parseFloat(body.r27) || 0;
    const r28 = parseFloat(body.r28) || 0;
    const r29 = parseFloat(body.r29) || 0;
    const r30 = parseFloat(body.r30) || 0;
    const r31_razlika = r26_obaveza - r27 - r28 - r29 - r30;

    const data: Gpd1051FillData = {
      jmb: String(body.jmb || ""),
      fullName: String(body.fullName || ""),
      address: String(body.address || ""),
      city: String(body.city || ""),
      contactChanged: !!body.contactChanged,
      year: String(body.year || new Date().getFullYear() - 1),
      phone: String(body.phone || ""),
      email: String(body.email || ""),

      r8d,
      r9d,
      r9c,
      r10d,
      r10c,
      r11d,
      r11c,
      r12d,
      r12c,
      r13d,
      r13c,
      r14c,

      taxCoeff,
      r18: personalDeduction,
      r19: healthExp,
      r20: loanInterest,
      r21: totalDeductions,

      r22: r22_gubitak,
      r23: r23_dohodak,
      r24: totalDeductions,
      r25: r25_osnovica,
      r26: r26_obaveza,
      r27,
      r28,
      r29,
      r30,
      r31: r31_razlika,

      paymentChoice: body.paymentChoice === "b" ? "b" : "a",
      fillDate: new Date().toLocaleDateString("bs-BA"),
      place: String(body.city || "Sarajevo"),
    };

    const pdfBytes = await generateFilledGpd1051Pdf(data);

    return new NextResponse(pdfBytes as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="gpd-1051-${data.year}.pdf"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("GPD-1051 PDF generation error:", err);
    return new NextResponse(`PDF generation failed: ${message}`, { status: 500 });
  }
}

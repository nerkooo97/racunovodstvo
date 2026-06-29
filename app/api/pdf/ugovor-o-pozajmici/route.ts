import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { UgovorOPozajmiciDocument, type UgovorOPozajmiciData } from "@/lib/pdf/ugovor-o-pozajmici";

interface RepaymentRow {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

function calcAnnuity(principal: number, annualRate: number, months: number): RepaymentRow[] {
  if (annualRate === 0) {
    const payment = principal / months;
    const rows: RepaymentRow[] = [];
    let balance = principal;
    for (let i = 1; i <= months; i++) {
      balance -= payment;
      rows.push({ month: i, payment, interest: 0, principal: payment, balance: Math.max(0, balance) });
    }
    return rows;
  }

  const r = annualRate / 100 / 12;
  const annuity = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  const rows: RepaymentRow[] = [];
  let balance = principal;

  for (let i = 1; i <= months; i++) {
    const interest  = balance * r;
    const principalP = annuity - interest;
    balance -= principalP;
    rows.push({
      month:     i,
      payment:   Math.round(annuity * 100) / 100,
      interest:  Math.round(interest * 100) / 100,
      principal: Math.round(principalP * 100) / 100,
      balance:   Math.max(0, Math.round(balance * 100) / 100),
    });
  }
  return rows;
}

export async function handleUgovorOPozajmiciPdf(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = req.nextUrl;

  const amount = parseFloat(searchParams.get("amount") || "0");
  const interest_rate = parseFloat(searchParams.get("interest_rate") || "0");
  const term_months = parseInt(searchParams.get("term_months") || "12");

  const data: UgovorOPozajmiciData = {
    lender_name: searchParams.get("lender_name") || "",
    lender_address: searchParams.get("lender_address") || "",
    lender_jib: searchParams.get("lender_jib") || "",
    borrower_name: searchParams.get("borrower_name") || "",
    borrower_address: searchParams.get("borrower_address") || "",
    borrower_jib: searchParams.get("borrower_jib") || "",
    amount,
    currency: searchParams.get("currency") || "BAM",
    interest_rate,
    term_months,
    start_date: searchParams.get("start_date") || "",
    purpose: searchParams.get("purpose") || "",
    bank_account: searchParams.get("bank_account") || "",
    bank_name: searchParams.get("bank_name") || "",
    note: searchParams.get("note") || "",
    court: searchParams.get("court") || "",
    copies: parseInt(searchParams.get("copies") || "2"),
    place: searchParams.get("place") || "",
    sign_date: searchParams.get("sign_date") || "",
    schedule: calcAnnuity(amount, interest_rate, term_months),
  };

  const buffer = await renderToBuffer(
    createElement(UgovorOPozajmiciDocument, { data })
  );

  const filename = `ugovor-o-pozajmici-${data.borrower_name.replace(/\s+/g, "-") || "dokument"}.pdf`;

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
    return await handleUgovorOPozajmiciPdf(req);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Ugovor o pozajmici PDF error:", err);
    return new NextResponse(`PDF generation failed: ${message}`, { status: 500 });
  }
}

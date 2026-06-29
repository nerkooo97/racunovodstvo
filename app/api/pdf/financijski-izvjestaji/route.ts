import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/supabase/get-active-org";
import { normalizeDigits } from "@/lib/pdv/partner-ids";
import {
  buildBalanceSheet,
  buildIncomeStatement,
  buildTrialBalance,
  type AccountMeta,
  type RawLine,
} from "@/lib/accounting/statements";
import type { Account } from "@/lib/accounting/types";
import { FinancialStatementsDocument } from "@/lib/pdf/financial-statements";

export async function handleFinancialStatementsPdf(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const year = parseInt(searchParams.get("year") ?? "", 10);

  if (!Number.isFinite(year)) {
    return new NextResponse("Neispravna godina", { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const orgId = await getActiveOrgId(supabase, user.id);
  if (!orgId) return new NextResponse("No organization", { status: 404 });

  const [{ data: entries }, { data: accountsData }, { data: orgRow }] =
    await Promise.all([
      supabase
        .from("journal_entries")
        .select("id")
        .eq("organization_id", orgId)
        .eq("period_year", year),
      supabase
        .from("chart_of_accounts")
        .select("code, name, account_type")
        .eq("organization_id", orgId),
      supabase
        .from("organizations")
        .select("name, vat_number, address, tax_id")
        .eq("id", orgId)
        .single(),
    ]);

  const ids = (entries ?? []).map((e) => e.id as string);

  let lines: RawLine[] = [];
  if (ids.length > 0) {
    const { data: lineRows } = await supabase
      .from("journal_lines")
      .select("account_code, account_name, debit, credit")
      .in("journal_entry_id", ids);
    lines = (lineRows ?? []) as RawLine[];
  }

  const accounts = new Map<string, AccountMeta>();
  for (const a of (accountsData ?? []) as Pick<
    Account,
    "code" | "name" | "account_type"
  >[]) {
    accounts.set(a.code, { name: a.name, account_type: a.account_type });
  }

  const tb = buildTrialBalance(lines, accounts);
  const income = buildIncomeStatement(tb);
  const balance = buildBalanceSheet(tb, income.result);

  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createElement(FinancialStatementsDocument, {
      data: {
        year,
        org: {
          name: orgRow?.name ?? "",
          vatNumber: normalizeDigits(orgRow?.vat_number),
          jib: orgRow?.tax_id ?? null,
          address: orgRow?.address ?? null,
        },
        income,
        balance,
      },
    }) as any
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="finansijski-izvjestaji-${year}.pdf"`,
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    return await handleFinancialStatementsPdf(req);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Financial statements PDF error:", err);
    return new NextResponse(`PDF generation failed: ${message}`, {
      status: 500,
    });
  }
}

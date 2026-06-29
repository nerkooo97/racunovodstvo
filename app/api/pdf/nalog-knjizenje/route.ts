import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { NalogKnjizenjePdf } from "@/lib/pdf/nalog-knjizenje";
import { generateAccountingJournal, calculateFromGross, SalaryCalculation } from "@/lib/calculations/salary";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const periodId = searchParams.get("periodId");

  if (!periodId) return new NextResponse("Missing periodId", { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, type")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!org) return new NextResponse("No organization", { status: 404 });

  const { data: period } = await supabase
    .from("salary_periods")
    .select("year, month")
    .eq("id", periodId)
    .single();

  if (!period) return new NextResponse("Period not found", { status: 404 });

  const { data: items } = await supabase
    .from("salary_items")
    .select("*")
    .eq("period_id", periodId);

  const orgType = (org.type as "obrt" | "doo") ?? "obrt";
  let mealTotal = 0;
  const calcs: SalaryCalculation[] = (items ?? []).map((it) => {
    mealTotal += (it.meal_allowance ?? 0);
    return calculateFromGross(it.gross_salary ?? 0, it.tax_coefficient ?? 1.0, orgType);
  });

  const entries = generateAccountingJournal(calcs, mealTotal);

  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createElement(NalogKnjizenjePdf, {
      data: {
        orgName: org.name,
        year: period.year,
        month: period.month,
        entries,
      },
    }) as any
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="nalog-knjizenje-${period.year}-${period.month}.pdf"`,
    },
  });
}

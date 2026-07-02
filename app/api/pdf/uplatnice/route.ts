import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/supabase/get-active-org";
import { UplatnicePdf } from "@/lib/pdf/uplatnice-pdf";
import { generateAggregatedVouchers, calculateFromGross, SalaryItemForVoucher } from "@/lib/calculations/salary";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const periodId = searchParams.get("periodId");
  const combine = searchParams.get("combine") === "true";

  if (!periodId) return new NextResponse("Missing periodId", { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const activeOrgId = await getActiveOrgId(supabase, user.id);
  const { data: org } = activeOrgId
    ? await supabase.from("organizations").select("id, name, city, canton, municipality_code, type").eq("id", activeOrgId).single()
    : { data: null };

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
  const salaryItemsForVouchers: SalaryItemForVoucher[] = (items ?? []).map((it) => ({
    calc: calculateFromGross(it.gross_salary ?? 0, it.tax_coefficient ?? 1.0, orgType, undefined, undefined, `${period.year}-${String(period.month).padStart(2, "0")}-01`),
    canton: it.canton ?? null,
    municipalityCode: it.municipality_code ?? null,
    municipalityName: it.municipality_name ?? null,
  }));

  const vouchers = generateAggregatedVouchers(
    salaryItemsForVouchers,
    org.canton,
    org.city ?? "Sarajevo",
    org.municipality_code ?? "109",
    combine
  );

  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createElement(UplatnicePdf, {
      vouchers,
      orgName: org.name,
      periodStr: `${period.month}/${period.year}`,
    }) as any
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="uplatnice-${period.year}-${period.month}.pdf"`,
    },
  });
}

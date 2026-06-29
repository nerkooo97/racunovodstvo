import { NextRequest, NextResponse } from "next/server";
import {
  getAuthOrg,
  parseYearMonth,
  renderSihtericaPdfBuffer,
} from "@/lib/timesheet/render-pdf";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthOrg();
    if (!auth) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = req.nextUrl;
    const employeeId = searchParams.get("employeeId");
    const period = parseYearMonth(searchParams);

    if (!employeeId || !period) {
      return new NextResponse("Missing employeeId, year or month", { status: 400 });
    }

    const result = await renderSihtericaPdfBuffer(
      auth.org.id,
      auth.user.id,
      employeeId,
      period.year,
      period.month
    );

    if (!result) {
      return new NextResponse("Radnik nije pronađen.", { status: 404 });
    }

    return new NextResponse(result.buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (err: unknown) {
    console.error("Sihterica PDF error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new NextResponse(`PDF generation failed: ${message}`, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { handlePlatniListicPdf } from "./platni-listic/route";
import { handleFakturaPdf } from "./faktura/route";
import { handleJs3100Pdf, POST as handleJs3100Post } from "./js3100/route";
import { handlePdvSdPdf } from "./pdv-sd/route";
import { handleFinancialStatementsPdf } from "./financijski-izvjestaji/route";
import { handleUgovorODjeluPdf } from "./ugovor-o-djelu/route";
import { handleUgovorOPozajmiciPdf } from "./ugovor-o-pozajmici/route";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type");

  if (type === "platni-listic") {
    return handlePlatniListicPdf(req);
  }

  if (type === "faktura") {
    return handleFakturaPdf(req);
  }

  if (type === "js3100") {
    return handleJs3100Pdf(req);
  }

  if (type === "pdv-sd") {
    return handlePdvSdPdf(req);
  }

  if (type === "finansijski-izvjestaji") {
    return handleFinancialStatementsPdf(req);
  }

  if (type === "ugovor-o-djelu") {
    return handleUgovorODjeluPdf(req);
  }

  if (type === "ugovor-o-pozajmici") {
    return handleUgovorOPozajmiciPdf(req);
  }

  return new NextResponse("Unknown type", { status: 400 });
}

export async function POST(req: NextRequest) {
  return handleJs3100Post(req);
}

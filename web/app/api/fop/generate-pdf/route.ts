import { NextRequest, NextResponse } from "next/server";
import { buildFopPdf } from "@/lib/fop/build-fop-pdf";

export const runtime = "nodejs";

function safe(value: string) {
  return String(value || "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const reportCode = safe(body?.reportCode || "DOR").toUpperCase();
    const reportDate = safe(body?.reportDate || "");
    const documentNumber = String(body?.documentNumber || "").trim();
    const revisionNo = Number(body?.revisionNo ?? body?.rev ?? 0);

    if (!reportDate) {
      return NextResponse.json(
        { ok: false, error: "Report date is required." },
        { status: 400 }
      );
    }

    if (!documentNumber) {
      return NextResponse.json(
        { ok: false, error: "Document Number is required." },
        { status: 400 }
      );
    }

    if (Number.isNaN(revisionNo)) {
      return NextResponse.json(
        { ok: false, error: "Revision Number is invalid." },
        { status: 400 }
      );
    }

    const { fileName, pdfBytes } = await buildFopPdf({
      reportCode,
      reportDate,
      documentNumber,
      revisionNo,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GENERATE PDF ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "PDF generation failed.",
      },
      { status: 500 }
    );
  }
}
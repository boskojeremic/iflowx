import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { FOP_PDF_DIR } from "@/lib/fop-pdf-path";

export const runtime = "nodejs";

function safe(value: string) {
  return String(value || "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const reportCode = safe(body?.reportCode || "DOR").toUpperCase();
    const reportDate = safe(body?.reportDate || "");

    if (!reportDate) {
      return NextResponse.json(
        { ok: false, error: "Report date is required." },
        { status: 400 }
      );
    }

    const fileName = `${reportCode}_${reportDate}.pdf`;
    const filePath = path.join(FOP_PDF_DIR, fileName);

    const exists = await fileExists(filePath);

    if (exists) {
      return NextResponse.json({
        ok: true,
        existed: true,
        generated: false,
        pdfUrl: `/api/fop/pdf/${fileName}`,
        message: "Existing PDF found. Current file loaded.",
      });
    }

    const baseUrl =
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3001";

    const generateRes = await fetch(`${baseUrl}/api/fop/generate-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reportCode,
        reportDate,
      }),
      cache: "no-store",
    });

    const generateData = await generateRes.json().catch(() => null);

    if (!generateRes.ok || !generateData?.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: generateData?.error || "Failed to generate PDF.",
        },
        { status: 500 }
      );
    }

    const existsAfterGenerate = await fileExists(filePath);

    if (!existsAfterGenerate) {
      return NextResponse.json(
        {
          ok: false,
          error: "PDF generation finished but file was not created.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      existed: false,
      generated: true,
      pdfUrl: `/api/fop/pdf/${fileName}`,
      message: "PDF not found. New PDF generated successfully.",
    });
  } catch (error) {
    console.error("ENSURE PDF ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to ensure PDF.",
      },
      { status: 500 }
    );
  }
}
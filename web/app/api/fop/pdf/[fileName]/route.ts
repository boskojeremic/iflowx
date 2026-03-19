import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { FOP_PDF_DIR } from "@/lib/fop-pdf-path";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fileName: string }> }
) {
  try {
    const { fileName } = await params;

    const safeFileName = String(fileName || "").replace(
      /[^a-zA-Z0-9._-]/g,
      ""
    );

    const filePath = path.join(FOP_PDF_DIR, safeFileName);
    const fileBuffer = await fs.readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("READ PDF ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "PDF not found.",
      },
      { status: 404 }
    );
  }
}
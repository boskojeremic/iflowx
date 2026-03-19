import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    const safeFileName = String(filename || "").replace(/[^a-zA-Z0-9._-]/g, "");
    const filePath = path.join(process.cwd(), "generated", "fop", safeFileName);

    const fileBuffer = await fs.readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Read PDF error:", error);
    return NextResponse.json(
      { ok: false, error: "PDF not found." },
      { status: 404 }
    );
  }
}
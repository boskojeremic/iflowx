import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";
import { FOP_PDF_DIR } from "@/lib/fop-pdf-path";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

function safe(value: string) {
  return String(value || "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function splitEmails(value: string) {
  return String(value || "")
    .split(/[;,]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

async function ensurePdfExists(reportCode: string, reportDate: string) {
  const fileName = `${reportCode}_${reportDate}.pdf`;
  const filePath = path.join(FOP_PDF_DIR, fileName);

  try {
    await fs.access(filePath);
    return { fileName, filePath };
  } catch {
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
      throw new Error(
        generateData?.error || "Failed to auto-generate PDF before sending email."
      );
    }

    await fs.access(filePath);
    return { fileName, filePath };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const to = splitEmails(body?.to || "");
    const cc = splitEmails(body?.cc || "");
    const subject = String(body?.subject || "").trim();
    const message = String(body?.body || "").trim();

    const reportCode = safe(body?.reportCode || "DOR").toUpperCase();
    const reportDate = safe(body?.reportDate || "");
    const reportTitle = String(body?.reportTitle || reportCode).trim();

    if (!to.length) {
      return NextResponse.json(
        { ok: false, error: "At least one recipient is required." },
        { status: 400 }
      );
    }

    if (!reportDate) {
      return NextResponse.json(
        { ok: false, error: "Report date is required." },
        { status: 400 }
      );
    }

    const { fileName, filePath } = await ensurePdfExists(reportCode, reportDate);
    const pdfBuffer = await fs.readFile(filePath);

    const sendResult = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to,
      cc: cc.length ? cc : undefined,
      subject: subject || `${reportTitle} - ${reportDate}`,
      text: message,
      attachments: [
        {
          filename: fileName,
          content: pdfBuffer.toString("base64"),
        },
      ],
    });

    return NextResponse.json({
      ok: true,
      id: sendResult.data?.id ?? null,
      fileName,
    });
  } catch (error) {
    console.error("SEND REPORT EMAIL ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send report email.",
      },
      { status: 500 }
    );
  }
}
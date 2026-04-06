import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

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

export async function POST(req: NextRequest) {
  console.log("PDF_WORKER_URL =", process.env.PDF_WORKER_URL);
console.log("WORKER_SHARED_SECRET =", process.env.WORKER_SHARED_SECRET);
  try {
    const body = await req.json();

    const to = splitEmails(body?.to || "");
    const cc = splitEmails(body?.cc || "");
    const subject = String(body?.subject || "").trim();
    const message = String(body?.body || "").trim();

    const reportCode = safe(body?.reportCode || "DOR").toUpperCase();
    const reportDate = safe(body?.reportDate || "");
    const reportTitle = String(body?.reportTitle || reportCode).trim();
    const documentNumber = String(body?.documentNumber || "").trim();
    const revisionNo = Number(body?.revisionNo ?? 0);

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

    if (!process.env.EMAIL_FROM) {
      throw new Error("EMAIL_FROM is not configured.");
    }
console.log("PDF_WORKER_URL =", process.env.PDF_WORKER_URL);
console.log("WORKER_SHARED_SECRET =", process.env.WORKER_SHARED_SECRET);
    const workerUrl = process.env.PDF_WORKER_URL;
    const workerSecret = process.env.WORKER_SHARED_SECRET;

    if (!workerUrl || !workerSecret) {
      throw new Error("PDF_WORKER_URL or WORKER_SHARED_SECRET not configured.");
    }

    const workerRes = await fetch(`${workerUrl}/generate-fop-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-worker-secret": workerSecret,
      },
      body: JSON.stringify({
        reportCode,
        reportDate,
        revisionNo,
      }),
    });

    if (!workerRes.ok) {
      const text = await workerRes.text();
      throw new Error(`PDF worker error: ${text}`);
    }

    const pdfArrayBuffer = await workerRes.arrayBuffer();
    const pdfBuffer = Buffer.from(pdfArrayBuffer);
    const fileName = `${reportCode}-${reportDate}-R${revisionNo}.pdf`;

    const sendResult = await resend.emails.send({
      from: process.env.EMAIL_FROM,
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
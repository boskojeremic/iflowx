import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

function toDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function getAppUrl() {
  const appUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (!appUrl) {
    throw new Error("APP_URL is not configured.");
  }

  return appUrl.replace(/\/+$/, "");
}

async function sendEmailViaResend(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey) throw new Error("RESEND_API_KEY missing");
  if (!from) throw new Error("EMAIL_FROM missing");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const formData = await req.formData();

    const tenantId = String(formData.get("tenantId") ?? "").trim();
    const reportId = String(formData.get("reportId") ?? "").trim();
    const reportCode = String(formData.get("reportCode") ?? "").trim();
    const reportName = String(formData.get("reportName") ?? "").trim();
    const date = String(formData.get("date") ?? "").trim();
    const revisionNo = Number(formData.get("revisionNo") ?? 0);
    const snapshotId = String(formData.get("snapshotId") ?? "").trim();
    const documentNumber = String(formData.get("documentNumber") ?? "").trim();
    const approverUserId = String(formData.get("approverUserId") ?? "").trim();
    const returnTo = String(
      formData.get("returnTo") ?? "/gen/esg/ghg_inv"
    ).trim();

    if (
      !tenantId ||
      !reportId ||
      !reportCode ||
      !reportName ||
      !date ||
      !snapshotId ||
      !approverUserId
    ) {
      return NextResponse.json(
        { error: "Missing required parameters." },
        { status: 400 }
      );
    }

    const snapshot = await db.measurementSnapshot.findUnique({
      where: { id: snapshotId },
      select: {
        snapshotRevisionNo: true,
        documentNumber: true,
      },
    });

    if (!snapshot) throw new Error("Snapshot not found");

    const approver = await db.user.findUnique({
      where: { id: approverUserId },
      select: { email: true, name: true },
    });

    if (!approver?.email) throw new Error("Approver email missing");

    const requester = session?.user?.email
      ? await db.user.findUnique({
          where: { email: session.user.email },
          select: { id: true, email: true, name: true },
        })
      : null;

    // STATUS
    await db.reportDayStatus.upsert({
      where: {
        tenantId_reportId_day: {
          tenantId,
          reportId,
          day: toDateOnly(date),
        },
      },
      update: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        approvedAt: null,
      },
      create: {
        id: crypto.randomUUID(),
        tenantId,
        reportId,
        day: toDateOnly(date),
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
    });

    // TOKEN
    const token = crypto.randomUUID();

    await db.reportApprovalToken.create({
      data: {
        token,
        tenantId,
        reportId,
        reportCode,
        reportName,
        snapshotId,
        revisionNo: snapshot.snapshotRevisionNo ?? revisionNo,
        documentNumber: snapshot.documentNumber ?? documentNumber ?? null,
        day: toDateOnly(date),
        approverUserId,
        approverEmail: approver.email,
        requesterUserId: requester?.id ?? null,
        requesterEmail: requester?.email ?? null,
        requesterName: requester?.name ?? null,
        status: "PENDING",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // LINK
    const appUrl = getAppUrl();
    const approveLink = `${appUrl}/gen/esg/ghg_inv/approve?token=${token}`;

    await sendEmailViaResend({
      to: approver.email,
      subject: `Approval required: ${reportName} / ${date}`,
      html: `
        <p>Report requires approval</p>
        <p><strong>${reportName}</strong></p>
        <p>Date: ${date}</p>
        <p>Revision: ${snapshot.snapshotRevisionNo ?? revisionNo}</p>
        <p>Document: ${snapshot.documentNumber ?? "-"}</p>
        <p><a href="${approveLink}">Open Approval</a></p>
      `,
    });

    return NextResponse.redirect(
      new URL(returnTo.startsWith("/") ? returnTo : "/gen/esg/ghg_inv", appUrl)
    );

  } catch (e) {
    console.error("SUBMIT FAILED:", e);

    return NextResponse.json(
      {
        error: "Submit failed",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
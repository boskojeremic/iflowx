import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

function toDateOnly(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));
}

async function sendEmailViaResend(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "iFlowX <no-reply@example.com>";

  if (!apiKey) {
    console.warn("RESEND_API_KEY is missing. Email was not sent.");
    return;
  }

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
    throw new Error(`Resend error: ${text}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const formData = await req.formData();

    const tenantId = String(formData.get("tenantId") ?? "");
    const reportId = String(formData.get("reportId") ?? "");
    const reportCode = String(formData.get("reportCode") ?? "");
    const reportName = String(formData.get("reportName") ?? "");
    const date = String(formData.get("date") ?? "");
    const revisionNo = Number(formData.get("revisionNo") ?? 0);
    const snapshotId = String(formData.get("snapshotId") ?? "");
    const documentNumber = String(formData.get("documentNumber") ?? "");
    const approverUserId = String(formData.get("approverUserId") ?? "");
    const returnTo = String(formData.get("returnTo") ?? "/gen/esg/workforce");

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
        id: true,
        snapshotRevisionNo: true,
        documentNumber: true,
      },
    });

    if (!snapshot) {
      return NextResponse.json(
        { error: "Snapshot not found." },
        { status: 400 }
      );
    }

    const approver = await db.user.findUnique({
      where: { id: approverUserId },
      select: { id: true, email: true, name: true },
    });

    if (!approver?.email) {
      return NextResponse.json(
        { error: "Approver not found." },
        { status: 400 }
      );
    }

    const requester = session?.user?.email
      ? await db.user.findFirst({
          where: { email: session.user.email },
          select: { id: true, email: true, name: true },
        })
      : null;

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
        submittedBy: requester?.email ?? session?.user?.email ?? null,
        approvedAt: null,
        approvedBy: null,
      },
      create: {
        id: crypto.randomUUID(),
        tenantId,
        reportId,
        day: toDateOnly(date),
        status: "SUBMITTED",
        submittedAt: new Date(),
        submittedBy: requester?.email ?? session?.user?.email ?? null,
      },
    });

    await db.reportApprovalToken.updateMany({
      where: {
        tenantId,
        reportId,
        snapshotId,
        status: "PENDING",
      },
      data: {
        status: "EXPIRED",
        actedAt: new Date(),
      },
    });

    const token = crypto.randomUUID();

    await db.reportApprovalToken.create({
      data: {
        token,
        tenantId,
        reportId,
        reportCode,
        reportName,
        snapshotId,
        revisionNo: snapshot.snapshotRevisionNo ?? revisionNo ?? 0,
        documentNumber: snapshot.documentNumber ?? documentNumber ?? null,
        day: toDateOnly(date),
        approverUserId,
        approverEmail: approver.email,
        requesterUserId: requester?.id ?? null,
        requesterEmail: requester?.email ?? null,
        requesterName: requester?.name ?? null,
        status: "PENDING",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    const appUrl =
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3001";

    const approveLink = `${appUrl}/gen/esg/workforce/approve?token=${token}`;

    await sendEmailViaResend({
      to: approver.email,
      subject: `Approval required: ${reportName} / ${date}`,
      html: `
        <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5">
          <p>Dear ${approver.name || "Approver"},</p>
          <p>A report requires your approval.</p>
          <p><strong>Report:</strong> ${reportName}<br/>
          <strong>Date:</strong> ${date}<br/>
          <strong>Revision:</strong> ${snapshot.snapshotRevisionNo ?? revisionNo ?? 0}<br/>
          <strong>Document No:</strong> ${snapshot.documentNumber ?? "-"}</p>
          <p>
            <a href="${approveLink}" style="display:inline-block;padding:10px 16px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px">
              Open Approval Page
            </a>
          </p>
          <p>Or open directly:<br/>${approveLink}</p>
          <p>Best regards,<br/>iFlowX System</p>
        </div>
      `,
    });

    const redirectUrl = new URL(returnTo, req.url);
    redirectUrl.searchParams.set("_ts", String(Date.now()));
    return NextResponse.redirect(redirectUrl);
  } catch (e) {
    console.error("WORKFORCE_SUBMIT_ERROR", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Submit failed." },
      { status: 500 }
    );
  }
}
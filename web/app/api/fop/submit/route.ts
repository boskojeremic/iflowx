import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

function toDateOnly(value: string) {
  return new Date(`${value}T00:00:00`);
}

function getAppUrl() {
  const appUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (!appUrl) {
    throw new Error(
      "APP_URL is not configured. Set APP_URL or NEXT_PUBLIC_APP_URL."
    );
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

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is missing.");
  }

  if (!from) {
    throw new Error("EMAIL_FROM is missing.");
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

    const tenantId = String(formData.get("tenantId") ?? "").trim();
    const reportId = String(formData.get("reportId") ?? "").trim();
    const reportCode = String(formData.get("reportCode") ?? "").trim();
    const reportName = String(formData.get("reportName") ?? "").trim();
    const date = String(formData.get("date") ?? "").trim();
    const revisionNo = Number(formData.get("revisionNo") ?? 0);
    const snapshotId = String(formData.get("snapshotId") ?? "").trim();
    const documentNumber = String(formData.get("documentNumber") ?? "").trim();
    const approverUserId = String(formData.get("approverUserId") ?? "").trim();
    const returnTo = String(formData.get("returnTo") ?? "/ogi/fop").trim();

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

    // SNAPSHOT CHECK
    const snapshot = await db.measurementSnapshot.findUnique({
      where: { id: snapshotId },
      select: {
        id: true,
        snapshotRevisionNo: true,
        documentNumber: true,
      },
    });

    if (!snapshot) {
      throw new Error("Snapshot not found.");
    }

    // APPROVER
    const approver = await db.user.findUnique({
      where: { id: approverUserId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!approver?.email) {
      throw new Error("Approver email not found.");
    }

    // REQUESTER
    const requester = session?.user?.email
      ? await db.user.findUnique({
          where: { email: session.user.email },
          select: {
            id: true,
            email: true,
            name: true,
          },
        })
      : null;

    // STATUS UPSERT
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

    // LINK
    const appUrl = getAppUrl();
    const approveLink = `${appUrl}/ogi/fop/approve?token=${token}`;

    // EMAIL
    await sendEmailViaResend({
      to: approver.email,
      subject: `Approval required: ${reportName} / ${date}`,
      html: `
        <div style="font-family:Arial,sans-serif;font-size:14px">
          <p>Dear ${approver.name || "Approver"},</p>
          <p>A report requires your approval.</p>

          <p>
            <strong>Report:</strong> ${reportName}<br/>
            <strong>Date:</strong> ${date}<br/>
            <strong>Revision:</strong> ${snapshot.snapshotRevisionNo ?? revisionNo ?? 0}<br/>
            <strong>Document No:</strong> ${snapshot.documentNumber ?? "-"}
          </p>

          <p>
            <a href="${approveLink}" style="padding:10px 16px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px">
              Open Approval Page
            </a>
          </p>

          <p>Best regards,<br/>iFlowX System</p>
        </div>
      `,
    });

    // REDIRECT
    const safeReturnTo = returnTo.startsWith("/") ? returnTo : "/ogi/fop";
    return NextResponse.redirect(new URL(safeReturnTo, appUrl));

  } catch (e) {
    console.error("SUBMIT FAILED:", e);

    return NextResponse.json(
      {
        error: "Submit failed.",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function formatYmdLocal(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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
    const formData = await req.formData();
    const token = String(formData.get("token") ?? "").trim();

    if (!token) {
      return NextResponse.json({ error: "Missing token." }, { status: 400 });
    }

    const approval = await db.reportApprovalToken.findUnique({
      where: { token },
    });

    if (!approval) {
      return NextResponse.json({ error: "Invalid token." }, { status: 404 });
    }

    if (approval.status !== "PENDING") {
      return NextResponse.redirect(
        new URL(`/gen/esg/workforce/approve?token=${token}`, req.url)
      );
    }

    if (approval.expiresAt.getTime() < Date.now()) {
      await db.reportApprovalToken.update({
        where: { token },
        data: {
          status: "EXPIRED",
          actedAt: new Date(),
        },
      });

      return NextResponse.redirect(
        new URL(`/gen/esg/workforce/approve?token=${token}`, req.url)
      );
    }

    await db.reportDayStatus.update({
      where: {
        tenantId_reportId_day: {
          tenantId: approval.tenantId,
          reportId: approval.reportId,
          day: approval.day,
        },
      },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy: approval.approverEmail ?? null,
      },
    });

    await db.reportApprovalToken.update({
      where: { token },
      data: {
        status: "APPROVED",
        actedAt: new Date(),
      },
    });

    if (approval.requesterEmail) {
      const appUrl =
        process.env.APP_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3001";

      const reportLink =
        `${appUrl}/gen/esg/workforce` +
        `?tab=data-entry` +
        `&date=${formatYmdLocal(approval.day)}` +
        `&rev=${approval.revisionNo}`;

      await sendEmailViaResend({
        to: approval.requesterEmail,
        subject: `Approved: ${approval.reportName} / ${approval.documentNumber ?? approval.reportCode}`,
        html: `
          <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5">
            <p>Dear ${approval.requesterName || "User"},</p>

            <p>Your submitted report has been <strong>APPROVED</strong>.</p>

            <p>
              <strong>Report:</strong> ${approval.reportName}<br/>
              <strong>Date:</strong> ${formatYmdLocal(approval.day)}<br/>
              <strong>Revision:</strong> ${approval.revisionNo}<br/>
              <strong>Document No:</strong> ${approval.documentNumber ?? "-"}
            </p>

            <p>
              <a href="${reportLink}" style="display:inline-block;padding:10px 16px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px">
                Open Report
              </a>
            </p>

            <p>Best regards,<br/>iFlowX System</p>
          </div>
        `,
      });
    }

    return NextResponse.redirect(
      new URL(`/gen/esg/workforce/approve?token=${token}`, req.url)
    );
  } catch (e) {
    console.error("WORKFORCE_APPROVE_ERROR", e);
    return NextResponse.json({ error: "Approve failed." }, { status: 500 });
  }
}
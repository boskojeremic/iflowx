import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateInviteToken, hashToken } from "@/lib/inviteToken";
import { requireAdmin } from "@/lib/rbac";
import { sendInviteEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/url";

export const runtime = "nodejs";

export async function POST(req: Request) {
  console.log("[INVITES] ROUTE_HIT");

  try {
    const session = (await getServerSession(authOptions as any)) as any;
    console.log("[INVITES] session user:", session?.user?.email ?? null);

    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });
    }

    const me = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, isSuperAdmin: true },
    });

    console.log("[INVITES] me:", me);

    if (!me) {
      return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });
    }

    const body = await req.json();

    const tenantId = String(body.tenantId || "");
    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "VIEWER");

    console.log("[INVITES] payload:", { tenantId, email, role });

    if (!tenantId || !email) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
    }

    const okAdmin = me.isSuperAdmin ? true : await requireAdmin(tenantId, me.id);
    console.log("[INVITES] okAdmin:", okAdmin);

    if (!okAdmin) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    // 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const token = generateInviteToken();
    const tokenHash = hashToken(token);

    const invite = await db.invite.create({
      data: {
        tenantId,
        email,
        role: role as any,
        tokenHash,
        expiresAt,
      },
      select: { id: true },
    });

    console.log("[INVITES] invite created:", invite.id);

    const baseUrl = await getBaseUrl();
    const inviteUrl = `${baseUrl}/invite/${token}`;
    console.log("[INVITES] baseUrl/inviteUrl:", { baseUrl, inviteUrl });

    let emailed = false;
    let emailError: string | null = null;

    try {
      const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      });

      console.log("[INVITES] SENDING_EMAIL", {
        to: email,
        tenantId,
        tenantName: tenant?.name ?? null,
        role,
        hasResendKey: !!process.env.RESEND_API_KEY,
      });

      await sendInviteEmail({
        to: email,
        inviteUrl,
        tenantName: tenant?.name ?? "GHG App",
        role,
      });

      emailed = true;
      console.log("[INVITES] EMAIL_SENT_OK");
    } catch (e: any) {
      emailError = e?.message ?? String(e);
      console.error("[INVITES] INVITE_EMAIL_FAILED:", e);
    }

    // NOTE: privremeno vraćamo emailError radi debug-a
    return NextResponse.json({
      ok: true,
      inviteUrl,
      expiresAt,
      emailed,
      emailError,
    });
  } catch (e: any) {
    console.error("[INVITES] FATAL:", e);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

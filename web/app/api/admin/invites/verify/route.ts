import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/inviteToken";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = String(url.searchParams.get("token") || "").trim();

    if (!token) {
      return NextResponse.json({ ok: false, error: "MISSING_TOKEN" }, { status: 400 });
    }

    const tokenHash = hashToken(token);

    console.log("[INVITES_VERIFY] token:", token);
    console.log("[INVITES_VERIFY] tokenHash:", tokenHash);

    const invite = await db.invite.findFirst({
      where: { tokenHash },
      select: {
        email: true,
        role: true,
        expiresAt: true,
        acceptedAt: true,
        tenant: { select: { id: true, name: true, code: true } },
      },
    });

    if (!invite) {
      return NextResponse.json({ ok: false, error: "INVALID_TOKEN" }, { status: 404 });
    }

    if (invite.acceptedAt) {
      return NextResponse.json({ ok: false, error: "INVITE_ALREADY_USED" }, { status: 400 });
    }

    if (invite.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ ok: false, error: "INVITE_EXPIRED" }, { status: 400 });
    }

    // ✅ user MUST exist (created by Core Admin)
    const user = await db.user.findUnique({
      where: { email: invite.email },
      select: { name: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      email: invite.email,
      name: user.name, // ✅ NEW
      role: invite.role,
      expiresAt: invite.expiresAt,
      tenant: invite.tenant,
    });
  } catch (e: any) {
    console.error("[INVITES_VERIFY] ERROR:", e);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
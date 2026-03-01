import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/inviteToken";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const token = String(body?.token || "").trim();
  const password = String(body?.password || "");

  if (!token || !password) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: "PASSWORD_MIN_8_CHARS" }, { status: 400 });
  }

  const tokenHash = hashToken(token);

  const invite = await db.invite.findFirst({
    where: {
      tokenHash,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, tenantId: true, email: true, role: true },
  });

  if (!invite) {
    return NextResponse.json({ ok: false, error: "INVALID_OR_EXPIRED_INVITE" }, { status: 404 });
  }

  // ✅ user MUST exist (created by Core Admin)
  const user = await db.user.findUnique({
    where: { email: invite.email },
    select: { id: true, email: true, passwordHash: true },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });
  }

  // ✅ optional guard: disallow re-setting password via invite
  if (user.passwordHash) {
    return NextResponse.json({ ok: false, error: "PASSWORD_ALREADY_SET" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // ✅ ONLY update passwordHash (NO name/email)
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  await db.membership.upsert({
    where: { tenantId_userId: { tenantId: invite.tenantId, userId: user.id } },
    update: { role: invite.role as any, status: "ACTIVE" },
    create: { tenantId: invite.tenantId, userId: user.id, role: invite.role as any, status: "ACTIVE" },
  });

  await db.invite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
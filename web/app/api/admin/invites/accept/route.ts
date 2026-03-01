import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/inviteToken";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const token = String(body?.token || "");
  const name = String(body?.name || "").trim();
  const password = String(body?.password || "");

  if (!token || !password) {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, error: "PASSWORD_MIN_8_CHARS" },
      { status: 400 }
    );
  }

  const tokenHash = hashToken(token);

  const invite = await db.invite.findFirst({
    where: {
      tokenHash,
      acceptedAt: null,
      expiresAt: { gt: new Date() }, // ✔ validacija isteka
    },
    select: {
      id: true,
      tenantId: true,
      email: true,
      role: true,
    },
  });

  if (!invite) {
    return NextResponse.json(
      { ok: false, error: "INVALID_OR_EXPIRED_INVITE" },
      { status: 404 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await db.user.findUnique({
  where: { email: invite.email },
  select: { id: true, email: true },
});

let user: { id: string; email: string };

if (existing) {
  // ✅ existing user: do NOT overwrite password
  user = existing;

  // opcionalno: update name samo ako je prazno i ako je poslato
  if (name) {
    await db.user.update({
      where: { id: existing.id },
      data: { name },
    });
  }
} else {
  const passwordHash = await bcrypt.hash(password, 10);

  user = await db.user.create({
    data: {
      email: invite.email,
      name: name || undefined,
      passwordHash,
    },
    select: { id: true, email: true },
  });
}
  await db.membership.upsert({
    where: {
      tenantId_userId: {
        tenantId: invite.tenantId,
        userId: user.id,
      },
    },
    update: {
      role: invite.role,
      status: "ACTIVE",
    },
    create: {
      tenantId: invite.tenantId,
      userId: user.id,
      role: invite.role,
      status: "ACTIVE",
    },
  });

  await db.invite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

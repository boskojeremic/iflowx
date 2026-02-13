import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateInviteToken, hashToken } from "@/lib/inviteToken";
import { requireAdmin } from "@/lib/rbac";
import { sendInviteEmail } from "@/lib/email";

function clampInt(v: unknown, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (i < min || i > max) return null;
  return i;
}

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions)) as any;
  if (!session?.user?.email) {
    return NextResponse.json({ error: "UNAUTH" }, { status: 401 });
  }

  const me = await db.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!me) {
    return NextResponse.json({ error: "UNAUTH" }, { status: 401 });
  }

  const body = await req.json();

  const tenantId = String(body.tenantId || "");
  const email = String(body.email || "").trim().toLowerCase();
  const role = String(body.role || "VIEWER");

  const validityDays = clampInt(body.validityDays, 1, 365);
  if (validityDays === null) {
    return NextResponse.json(
      { error: "VALIDITY_DAYS_REQUIRED" },
      { status: 400 }
    );
  }

  if (!tenantId || !email) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const okAdmin = await requireAdmin(tenantId, me.id);
  if (!okAdmin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const expiresAt = new Date(
    Date.now() + validityDays * 24 * 60 * 60 * 1000
  );

  const token = generateInviteToken();
  const tokenHash = hashToken(token);

  await db.invite.create({
    data: {
      tenantId,
      email,
      role: role as any,
      tokenHash,
      expiresAt,
    },
  });

  const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${token}`;

  try {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    await sendInviteEmail({
      to: email,
      inviteUrl,
      tenantName: tenant?.name ?? "GHG App",
      role,
    });

  } catch (e) {
    console.error("INVITE_EMAIL_FAILED:", e);
  }

  return NextResponse.json({
    ok: true,
    inviteUrl,
    expiresAt,
  });
}

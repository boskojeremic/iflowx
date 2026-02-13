import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/inviteToken";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";

  if (!token) {
    return NextResponse.json({ ok: false, error: "MISSING_TOKEN" }, { status: 400 });
  }

  const tokenHash = hashToken(token);

  const invite = await db.invite.findFirst({
    where: {
      tokenHash,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      email: true,
      role: true,
      tenant: { select: { id: true, name: true, code: true } },
      expiresAt: true,
    },
  });

  if (!invite) {
    return NextResponse.json({ ok: false, error: "INVALID_OR_EXPIRED_INVITE" }, { status: 404 });
  }

  const session = await getServerSession(authOptions);

  return NextResponse.json({
    ok: true,
    email: invite.email,
    role: invite.role,
    tenant: invite.tenant,
    expiresAt: invite.expiresAt,
    signedIn: !!session?.user?.email,
  });
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/inviteToken";

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
      email: true,
      role: true,
      expiresAt: true,
      tenant: { select: { id: true, name: true, code: true } },
    },
  });

  if (!invite) {
    return NextResponse.json({ ok: false, error: "INVALID_OR_EXPIRED_INVITE" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...invite });
}

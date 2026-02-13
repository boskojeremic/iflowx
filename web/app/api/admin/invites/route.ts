import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateInviteToken, hashToken } from "@/lib/inviteToken";
import { requireAdmin } from "@/lib/rbac";
import { sendInviteEmail } from "@/lib/email";

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions)) as any;
if (!session?.user?.email)
    return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  const me = await db.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!me)
    return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  const body = await req.json();

  const tenantId = String(body.tenantId || "");
  const email = String(body.email || "").trim().toLowerCase();
  const role = String(body.role || "VIEWER");

  if (!tenantId || !email)
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

  const okAdmin = await requireAdmin(tenantId, me.id);
  if (!okAdmin)
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  // 🔒 HARD CODED 7 DAYS VALIDITY
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
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

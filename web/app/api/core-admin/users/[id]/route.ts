import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/authz";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireSA() {
  const me = await getCurrentUser();
  if (!me || !me.isSuperAdmin) return null;
  return me;
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const me = await requireSA();
  if (!me) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

  const body = await req.json().catch(() => ({}));

  const name =
    body.name === null ? null : String(body.name || "").trim() || null;

  const emailRaw = body.email;
  const email =
    emailRaw === undefined || emailRaw === null
      ? undefined
      : String(emailRaw || "").trim().toLowerCase();

  if (email !== undefined && !email) {
    return NextResponse.json({ error: "EMAIL_REQUIRED" }, { status: 400 });
  }

  try {
    const user = await db.user.update({
      where: { id },
      data: {
        name,
        ...(email !== undefined ? { email } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        isSuperAdmin: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (e: any) {
    const code = String(e?.code ?? "");

    if (code === "P2025") {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }

    // unique constraint (email already exists)
    if (code === "P2002") {
      return NextResponse.json({ error: "EMAIL_ALREADY_EXISTS" }, { status: 409 });
    }

    return NextResponse.json(
      { error: "UPDATE_FAILED", code: e?.code ?? null, message: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const me = await requireSA();
  if (!me) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

  if (id === me.id) {
    return NextResponse.json({ error: "CANNOT_DELETE_SELF" }, { status: 400 });
  }

  try {
    await db.membership.deleteMany({ where: { userId: id } });
    await db.session.deleteMany({ where: { userId: id } });
    await db.account.deleteMany({ where: { userId: id } });

    const del = await db.user.deleteMany({ where: { id } });
    if (del.count === 0) {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: "DELETE_FAILED", code: e?.code ?? null, message: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
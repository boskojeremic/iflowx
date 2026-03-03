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

type UserType = "USER" | "TENANT_ADMIN" | "CORE_ADMIN";

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const me = await requireSA();
  if (!me) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

  const body = await req.json().catch(() => ({}));

  const typeRaw = body.type;
  const type: UserType | undefined =
    typeRaw === undefined || typeRaw === null
      ? undefined
      : (String(typeRaw).trim().toUpperCase() as UserType);

  const tenantIdRaw = body.tenantId;
  const tenantId: string | undefined =
    tenantIdRaw === undefined || tenantIdRaw === null ? undefined : String(tenantIdRaw).trim();

  const name = body.name === null ? null : String(body.name || "").trim() || null;

  const emailRaw = body.email;
  const email =
    emailRaw === undefined || emailRaw === null ? undefined : String(emailRaw || "").trim().toLowerCase();

  if (email !== undefined && !email) {
    return NextResponse.json({ error: "EMAIL_REQUIRED" }, { status: 400 });
  }

  // ✅ prevent demoting yourself
  if (id === me.id && type && type !== "CORE_ADMIN") {
    return NextResponse.json({ error: "CANNOT_DEMOTE_SELF" }, { status: 400 });
  }

  // ✅ Validate type
  if (type !== undefined && !["USER", "TENANT_ADMIN", "CORE_ADMIN"].includes(type)) {
    return NextResponse.json({ error: "TYPE_INVALID" }, { status: 400 });
  }

  // ✅ If TENANT_ADMIN → tenantId required
  if (type === "TENANT_ADMIN" && !tenantId) {
    return NextResponse.json({ error: "TENANT_ID_REQUIRED" }, { status: 400 });
  }

  // Build user update data
  const userData: any = {
    name,
    ...(email !== undefined ? { email } : {}),
    ...(type !== undefined ? { isSuperAdmin: type === "CORE_ADMIN" } : {}),
  };

  try {
    const user = await db.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: userData,
        select: {
          id: true,
          email: true,
          name: true,
          isSuperAdmin: true,
          createdAt: true,
        },
      });

      // If TENANT_ADMIN → ensure membership ADMIN ACTIVE for selected tenant
      if (type === "TENANT_ADMIN") {
        await tx.membership.upsert({
          where: { tenantId_userId: { tenantId: tenantId!, userId: id } },
          update: { role: "ADMIN", status: "ACTIVE" },
          create: { tenantId: tenantId!, userId: id, role: "ADMIN", status: "ACTIVE" },
        });
      }

      return u;
    });

    return NextResponse.json({ ok: true, user });
  } catch (e: any) {
    const code = String(e?.code ?? "");

    if (code === "P2025") return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    if (code === "P2002") return NextResponse.json({ error: "EMAIL_ALREADY_EXISTS" }, { status: 409 });

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
    if (del.count === 0) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: "DELETE_FAILED", code: e?.code ?? null, message: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
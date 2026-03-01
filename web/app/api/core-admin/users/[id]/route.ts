// app/api/core-admin/users/[id]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/authz";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireSA() {
  const me = await getCurrentUser();
  if (!me || !me.isSuperAdmin) return null;
  return me;
}

function getIdFromReqUrl(req: Request) {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || null; // poslednji segment
  } catch {
    return null;
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const me = await requireSA();
  if (!me) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const id = params?.id ?? getIdFromReqUrl(req);
  if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

  const body = await req.json().catch(() => ({} as any));
  const name =
    body?.name === null ? null : String(body?.name ?? "").trim() || null;

  try {
    const user = await db.user.update({
      where: { id },
      data: { name },
      select: { id: true, email: true, name: true, isSuperAdmin: true, createdAt: true },
    });
    return NextResponse.json({ user });
  } catch (e: any) {
    if (String(e?.code) === "P2025") {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "UPDATE_FAILED", code: e?.code ?? null, message: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const me = await requireSA();
  if (!me) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const id = params?.id ?? getIdFromReqUrl(req);
  if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

  if (id === me.id) {
    return NextResponse.json({ error: "CANNOT_DELETE_SELF" }, { status: 400 });
  }

  await db.membership.deleteMany({ where: { userId: id } });
  await db.session.deleteMany({ where: { userId: id } });
  await db.account.deleteMany({ where: { userId: id } });

  const del = await db.user.deleteMany({ where: { id } });
  if (del.count === 0) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
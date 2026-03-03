import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/authz";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireSA() {
  const me = await getCurrentUser();
  if (!me || !me.isSuperAdmin) return null;
  return me;
}

export async function GET() {
  const me = await requireSA();
  if (!me) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      isSuperAdmin: true,
      createdAt: true,
      memberships: {
        select: { role: true, status: true, tenantId: true },
      },
    },
  });

  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const me = await requireSA();
  if (!me) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const name = body.name === null ? null : String(body.name || "").trim() || null;

  const type = String(body.type || "TENANT_ADMIN"); // "TENANT_ADMIN" | "CORE_ADMIN"
  const tenantId = body.tenantId ? String(body.tenantId) : null;

  if (!email) return NextResponse.json({ error: "EMAIL_REQUIRED" }, { status: 400 });

  if (type === "TENANT_ADMIN" && !tenantId) {
    return NextResponse.json({ error: "TENANT_ID_REQUIRED" }, { status: 400 });
  }

  try {
    // ✅ 1) upsert user: ako email postoji, ne puca na unique
    const user = await db.user.upsert({
      where: { email },
      create: {
        email,
        name,
        isSuperAdmin: type === "CORE_ADMIN",
      },
      update: {
        // name update samo ako je poslato (ne diramo ako je prazno)
        ...(name !== null ? { name } : {}),
        isSuperAdmin: type === "CORE_ADMIN" ? true : undefined,
      },
      select: { id: true, email: true, name: true, isSuperAdmin: true, createdAt: true },
    });

    // ✅ 2) ako je TENANT_ADMIN: obezbedi membership INVITED (da se odmah vidi u tabeli)
    if (type === "TENANT_ADMIN" && tenantId) {
      await db.membership.upsert({
  where: {
    tenantId_userId: {
      tenantId,
      userId: user.id,
    },
  },
  create: {
    tenantId,
    userId: user.id,
    role: "ADMIN",
    status: "INVITED",
    createdByUserId: me.id,
  },
  update: {
    role: "ADMIN",
    // ✅ NE DIRAJ status ovde (da ne pređe u ACTIVE kad edit/save bez invite accept)
    // status: "INVITED"  <-- nemoj
  },
});
    }

    return NextResponse.json({ user, ok: true });
  } catch (e: any) {
    // ✅ 3) ako ipak dođe unique (drugačiji slučaj), vrati 409
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "EMAIL_EXISTS" }, { status: 409 });
    }

    return NextResponse.json(
      { error: "CREATE_FAILED", code: e?.code ?? null, message: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
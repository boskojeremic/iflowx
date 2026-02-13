import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

function slugCode(x: string) {
  return x
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
}

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return null;

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });
  if (!user) return null;

  // ✅ SUPERADMIN LOGIKA (najjednostavnije):
  // 1) ako je email u env listi SUPERADMINS
  const superAdmins = (process.env.SUPERADMINS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const isSuperAdmin = superAdmins.includes(user.email.toLowerCase());

  return { ...user, isSuperAdmin };
}

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });

  // SuperAdmin vidi sve
  if (me.isSuperAdmin) {
    const tenants = await db.tenant.findMany({
      select: { id: true, name: true, code: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ ok: true, tenants });
  }

  // Ostali vide samo svoje tenante preko membership
  const rows = await db.membership.findMany({
    where: { userId: me.id, status: "ACTIVE" },
    select: {
      tenant: { select: { id: true, name: true, code: true, createdAt: true } },
    },
    orderBy: { tenant: { createdAt: "desc" } },
  });

  return NextResponse.json({ ok: true, tenants: rows.map((r) => r.tenant) });
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });
  if (!me.isSuperAdmin) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const codeRaw = String(body?.code ?? "").trim();

  if (!name) return NextResponse.json({ ok: false, error: "NAME_REQUIRED" }, { status: 400 });

  const code = slugCode(codeRaw || name);
  if (!code) return NextResponse.json({ ok: false, error: "CODE_INVALID" }, { status: 400 });

  const tenant = await db.tenant.create({
    data: { name, code },
    select: { id: true, name: true, code: true, createdAt: true },
  });

  await db.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: me.id } },
    update: { role: "OWNER", status: "ACTIVE" },
    create: { tenantId: tenant.id, userId: me.id, role: "OWNER", status: "ACTIVE" },
  });

  return NextResponse.json({ ok: true, tenant });
}

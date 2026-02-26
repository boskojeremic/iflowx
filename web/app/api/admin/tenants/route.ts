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
  const session = (await getServerSession(authOptions as any)) as any;
  const email = session?.user?.email;
  if (!email) return null;

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, isSuperAdmin: true },
  });

  return user;
}

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });

  // SuperAdmin vidi sve
  if (me.isSuperAdmin) {
    const tenants = await db.tenant.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ ok: true, tenants });
  }

  // Ostali vide samo svoje tenante preko membership
  const rows = await db.membership.findMany({
    where: { userId: me.id, status: "ACTIVE" },
    select: {
      tenant: {
        select: {
          id: true,
          name: true,
          code: true,
          createdAt: true,
        },
      },
    },
    orderBy: { tenant: { createdAt: "desc" } },
  });

  return NextResponse.json({
    ok: true,
    tenants: rows.map((r) => r.tenant),
  });
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });
  if (!me.isSuperAdmin) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json().catch(() => null);

  const nameRaw = String(body?.name ?? "").trim();
  const codeRaw = String(body?.code ?? "").trim();

  if (!nameRaw) return NextResponse.json({ ok: false, error: "NAME_REQUIRED" }, { status: 400 });

  const code = slugCode(codeRaw || nameRaw);
  if (!code) return NextResponse.json({ ok: false, error: "CODE_INVALID" }, { status: 400 });

  const name = nameRaw.toUpperCase();


  const tenant = await db.tenant.create({
    data: {
      name,
      code,
    },
    select: {
      id: true,
      name: true,
      code: true,
      createdAt: true,
    },
  });

  // creator postaje OWNER u tom tenant-u
  await db.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: me.id } },
    update: { role: "OWNER", status: "ACTIVE" },
    create: { tenantId: tenant.id, userId: me.id, role: "OWNER", status: "ACTIVE" },
  });

  return NextResponse.json({ ok: true, tenant });
}

export async function PATCH(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });
  if (!me.isSuperAdmin) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json().catch(() => null);

  const tenantId = String(body?.tenantId ?? "").trim();
  if (!tenantId) return NextResponse.json({ ok: false, error: "TENANT_ID_REQUIRED" }, { status: 400 });

  const name =
    body?.name === undefined || body?.name === null ? undefined : String(body.name).trim().toUpperCase();

  const code =
    body?.code === undefined || body?.code === null ? undefined : slugCode(String(body.code).trim());

  const isActive =
    body?.isActive === undefined || body?.isActive === null ? undefined : Boolean(body.isActive);

  const updated = await db.tenant.update({
    where: { id: tenantId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(code !== undefined ? { code } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    select: {
      id: true,
      name: true,
      code: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, tenant: updated });
}

export async function DELETE(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });
  if (!me.isSuperAdmin) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const url = new URL(req.url);
  const tenantId = String(url.searchParams.get("tenantId") ?? "").trim();
  if (!tenantId) return NextResponse.json({ ok: false, error: "TENANT_ID_REQUIRED" }, { status: 400 });

  try {
    await db.$transaction(async (tx) => {
      await tx.measurementReading.deleteMany({ where: { tenantId } });
      await tx.measurementPoint.deleteMany({ where: { tenantId } });

      await tx.apiKey.deleteMany({ where: { tenantId } });

      await tx.emissionResult.deleteMany({ where: { tenantId } });
      await tx.gHGInput.deleteMany({ where: { tenantId } });

      await tx.emitter.deleteMany({ where: { tenantId } });
      await tx.asset.deleteMany({ where: { tenantId } });
      await tx.reportingPeriod.deleteMany({ where: { tenantId } });

      await tx.invite.deleteMany({ where: { tenantId } });
      await tx.membership.deleteMany({ where: { tenantId } });

      // ✅ NOVO: očisti i tenant mappings ako ih već koristiš
      await tx.tenantModule.deleteMany({ where: { tenantId } });
      await tx.tenantIndustry.deleteMany({ where: { tenantId } });

      await tx.tenant.delete({ where: { id: tenantId } });
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "DELETE_FAILED" },
      { status: 500 }
    );
  }
}
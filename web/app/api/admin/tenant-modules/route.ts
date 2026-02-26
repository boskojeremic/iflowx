import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function requireSuperAdmin() {
  const session = (await getServerSession(authOptions as any)) as any;
  const email = session?.user?.email;
  if (!email) return { ok: false as const, res: NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 }) };

  const me = await db.user.findUnique({
    where: { email },
    select: { isSuperAdmin: true },
  });

  if (!me?.isSuperAdmin) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 }) };
  }

  return { ok: true as const };
}

export async function GET(req: Request) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.res;

  const url = new URL(req.url);
  const tenantId = String(url.searchParams.get("tenantId") ?? "").trim();
  const industryId = String(url.searchParams.get("industryId") ?? "").trim();
  if (!tenantId || !industryId) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  const tenantModules = await db.tenantModule.findMany({
    where: {
      tenantId,
      module: { industryId },
    },
    select: {
      id: true,
      tenantId: true,
      moduleId: true,
      status: true,
      seatLimit: true,
      startsAt: true,
      endsAt: true,
      createdAt: true,
    },
    orderBy: [{ module: { sortOrder: "asc" } }, { createdAt: "desc" }],
  });

  return NextResponse.json({ ok: true, tenantModules });
}

export async function PATCH(req: Request) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.res;

  const body = await req.json().catch(() => ({}));
  const tenantId = String(body.tenantId ?? "").trim();
  const moduleId = String(body.moduleId ?? "").trim();
  if (!tenantId || !moduleId) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  const seatLimit =
    body.seatLimit === undefined || body.seatLimit === null
      ? undefined
      : Math.max(1, Number(body.seatLimit) || 1);

  const startsAt =
    body.startsAt === undefined ? undefined : body.startsAt ? new Date(body.startsAt) : null;

  const endsAt =
    body.endsAt === undefined ? undefined : body.endsAt ? new Date(body.endsAt) : null;

  const status =
    body.status === "ACTIVE" || body.status === "DISABLED" ? body.status : undefined;

  const row = await db.tenantModule.upsert({
    where: { tenantId_moduleId: { tenantId, moduleId } },
    update: {
      ...(seatLimit !== undefined ? { seatLimit } : {}),
      ...(startsAt !== undefined ? { startsAt } : {}),
      ...(endsAt !== undefined ? { endsAt } : {}),
      ...(status !== undefined ? { status } : {}),
    },
    create: {
      tenantId,
      moduleId,
      seatLimit: seatLimit ?? 1,
      startsAt: startsAt ?? null,
      endsAt: endsAt ?? null,
      status: status ?? "DISABLED",
    },
    select: {
      id: true,
      tenantId: true,
      moduleId: true,
      status: true,
      seatLimit: true,
      startsAt: true,
      endsAt: true,
    },
  });

  return NextResponse.json({ ok: true, tenantModule: row });
}
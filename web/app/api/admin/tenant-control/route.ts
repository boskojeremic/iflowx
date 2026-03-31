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

function toISO(d: Date | null | undefined) {
  return d ? d.toISOString() : null;
}

export async function GET(req: Request) {
  const me = await requireSA();
  if (!me) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const url = new URL(req.url);
  const tenantId = String(url.searchParams.get("tenantId") || "").trim();
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "TENANT_ID_REQUIRED" }, { status: 400 });
  }

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      code: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!tenant) {
    return NextResponse.json({ ok: false, error: "TENANT_NOT_FOUND" }, { status: 404 });
  }

  const tenantModules = await db.tenantModule.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      status: true,
      startsAt: true,
      endsAt: true,
      seatLimit: true,
      module: {
        select: {
          id: true,
          code: true,
          name: true,
          sortOrder: true,
          Industry: {
            select: {
              id: true,
              code: true,
              name: true,
              sortOrder: true,
            },
          },
        },
      },
    },
    orderBy: [
      { module: { Industry: { sortOrder: "asc" } } },
      { module: { sortOrder: "asc" } },
      { createdAt: "asc" },
    ],
  });

  const memberships = await db.membership.findMany({
    where: {
      tenantId,
      status: { not: "DISABLED" },
    },
    select: { role: true, status: true },
  });

  const activeUsers = memberships.filter((m) => m.status === "ACTIVE").length;
  const invitedUsers = memberships.filter((m) => m.status === "INVITED").length;

  const activeAdmins = memberships.filter(
    (m) => m.status === "ACTIVE" && (m.role === "ADMIN" || m.role === "OWNER")
  ).length;

  const invitedAdmins = memberships.filter(
    (m) => m.status === "INVITED" && (m.role === "ADMIN" || m.role === "OWNER")
  ).length;

  const byIndustry: Array<{
    industry: { id: string; code: string; name: string; sortOrder: number };
    modules: Array<{
      id: string;
      status: string;
      startsAt: string | null;
      endsAt: string | null;
      seatLimit: number;
      module: { id: string; code: string; name: string; sortOrder: number };
    }>;
  }> = [];

  const map = new Map<string, (typeof byIndustry)[number]>();

  for (const tm of tenantModules) {
    const ind = tm.module.Industry;
    const key = ind.id;

    if (!map.has(key)) {
      const entry = {
        industry: {
          id: ind.id,
          code: ind.code,
          name: ind.name,
          sortOrder: ind.sortOrder,
        },
        modules: [],
      };
      map.set(key, entry);
      byIndustry.push(entry);
    }

    map.get(key)!.modules.push({
      id: tm.id,
      status: tm.status,
      startsAt: toISO(tm.startsAt),
      endsAt: toISO(tm.endsAt),
      seatLimit: tm.seatLimit,
      module: {
        id: tm.module.id,
        code: tm.module.code,
        name: tm.module.name,
        sortOrder: tm.module.sortOrder,
      },
    });
  }

  byIndustry.sort((a, b) => a.industry.sortOrder - b.industry.sortOrder);

  return NextResponse.json({
    ok: true,
    tenant: {
      ...tenant,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    },
    stats: { activeUsers, invitedUsers, activeAdmins, invitedAdmins },
    industries: byIndustry,
  });
}
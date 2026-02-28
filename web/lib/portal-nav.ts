// lib/portal-nav.ts
import { db } from "@/lib/db";
import type { MemberRole } from "@prisma/client";

export type PortalNavItem = {
  industryCode: string;
  industryName: string;
  industrySort: number;
  modules: {
    code: string;
    name: string;
    routePath: string;
    sortOrder: number;
  }[];
};

function isWithinWindow(now: Date, start: Date | null, end: Date | null) {
  if (start && start > now) return false;
  if (end && end < now) return false;
  return true;
}

export async function getPortalNavForUserTenant(userId: string, tenantId: string) {
  const now = new Date();

  // 1) Membership gate (ACTIVE + access window)
  const membership = await db.membership.findFirst({
    where: {
      userId,
      tenantId,
      status: "ACTIVE",
      OR: [{ accessStartsAt: null }, { accessStartsAt: { lte: now } }],
      AND: [{ OR: [{ accessEndsAt: null }, { accessEndsAt: { gte: now } }] }],
    },
    select: { id: true, role: true, accessStartsAt: true, accessEndsAt: true },
  });

  if (!membership) return [];

  // 2) Tenant modules gate (ACTIVE + window + module active)
  const tms = await db.tenantModule.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      module: { isActive: true },
    },
    select: {
      module: {
        select: {
          id: true,
          code: true,
          name: true,
          routePath: true,
          sortOrder: true,
          industry: {
            select: {
              id: true,
              code: true,
              name: true,
              sortOrder: true,
              isActive: true,
            },
          },
        },
      },
    },
  });

  // 3) Group by industry, filter routePath
  const grouped = new Map<string, PortalNavItem>();

  for (const row of tms) {
    const m = row.module;
    const ind = m.industry;

    if (!ind?.isActive) continue;
    if (!m.routePath || String(m.routePath).trim() === "") continue;

    const key = ind.id;

    if (!grouped.has(key)) {
      grouped.set(key, {
        industryCode: ind.code,
        industryName: ind.name,
        industrySort: ind.sortOrder ?? 100,
        modules: [],
      });
    }

    grouped.get(key)!.modules.push({
      code: m.code,
      name: m.name,
      routePath: String(m.routePath),
      sortOrder: m.sortOrder ?? 100,
    });
  }

  // 4) Sort modules + industries, drop empty groups
  const nav = Array.from(grouped.values())
    .map((g) => ({
      ...g,
      modules: g.modules.sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    .filter((g) => g.modules.length > 0)
    .sort((a, b) => a.industrySort - b.industrySort || a.industryName.localeCompare(b.industryName));

  return nav;
}
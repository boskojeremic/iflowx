// lib/portal-nav.ts
import { db } from "@/lib/db";

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

export async function getPortalNavForTenant(tenantId: string) {
  const now = new Date();

  const tis = await db.tenantIndustry.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
      industry: { isActive: true },
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    select: {
      industry: {
        select: {
          id: true,
          code: true,
          name: true,
          modules: {
            where: { isActive: true },
            select: {
              id: true,
              code: true,
              name: true,
              routePath: true,
              sortOrder: true,
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
    orderBy: { industry: { name: "asc" } },
  });

  const tenantMods = await db.tenantModule.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    select: {
      moduleId: true,
      module: { select: { id: true, isActive: true } },
    },
  });

  const allowedModuleIds = new Set(
    tenantMods.filter((x) => x.module?.isActive).map((x) => x.moduleId)
  );

  const nav: PortalNavItem[] = tis
    .map((ti) => {
      const ind = ti.industry;

      const modules = (ind.modules ?? [])
        .filter((m) => !!m.routePath)
        .filter((m) => allowedModuleIds.has(m.id))
        .map((m) => ({
          code: m.code,
          name: m.name,
          routePath: String(m.routePath),
          sortOrder: m.sortOrder ?? 100,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder);

      return {
        industryCode: ind.code,
        industryName: ind.name,
        industrySort: 100, // ako dodaš sortOrder u Industry, promenimo ovde
        modules,
      };
    })
    .filter((x) => x.modules.length > 0);

  return nav;
}
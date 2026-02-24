// lib/portal-nav.ts
import { db } from "@/lib/db";

export type PortalNavItem = {
  platformCode: string;
  platformName: string;
  platformSort: number;
  modules: {
    code: string;
    name: string;
    routePath: string;
    sortOrder: number;
  }[];
};

export async function getPortalNavForTenant(tenantId: string) {
  const now = new Date();

  // 1) TenantPlatforms (koje platforme tenant ima)
  const tps = await db.tenantPlatform.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
      platform: { isActive: true },
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [
        {
          OR: [{ endsAt: null }, { endsAt: { gte: now } }],
        },
      ],
    },
    select: {
      platform: {
        select: {
          id: true,
          code: true,
          name: true,
          sortOrder: true,
          modules: {
            where: { isActive: true },
            select: {
              id: true,
              code: true,
              name: true,
              routePath: true,
              sortOrder: true,
              isAddon: true,
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
    orderBy: { platform: { sortOrder: "asc" } },
  });

  // 2) TenantModules (koje module tenant ima)
  const tenantMods = await db.tenantModule.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [
        {
          OR: [{ endsAt: null }, { endsAt: { gte: now } }],
        },
      ],
    },
    select: {
      moduleId: true,
      module: {
        select: {
          id: true,
          isActive: true,
        },
      },
    },
  });

  const allowedModuleIds = new Set(
    tenantMods
      .filter((x) => x.module?.isActive)
      .map((x) => x.moduleId)
  );

  // 3) Grupisanje po platformama + filtriranje dozvoljenih modula
  const nav: PortalNavItem[] = tps
    .map((tp) => {
      const p = tp.platform;

      const modules = (p.modules ?? [])
        .filter((m) => !!m.routePath) // mora route da bi bio prikazan
        .filter((m) => allowedModuleIds.has(m.id)) // mora biti dodeljen tenant-u
        .map((m) => ({
          code: m.code,
          name: m.name,
          routePath: String(m.routePath),
          sortOrder: m.sortOrder ?? 100,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder);

      return {
        platformCode: p.code,
        platformName: p.name,
        platformSort: p.sortOrder ?? 100,
        modules,
      };
    })
    .filter((p) => p.modules.length > 0);

  return nav;
}
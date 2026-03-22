import { db } from "@/lib/db";
import { canManageTenantAdmin, canSeeMasterDataAdmin } from "@/lib/report-permissions";

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

export type PortalAdminLinks = {
  showTenantAdmin: boolean;
  showMasterDataAdmin: boolean;
};

export type PortalNavResult = {
  nav: PortalNavItem[];
  adminLinks: PortalAdminLinks;
};

export async function getPortalNavForUserTenant(
  userId: string,
  tenantId: string
): Promise<PortalNavResult> {
  const now = new Date();

  const membership = await db.membership.findFirst({
    where: {
      userId,
      tenantId,
      status: "ACTIVE",
      OR: [{ accessStartsAt: null }, { accessStartsAt: { lte: now } }],
      AND: [{ OR: [{ accessEndsAt: null }, { accessEndsAt: { gte: now } }] }],
    },
    select: {
      id: true,
      role: true,
      accessStartsAt: true,
      accessEndsAt: true,
    },
  });

  if (!membership) {
    return {
      nav: [],
      adminLinks: {
        showTenantAdmin: false,
        showMasterDataAdmin: false,
      },
    };
  }

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

  const nav = Array.from(grouped.values())
    .map((g) => ({
      ...g,
      modules: g.modules.sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    .filter((g) => g.modules.length > 0)
    .sort(
      (a, b) =>
        a.industrySort - b.industrySort ||
        a.industryName.localeCompare(b.industryName)
    );

  return {
    nav,
    adminLinks: {
      showTenantAdmin: canManageTenantAdmin(membership.role),
      showMasterDataAdmin: canSeeMasterDataAdmin(membership.role),
    },
  };
}
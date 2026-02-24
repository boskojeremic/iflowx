// lib/portalNav.ts
import { db } from "@/lib/db";

export async function getGroupedPortalNavForTenant(tenantId: string) {
  const now = new Date();

  const rows = await db.tenantModule.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
      OR: [
        { startsAt: null, endsAt: null },
        { startsAt: null, endsAt: { gt: now } },
        { startsAt: { lte: now }, endsAt: null },
        { startsAt: { lte: now }, endsAt: { gt: now } },
      ],
      module: {
        isActive: true,
        routePath: { not: null },
        platform: { isActive: true },
      },
    },
    select: {
      module: {
        select: {
          name: true,
          routePath: true,
          sortOrder: true,
          platform: {
            select: { id: true, name: true, sortOrder: true },
          },
        },
      },
    },
    orderBy: [
      { module: { platform: { sortOrder: "asc" } } },
      { module: { sortOrder: "asc" } },
      { module: { name: "asc" } },
    ],
  });

  // group by platformId
  const map = new Map<string, { title: string; pSort: number; items: { label: string; href: string; mSort: number }[] }>();

  for (const r of rows) {
    const m = r.module;
    if (!m?.routePath) continue;

    const pid = m.platform.id;
    if (!map.has(pid)) {
      map.set(pid, { title: m.platform.name, pSort: m.platform.sortOrder ?? 100, items: [] });
    }
    map.get(pid)!.items.push({ label: m.name, href: m.routePath, mSort: m.sortOrder ?? 100 });
  }

  // sort groups + items
  return Array.from(map.values())
    .sort((a, b) => (a.pSort - b.pSort) || a.title.localeCompare(b.title))
    .map((g) => ({
      title: g.title,
      items: g.items
        .sort((a, b) => (a.mSort - b.mSort) || a.label.localeCompare(b.label))
        .map(({ label, href }) => ({ label, href })),
    }));
}
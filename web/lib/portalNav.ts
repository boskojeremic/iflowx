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
      },
    },
    select: {
      module: {
        select: {
          id: true,
          name: true,
          routePath: true,
          sortOrder: true,
          industry: {
            select: {
              id: true,
              name: true,
              sortOrder: true,
            },
          },
        },
      },
    },
    orderBy: [
      { module: { industry: { sortOrder: "asc" } } },
      { module: { sortOrder: "asc" } },
      { module: { name: "asc" } },
    ],
  });

  const map = new Map<
    string,
    {
      title: string;
      iSort: number;
      items: { label: string; href: string; mSort: number }[];
    }
  >();

  for (const r of rows) {
    const m = r.module;
    if (!m?.routePath || !m.industry) continue;

    const iid = m.industry.id;

    if (!map.has(iid)) {
      map.set(iid, {
        title: m.industry.name,
        iSort: m.industry.sortOrder ?? 100,
        items: [],
      });
    }

    map.get(iid)!.items.push({
      label: m.name,
      href: m.routePath,
      mSort: m.sortOrder ?? 100,
    });
  }

  return Array.from(map.values())
    .sort((a, b) => a.iSort - b.iSort || a.title.localeCompare(b.title))
    .map((g) => ({
      title: g.title,
      items: g.items
        .sort((a, b) => a.mSort - b.mSort || a.label.localeCompare(b.label))
        .map(({ label, href }) => ({ label, href })),
    }));
}
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function getCurrentTenantContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const membership = await db.membership.findFirst({
    where: {
      user: { email: session.user.email },
      status: "ACTIVE",
    },
    select: {
      tenantId: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return membership ?? null;
}

export async function GET() {
  try {
    const ctx = await getCurrentTenantContext();

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantModules = await db.tenantModule.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: "ACTIVE",
      },
      select: {
        module: {
          select: {
            Industry: {
              select: {
                id: true,
                name: true,
                code: true,
                sortOrder: true,
              },
            },
          },
        },
      },
      orderBy: [
        { module: { Industry: { sortOrder: "asc" } } },
        { module: { Industry: { name: "asc" } } },
      ],
    });

    const map = new Map<
      string,
      { id: string; name: string; code: string; sortOrder: number }
    >();

    for (const row of tenantModules) {
      const industry = row.module?.Industry;
      if (!industry) continue;

      if (!map.has(industry.id)) {
        map.set(industry.id, {
          id: industry.id,
          name: industry.name,
          code: industry.code,
          sortOrder: industry.sortOrder ?? 100,
        });
      }
    }

    const industries = Array.from(map.values()).sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
    );

    return NextResponse.json({ industries });
  } catch (error) {
    console.error("GET /api/master-data/industries failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
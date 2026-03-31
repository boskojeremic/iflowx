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

export async function GET(req: Request) {
  try {
    const ctx = await getCurrentTenantContext();

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const industryId = String(searchParams.get("industryId") || "").trim();

    const tenantModules = await db.tenantModule.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: "ACTIVE",
        ...(industryId
          ? {
              module: {
                industryId,
              },
            }
          : {}),
      },
      select: {
        module: {
          select: {
            id: true,
            industryId: true,
            name: true,
            code: true,
            routePath: true,
            description: true,
            sortOrder: true,
            isAddon: true,
            isActive: true,
          },
        },
      },
      orderBy: [{ module: { sortOrder: "asc" } }, { module: { name: "asc" } }],
    });

    const modules = tenantModules.map((x) => ({
      id: x.module.id,
      industryId: x.module.industryId,
      name: x.module.name,
      code: x.module.code,
      routePath: x.module.routePath,
      description: x.module.description,
      sortOrder: x.module.sortOrder,
      isAddon: x.module.isAddon,
      isActive: x.module.isActive,
    }));

    return NextResponse.json({ modules });
  } catch (error) {
    console.error("GET /api/master-data/modules failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
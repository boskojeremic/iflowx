import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function getCurrentUserAndTenant(email: string) {
  const membership = await db.membership.findFirst({
    where: {
      user: { email },
      status: "ACTIVE",
    },
    select: {
      tenantId: true,
      tenant: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  return membership ?? null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const current = await getCurrentUserAndTenant(session.user.email);
    if (!current) {
      return NextResponse.json({ error: "No active tenant found" }, { status: 400 });
    }

    const tenantId = current.tenantId;

    const [rawUsers, operationalFunctions] = await Promise.all([
      db.user.findMany({
        where: {
          memberships: {
            some: {
              tenantId,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          email: true,
          name: true,
          isSuperAdmin: true,
          createdAt: true,
          memberships: {
            include: {
              tenant: {
                select: { id: true, name: true, code: true },
              },
              operationalFunction: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
      db.operationalFunction.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          abbreviation: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
    ]);

    const users = rawUsers.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      isSuperAdmin: u.isSuperAdmin,
      createdAt: u.createdAt.toISOString(),
      memberships: (u.memberships ?? []).map((m) => ({
        tenantId: m.tenantId,
        role: m.role,
        status: m.status,
        operationalFunctionId: m.operationalFunction?.id ?? null,
        operationalFunctionName: m.operationalFunction?.name ?? null,
        tenant: m.tenant
          ? {
              id: m.tenant.id,
              name: m.tenant.name,
              code: m.tenant.code,
            }
          : undefined,
      })),
    }));

    return NextResponse.json({
      tenant: current.tenant,
      users,
      operationalFunctions,
    });
  } catch (error) {
    console.error("GET /api/tenant-admin/users failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const current = await getCurrentUserAndTenant(session.user.email);
    if (!current) {
      return NextResponse.json({ error: "No active tenant found" }, { status: 400 });
    }

    const tenantId = current.tenantId;

    const body = await req.json();

    const email = String(body?.email ?? "").trim().toLowerCase();
    const name = body?.name ? String(body.name).trim() : null;
    const role = String(body?.role ?? "VIEWER") as
      | "OWNER"
      | "ADMIN"
      | "EDITOR"
      | "VIEWER";
    const operationalFunctionId = body?.operationalFunctionId
      ? String(body.operationalFunctionId)
      : null;

    if (!email) {
      return NextResponse.json({ error: "EMAIL_REQUIRED" }, { status: 400 });
    }

    if (operationalFunctionId) {
      const op = await db.operationalFunction.findFirst({
        where: {
          id: operationalFunctionId,
          tenantId,
        },
        select: { id: true },
      });

      if (!op) {
        return NextResponse.json(
          { error: "INVALID_OPERATIONAL_FUNCTION" },
          { status: 400 }
        );
      }
    }

    let user = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          email,
          name,
        },
        select: { id: true },
      });
    } else {
      await db.user.update({
        where: { id: user.id },
        data: {
          name,
        },
      });
    }

    const existingMembership = await db.membership.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId: user.id,
        },
      },
      select: { id: true },
    });

    if (!existingMembership) {
      await db.membership.create({
        data: {
          tenantId,
          userId: user.id,
          role,
          status: "ACTIVE",
          operationalFunctionId,
        },
      });
    } else {
      await db.membership.update({
        where: {
          tenantId_userId: {
            tenantId,
            userId: user.id,
          },
        },
        data: {
          role,
          operationalFunctionId,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("POST /api/tenant-admin/users failed:", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Unique constraint failed", code: "P2002" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
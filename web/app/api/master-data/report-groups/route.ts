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
      user: {
        select: {
          email: true,
        },
      },
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
    const moduleId = String(searchParams.get("moduleId") || "").trim();

    if (!moduleId) {
      return NextResponse.json({ reportGroups: [] });
    }

    const reportGroups = await db.reportGroup.findMany({
      where: {
        moduleId,
        isActive: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        moduleId: true,
        code: true,
        name: true,
        sortOrder: true,
        isActive: true,
      },
    });

    return NextResponse.json({ reportGroups });
  } catch (error) {
    console.error("GET /api/master-data/report-groups failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getCurrentTenantContext();

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const moduleId = String(body?.moduleId || "").trim();
    const code = String(body?.code || "").trim().toUpperCase();
    const name = String(body?.name || "").trim().toUpperCase();
    const sortOrder = Number(body?.sortOrder) || 100;

    if (!moduleId || !code || !name) {
      return NextResponse.json(
        { error: "MODULE_ID_CODE_NAME_REQUIRED" },
        { status: 400 }
      );
    }

    const exists = await db.reportGroup.findFirst({
      where: {
        moduleId,
        code,
      },
      select: { id: true },
    });

    if (exists) {
      return NextResponse.json(
        { error: "REPORT_GROUP_CODE_ALREADY_EXISTS" },
        { status: 409 }
      );
    }

    const item = await db.reportGroup.create({
      data: {
        id: crypto.randomUUID(),
        moduleId,
        code,
        name,
        sortOrder,
        isActive: true,
      },
      select: {
        id: true,
        moduleId: true,
        code: true,
        name: true,
        sortOrder: true,
        isActive: true,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("POST /api/master-data/report-groups failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
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
    const reportGroupId = String(searchParams.get("reportGroupId") || "").trim();

    if (!reportGroupId) {
      return NextResponse.json({ reports: [] });
    }

    const reports = await db.reportDefinition.findMany({
      where: {
        reportGroupId,
        isActive: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        reportGroupId: true,
        code: true,
        name: true,
        description: true,
        sortOrder: true,
        isActive: true,
      },
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("GET /api/master-data/reports failed:", error);
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

    const reportGroupId = String(body?.reportGroupId || "").trim();
    const code = String(body?.code || "").trim().toUpperCase();
    const name = String(body?.name || "").trim().toUpperCase();
    const description = body?.description ? String(body.description).trim() : null;
    const sortOrder = Number(body?.sortOrder) || 100;

    if (!reportGroupId || !code || !name) {
      return NextResponse.json(
        { error: "REPORT_GROUP_ID_CODE_NAME_REQUIRED" },
        { status: 400 }
      );
    }

    const group = await db.reportGroup.findFirst({
      where: {
        id: reportGroupId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: "INVALID_REPORT_GROUP" },
        { status: 400 }
      );
    }

    const exists = await db.reportDefinition.findFirst({
      where: {
        reportGroupId,
        code,
      },
      select: { id: true },
    });

    if (exists) {
      return NextResponse.json(
        { error: "REPORT_CODE_ALREADY_EXISTS" },
        { status: 409 }
      );
    }

    const item = await db.reportDefinition.create({
      data: {
        id: crypto.randomUUID(),
        reportGroupId,
        code,
        name,
        description,
        sortOrder,
        isActive: true,
      },
      select: {
        id: true,
        reportGroupId: true,
        code: true,
        name: true,
        description: true,
        sortOrder: true,
        isActive: true,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("POST /api/master-data/reports failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
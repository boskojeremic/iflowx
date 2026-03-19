import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function getCurrentTenantId(email: string) {
  const membership = await db.membership.findFirst({
    where: {
      user: { email },
      status: "ACTIVE",
    },
    select: {
      tenantId: true,
    },
  });

  return membership?.tenantId ?? null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getCurrentTenantId(session.user.email);
  if (!tenantId) {
    return NextResponse.json({ error: "No active tenant found" }, { status: 400 });
  }

  const items = await db.operationalFunction.findMany({
    where: { tenantId },
    include: {
      _count: {
        select: {
          memberships: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getCurrentTenantId(session.user.email);
    if (!tenantId) {
      return NextResponse.json({ error: "No active tenant found" }, { status: 400 });
    }

    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const abbreviation = String(body?.abbreviation ?? "").trim();

    if (!name || !abbreviation) {
      return NextResponse.json(
        { error: "Name and abbreviation are required" },
        { status: 400 }
      );
    }

    const existing = await db.operationalFunction.findFirst({
      where: {
        tenantId,
        abbreviation,
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Operational Function with this abbreviation already exists" },
        { status: 409 }
      );
    }

    const created = await db.operationalFunction.create({
      data: {
        tenantId,
        name,
        abbreviation,
        code: abbreviation,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/tenant-admin/operational-functions failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
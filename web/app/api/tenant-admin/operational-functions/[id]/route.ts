import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getCurrentTenantId(session.user.email);
    if (!tenantId) {
      return NextResponse.json({ error: "No active tenant found" }, { status: 400 });
    }

    const { id } = await params;
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
        id,
        tenantId,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Operational Function not found" }, { status: 404 });
    }

    const updated = await db.operationalFunction.update({
      where: { id },
      data: {
        name,
        abbreviation,
        code: abbreviation,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH operational function failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getCurrentTenantId(session.user.email);
    if (!tenantId) {
      return NextResponse.json({ error: "No active tenant found" }, { status: 400 });
    }

    const { id } = await params;

    const existing = await db.operationalFunction.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        _count: {
          select: {
            memberships: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Operational Function not found" }, { status: 404 });
    }

    if (existing._count.memberships > 0) {
      return NextResponse.json(
        { error: "Cannot delete function assigned to users" },
        { status: 409 }
      );
    }

    await db.operationalFunction.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE operational function failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
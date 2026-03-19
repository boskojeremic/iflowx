import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

export async function PATCH(req: Request, { params }: RouteContext) {
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
    const { id } = await params;

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

    const existingMembership = await db.membership.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId: id,
        },
      },
      select: { id: true },
    });

    if (!existingMembership) {
      return NextResponse.json({ error: "Membership not found" }, { status: 404 });
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

    const emailOwner = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (emailOwner && emailOwner.id !== id) {
      return NextResponse.json({ error: "EMAIL_ALREADY_EXISTS" }, { status: 409 });
    }

    await db.user.update({
      where: { id },
      data: {
        email,
        name,
      },
    });

    await db.membership.update({
      where: {
        tenantId_userId: {
          tenantId,
          userId: id,
        },
      },
      data: {
        role,
        operationalFunctionId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/tenant-admin/users/[id] failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
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
    const { id } = await params;

    const existingMembership = await db.membership.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId: id,
        },
      },
      select: { id: true },
    });

    if (!existingMembership) {
      return NextResponse.json({ error: "Membership not found" }, { status: 404 });
    }

    await db.membership.delete({
      where: {
        tenantId_userId: {
          tenantId,
          userId: id,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/tenant-admin/users/[id] failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
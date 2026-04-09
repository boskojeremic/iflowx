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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getCurrentTenantContext();

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const existing = await db.reportGroup.findFirst({
      where: {
        id,
      },
      select: {
        id: true,
        moduleId: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Report Group not found." }, { status: 404 });
    }

    const code = String(body.code ?? "").toUpperCase().trim();
    const name = String(body.name ?? "").trim().toUpperCase();
    const sortOrder = Number(body.sortOrder) || 100;

    if (!code || !name) {
      return NextResponse.json(
        { error: "CODE_AND_NAME_REQUIRED" },
        { status: 400 }
      );
    }

    const duplicate = await db.reportGroup.findFirst({
      where: {
        moduleId: existing.moduleId,
        code,
        NOT: {
          id,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "REPORT_GROUP_CODE_ALREADY_EXISTS" },
        { status: 409 }
      );
    }

    const item = await db.reportGroup.update({
      where: { id },
      data: {
        code,
        name,
        sortOrder,
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
    console.error("REPORT_GROUP_PATCH_ERROR", error);
    return NextResponse.json(
      { error: "Internal server error while updating Report Group." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getCurrentTenantContext();

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.reportGroup.findFirst({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Report Group not found." }, { status: 404 });
    }

    const reportsCount = await db.reportDefinition.count({
      where: {
        reportGroupId: id,
      },
    });

    if (reportsCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete Report Group because it already contains Reports. Delete Reports first.",
        },
        { status: 400 }
      );
    }

    await db.reportGroup.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("REPORT_GROUP_DELETE_ERROR", error);
    return NextResponse.json(
      { error: "Internal server error while deleting Report Group." },
      { status: 500 }
    );
  }
}
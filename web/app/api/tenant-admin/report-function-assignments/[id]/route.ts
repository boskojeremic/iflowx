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
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const current = await getCurrentUserAndTenant(session.user.email);

    if (!current) {
      return NextResponse.json(
        { error: "No active tenant found" },
        { status: 400 }
      );
    }

    const tenantId = current.tenantId;
    const { id } = await params;

    const body = await req.json();

    const responsibleFunctionId = body?.responsibleFunctionId
      ? String(body.responsibleFunctionId)
      : null;

    const approverFunctionId = body?.approverFunctionId
      ? String(body.approverFunctionId)
      : null;

    const existing = await db.tenantReportFunctionAssignment.findFirst({
      where: {
        id,
        tenantId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "ASSIGNMENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    const updated = await db.tenantReportFunctionAssignment.update({
      where: {
        id,
      },
      data: {
        responsibleFunctionId,
        approverFunctionId,
      },
    });

    return NextResponse.json({
      ok: true,
      item: updated,
    });
  } catch (error) {
    console.error("PATCH assignment failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const current = await getCurrentUserAndTenant(session.user.email);

    if (!current) {
      return NextResponse.json(
        { error: "No active tenant found" },
        { status: 400 }
      );
    }

    const tenantId = current.tenantId;
    const { id } = await params;

    const existing = await db.tenantReportFunctionAssignment.findFirst({
      where: {
        id,
        tenantId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "ASSIGNMENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    await db.tenantReportFunctionAssignment.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error("DELETE assignment failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
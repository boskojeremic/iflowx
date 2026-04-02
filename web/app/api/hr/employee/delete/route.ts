import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;

  if (!userEmail) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();

    const id = String(body?.id ?? "").trim();
    const mode = String(body?.mode ?? "").trim();

    if (!id || !mode) {
      return NextResponse.json(
        { ok: false, error: "Missing id or mode." },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: userEmail },
      select: {
        memberships: {
          where: { status: "ACTIVE" },
          orderBy: [{ createdAt: "desc" }],
          select: { tenantId: true },
        },
      },
    });

    const tenantId = user?.memberships?.[0]?.tenantId ?? null;
    if (!tenantId) {
      return NextResponse.json(
        { ok: false, error: "No active tenant." },
        { status: 400 }
      );
    }

    const employee = await db.employee.findFirst({
      where: {
        id,
        tenantId,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { ok: false, error: "Employee not found." },
        { status: 404 }
      );
    }

    if (mode === "inactive") {
      await db.employee.update({
        where: { id: employee.id },
        data: {
          isActive: false,
        },
      });

      return NextResponse.json({
        ok: true,
        mode: "inactive",
      });
    }

    if (mode === "delete") {
      await db.employee.delete({
        where: { id: employee.id },
      });

      return NextResponse.json({
        ok: true,
        mode: "delete",
      });
    }

    return NextResponse.json(
      { ok: false, error: "Invalid mode." },
      { status: 400 }
    );
  } catch (error) {
    console.error("EMPLOYEE_DELETE_ERROR", error);
    return NextResponse.json(
      { ok: false, error: "Failed to process employee delete request." },
      { status: 500 }
    );
  }
}
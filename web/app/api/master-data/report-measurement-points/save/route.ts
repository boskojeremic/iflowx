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

export async function POST(req: Request) {
  try {
    const ctx = await getCurrentTenantContext();

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const tenantId = ctx.tenantId;
    const reportId = String(body?.reportId || "").trim();
    const assignments = Array.isArray(body?.assignments) ? body.assignments : [];

    if (!reportId) {
      return NextResponse.json({ error: "REPORT_REQUIRED" }, { status: 400 });
    }

    const userEmail = ctx.user.email || "system";

    const currentActive = await db.reportMeasurementPoint.findMany({
      where: {
        tenantId,
        reportDefinitionId: reportId,
        updEndDt: null,
      },
      select: {
        id: true,
        measurementPointId: true,
        sortOrder: true,
      },
    });

    const incomingIds = new Set(
      assignments
        .map((x: { measurementPointId?: string }) => String(x?.measurementPointId || "").trim())
        .filter(Boolean)
    );

    const currentByPoint = new Map(currentActive.map((x) => [x.measurementPointId, x]));

    await db.$transaction(async (tx) => {
      // 1) Close rows that are no longer assigned
      for (const existing of currentActive) {
        if (!incomingIds.has(existing.measurementPointId)) {
          await tx.reportMeasurementPoint.update({
            where: { id: existing.id },
            data: {
              isActive: false,
              updEndDt: new Date(),
              updatedBy: userEmail,
            },
          });
        }
      }

      // 2) Upsert current assigned rows
      for (const [index, item] of assignments.entries()) {
        const measurementPointId = String(item?.measurementPointId || "").trim();
        if (!measurementPointId) continue;

        const sortOrder =
          typeof item.sortOrder === "number" && Number.isFinite(item.sortOrder)
            ? item.sortOrder
            : (index + 1) * 10;

        const existing = currentByPoint.get(measurementPointId);

        if (existing) {
          await tx.reportMeasurementPoint.update({
            where: { id: existing.id },
            data: {
              sortOrder,
              isActive: true,
              updEndDt: null,
              updatedBy: userEmail,
            },
          });
        } else {
          await tx.reportMeasurementPoint.create({
            data: {
              tenantId,
              reportDefinitionId: reportId,
              measurementPointId,
              sortOrder,
              isActive: true,
              createdBy: userEmail,
              updatedBy: userEmail,
              updEndDt: null,
            },
          });
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/master-data/report-measurement-points/save failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
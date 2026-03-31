import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { randomUUID } from "node:crypto";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildDocumentNumber } from "@/lib/fop/document-number";

export const runtime = "nodejs";

function toDateOnly(value: string) {
  return new Date(`${value}T00:00:00`);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const tenantId = String(body?.tenantId || "").trim();
    const reportId = String(body?.reportId || "").trim();
    const reportCode = String(body?.reportCode || "").trim().toUpperCase();
    const reportDate = String(body?.reportDate || "").trim();

    if (!tenantId || !reportId || !reportCode || !reportDate) {
      return NextResponse.json(
        {
          ok: false,
          error: "tenantId, reportId, reportCode and reportDate are required.",
        },
        { status: 400 }
      );
    }

    const activeMembership = await db.membership.findFirst({
      where: {
        tenantId,
        status: "ACTIVE",
        user: {
          email: session.user.email,
        },
      },
      select: {
        userId: true,
      },
    });

    if (!activeMembership?.userId) {
      return NextResponse.json(
        { ok: false, error: "You do not have access to this tenant." },
        { status: 403 }
      );
    }

    const snapshotDate = toDateOnly(reportDate);

    const latestSnapshot = await db.measurementSnapshot.findFirst({
      where: {
        tenantId,
        reportId,
        snapshotDate,
      },
      orderBy: [{ snapshotRevisionNo: "desc" }],
      include: {
        details: true,
      },
    });

    if (!latestSnapshot) {
      return NextResponse.json(
        { ok: false, error: "No existing revision found for this day." },
        { status: 404 }
      );
    }

    const newRevision = (latestSnapshot.snapshotRevisionNo ?? 0) + 1;
    const documentNumber = buildDocumentNumber(
      reportCode,
      reportDate,
      newRevision
    );

    const newSnapshot = await db.measurementSnapshot.create({
      data: {
        id: randomUUID(),
        tenantId,
        snapshotDate,
        reportId,
        snapshotRevisionNo: newRevision,
        snapshotNumber: (latestSnapshot.snapshotNumber ?? 1) + 1,
        documentNumber,
        snapComment: null,
        responsibleUserId: latestSnapshot.responsibleUserId,
        approverUserId: latestSnapshot.approverUserId,
        contributorUserId: latestSnapshot.contributorUserId,
        informerUserId: latestSnapshot.informerUserId,
        createdBy: activeMembership.userId,
        updatedBy: activeMembership.userId,
      },
    });

    for (const d of latestSnapshot.details) {
      await db.measurementSnapshotDetail.create({
        data: {
          id: randomUUID(),
          measurementSnapshotId: newSnapshot.id,
          snapshotDate,
          measurementPointId: d.measurementPointId,
          mpValueFloat: d.mpValueFloat,
          mpValueInt: d.mpValueInt,
          mpValueText: d.mpValueText,
          minus1dMpValueFloat: d.minus1dMpValueFloat,
          minus1dMpValueInt: d.minus1dMpValueInt,
          minus1dMpValueText: d.minus1dMpValueText,
          createdBy: activeMembership.userId,
          updatedBy: activeMembership.userId,
        },
      });
    }

    await db.reportDayStatus.upsert({
      where: {
        tenantId_reportId_day: {
          tenantId,
          reportId,
          day: snapshotDate,
        },
      },
      update: {
        status: "DRAFT",
        submittedAt: null,
        submittedBy: null,
        approvedAt: null,
        approvedBy: null,
        lockedAt: null,
        lockedBy: null,
      },
      create: {
        id: randomUUID(),
        tenantId,
        reportId,
        day: snapshotDate,
        status: "DRAFT",
        submittedAt: null,
        submittedBy: null,
        approvedAt: null,
        approvedBy: null,
        lockedAt: null,
        lockedBy: null,
      },
    });

    return NextResponse.json({
      ok: true,
      snapshotId: newSnapshot.id,
      revision: newRevision,
      documentNumber,
      message: "New revision created successfully.",
    });
  } catch (error) {
    console.error("NEW REVISION ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create new revision.",
      },
      { status: 500 }
    );
  }
}
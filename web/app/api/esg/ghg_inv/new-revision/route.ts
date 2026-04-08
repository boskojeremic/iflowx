import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { randomUUID } from "node:crypto";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildDocumentNumber } from "@/lib/esg/document-number";

export const runtime = "nodejs";

function normalizeYmd(value: string) {
  const v = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return v;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
    const [day, month, year] = v.split("/");
    return `${year}-${month}-${day}`;
  }

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(v)) {
    const [day, month, year] = v.split(".");
    return `${year}-${month}-${day}`;
  }

  throw new Error(`Invalid date format: ${value}`);
}

function parseYmd(value: string) {
  const v = normalizeYmd(value);
  const [year, month, day] = v.split("-").map(Number);
  return { year, month, day };
}

function toDateOnly(value: string) {
  const { year, month, day } = parseYmd(value);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
}

function getDayRange(value: string) {
  const { year, month, day } = parseYmd(value);

  return {
    gte: new Date(Date.UTC(year, month - 1, day, 0, 0, 0)),
    lte: new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)),
  };
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
    const reportDateRaw = String(body?.reportDate || "").trim();
    const reportDate = normalizeYmd(reportDateRaw);

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
        { ok: false, error: "No access." },
        { status: 403 }
      );
    }

    const snapshotDate = toDateOnly(reportDate);
    const dayRange = getDayRange(reportDate);

    const latestSnapshot = await db.measurementSnapshot.findFirst({
      where: {
        tenantId,
        reportId,
        snapshotDate: dayRange,
      },
      orderBy: [{ snapshotRevisionNo: "desc" }],
      include: {
        details: true,
      },
    });

    if (!latestSnapshot) {
      return NextResponse.json(
        { ok: false, error: "No existing revision found." },
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

    await db.$executeRaw`
      UPDATE "MeasurementSnapshot"
      SET "snapshotDate" = ${reportDate}::date
      WHERE id = ${newSnapshot.id}
    `;

    for (const d of latestSnapshot.details) {
      const newDetailId = randomUUID();

      await db.measurementSnapshotDetail.create({
        data: {
          id: newDetailId,
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

      await db.$executeRaw`
        UPDATE "MeasurementSnapshotDetail"
        SET "snapshotDate" = ${reportDate}::date
        WHERE id = ${newDetailId}
      `;
    }

    const existingStatus = await db.reportDayStatus.findFirst({
      where: {
        tenantId,
        reportId,
        day: dayRange,
      },
      select: { id: true },
    });

    if (existingStatus) {
      await db.reportDayStatus.update({
        where: { id: existingStatus.id },
        data: {
          status: "DRAFT",
          submittedAt: null,
          submittedBy: null,
          approvedAt: null,
          approvedBy: null,
          lockedAt: null,
          lockedBy: null,
        },
      });
    } else {
      const created = await db.reportDayStatus.create({
        data: {
          id: randomUUID(),
          tenantId,
          reportId,
          day: snapshotDate,
          status: "DRAFT",
        },
      });

      await db.$executeRaw`
        UPDATE "ReportDayStatus"
        SET "day" = ${reportDate}::date
        WHERE id = ${created.id}
      `;
    }

    return NextResponse.json({
      ok: true,
      snapshotId: newSnapshot.id,
      revision: newRevision,
      documentNumber,
    });
  } catch (error) {
    console.error("NEW REVISION ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create revision.",
      },
      { status: 500 }
    );
  }
}
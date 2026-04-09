import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { randomUUID } from "node:crypto";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildDocumentNumber } from "@/lib/fop/document-number";

export const runtime = "nodejs";

function normalizeReportDate(value: string) {
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

  throw new Error(`Invalid reportDate format: ${value}`);
}

function parseYmd(value: string) {
  const v = String(value).trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    throw new Error(`Invalid YYYY-MM-DD date: ${value}`);
  }

  const [year, month, day] = v.split("-").map(Number);

  return { year, month, day };
}

function toDateOnly(value: string) {
  const { year, month, day } = parseYmd(value);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
}

function nextDayStart(value: string) {
  const { year, month, day } = parseYmd(value);
  return new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));
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
    const reportDate = normalizeReportDate(reportDateRaw);

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

    const report = await db.reportDefinition.findFirst({
      where: {
        id: reportId,
        code: reportCode,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    if (!report) {
      return NextResponse.json(
        { ok: false, error: "Report definition not found." },
        { status: 404 }
      );
    }

    const snapshotDate = toDateOnly(reportDate);
    const { year, month, day } = parseYmd(reportDate);

    const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    const existingSnapshot = await db.measurementSnapshot.findFirst({
      where: {
        tenantId,
        reportId: report.id,
        snapshotDate: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      include: {
        details: true,
      },
      orderBy: [{ snapshotRevisionNo: "desc" }],
    });

    if (existingSnapshot && existingSnapshot.details.length > 0) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        snapshotId: existingSnapshot.id,
        revision: existingSnapshot.snapshotRevisionNo ?? 0,
        documentNumber: existingSnapshot.documentNumber ?? "",
        message: "Snapshot already exists. Nothing inserted.",
      });
    }

    const mappings = await db.reportMeasurementPoint.findMany({
      where: {
        tenantId,
        reportDefinitionId: report.id,
        isActive: true,
      },
      orderBy: [{ sortOrder: "asc" }, { insertDt: "asc" }],
      include: {
        measurementPoint: {
          include: {
            mpSource: true,
          },
        },
      },
    });

    if (mappings.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "No measurement points are mapped to this report.",
        },
        { status: 400 }
      );
    }

    const revision = 0;
    const documentNumber = buildDocumentNumber(reportCode, reportDate, revision);

    const snapshot =
      existingSnapshot ??
      (await db.measurementSnapshot.create({
        data: {
          id: randomUUID(),
          tenantId,
          snapshotDate,
          reportId: report.id,
          snapshotRevisionNo: revision,
          snapshotNumber: 1,
          documentNumber,
          snapComment: null,
          responsibleUserId: activeMembership.userId,
          approverUserId: null,
          contributorUserId: null,
          informerUserId: null,
          createdBy: activeMembership.userId,
          updatedBy: activeMembership.userId,
        },
      }));

    await db.$executeRaw`
      UPDATE "MeasurementSnapshot"
      SET "snapshotDate" = ${reportDate}::date
      WHERE id = ${snapshot.id}
    `;

    const scadaCutoff = nextDayStart(reportDate);

    for (const mapping of mappings) {
      const mp = mapping.measurementPoint;

      const exists = await db.measurementSnapshotDetail.findFirst({
        where: {
          measurementSnapshotId: snapshot.id,
          measurementPointId: mp.id,
          snapshotDate: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        select: {
          id: true,
        },
      });

      if (exists) continue;

      const sourceName = (mp.mpSource?.sourceName ?? "UNDEFINED").toUpperCase();

      let mpValueFloat: number | null = null;
      let mpValueInt: number | null = null;
      let mpValueText: string | null = null;

      if (sourceName === "SCADA") {
        const scadaRow = await db.$queryRaw<Array<{ m_value: number | null }>>`
          SELECT m_value
          FROM scada_measurements
          WHERE tenant_id = ${tenantId}
            AND measurement_point_id = ${mp.id}
            AND measure_dt < ${scadaCutoff}
          ORDER BY measure_dt DESC
          LIMIT 1
        `;

        mpValueFloat = scadaRow[0]?.m_value ?? 0;
      } else if (sourceName === "MANUAL") {
        mpValueFloat = 0;
      } else if (sourceName === "CALCULATED") {
        mpValueFloat = 0;
      } else {
        continue;
      }

      const newDetailId = randomUUID();

      await db.measurementSnapshotDetail.create({
        data: {
          id: newDetailId,
          measurementSnapshotId: snapshot.id,
          snapshotDate,
          measurementPointId: mp.id,
          mpValueFloat,
          mpValueInt,
          mpValueText,
          minus1dMpValueFloat: null,
          minus1dMpValueInt: null,
          minus1dMpValueText: null,
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

    await db.reportDayStatus.upsert({
      where: {
        tenantId_reportId_day: {
          tenantId,
          reportId: report.id,
          day: snapshotDate,
        },
      },
      create: {
        id: randomUUID(),
        tenantId,
        reportId: report.id,
        day: snapshotDate,
        status: "DRAFT",
        submittedAt: null,
        submittedBy: null,
        approvedAt: null,
        approvedBy: null,
        lockedAt: null,
        lockedBy: null,
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
    });

    await db.$executeRaw`
      UPDATE "ReportDayStatus"
      SET "day" = ${reportDate}::date
      WHERE "tenantId" = ${tenantId}
        AND "reportId" = ${report.id}
        AND "day" = ${snapshotDate}
    `;

    return NextResponse.json({
      ok: true,
      skipped: false,
      snapshotId: snapshot.id,
      revision,
      documentNumber,
      message: "Snapshot created successfully.",
    });
  } catch (error) {
    console.error("FOP INSERT ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to insert snapshot.",
      },
      { status: 500 }
    );
  }
}
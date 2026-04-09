import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkforceReportData } from "@/lib/esg/get-workforce-report-data";
import { Prisma } from "@prisma/client";

function toDateOnly(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));
}

function buildDocumentNumber(
  reportCode: string,
  date: string,
  revisionNo: number
) {
  return `${reportCode}-${date.replaceAll("-", "")}-R${String(revisionNo).padStart(2, "0")}`;
}

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

    const tenantId = String(body?.tenantId ?? "").trim();
    const reportCode = String(body?.reportCode ?? "").trim().toUpperCase();
    const reportDate = String(body?.reportDate ?? "").trim();

    if (!tenantId || !reportCode || !reportDate) {
      return NextResponse.json(
        { error: "tenantId, reportCode and reportDate are required." },
        { status: 400 }
      );
    }

    const report = await db.reportDefinition.findFirst({
      where: {
        code: reportCode,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        templateFields: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
          select: {
            id: true,
            code: true,
            label: true,
            sectionCode: true,
            unit: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: "Report not found." },
        { status: 404 }
      );
    }

    const snapshotDate = toDateOnly(reportDate);

    const latestSnapshot = await db.measurementSnapshot.findFirst({
      where: {
        tenantId,
        reportId: report.id,
        snapshotDate,
      },
      orderBy: [{ snapshotRevisionNo: "desc" }],
      select: {
        id: true,
        snapshotRevisionNo: true,
        snapshotNumber: true,
      },
    });

    if (!latestSnapshot) {
      return NextResponse.json(
        {
          error:
            "No existing snapshot found. Generate the first revision first.",
        },
        { status: 400 }
      );
    }

    const nextRevisionNo = (latestSnapshot.snapshotRevisionNo ?? 0) + 1;

    const documentNumber = buildDocumentNumber(
      report.code,
      reportDate,
      nextRevisionNo
    );

    const calculated = await getWorkforceReportData({
      tenantId,
      reportDate,
      templateFields: report.templateFields.map((f) => ({
        code: f.code,
        label: f.label,
        sectionCode: f.sectionCode,
        unit: f.unit,
      })),
    });

    const created = await db.$transaction(async (tx) => {
      const newSnapshot = await tx.measurementSnapshot.create({
        data: {
          id: crypto.randomUUID(),
          tenantId,
          snapshotDate,
          reportId: report.id,
          snapshotRevisionNo: nextRevisionNo,
          snapshotNumber: (latestSnapshot.snapshotNumber ?? 1) + 1,
          documentNumber,
          snapComment:
            "New workforce revision recalculated from Employee / Training / HSE records.",
          createdBy: userEmail,
          updatedBy: userEmail,
        },
      });

      const rows = calculated.sections
        .flatMap((section) =>
          section.rows.map((row) => {
            const templateField = report.templateFields.find(
              (f) => f.code === row.code
            );
            if (!templateField) return null;

            const raw = String(row.value ?? "").trim();
            const num = raw === "" ? null : Number(raw);
            const valueNumber = Number.isFinite(num) ? num : null;
            const valueText = valueNumber === null ? raw : null;

            return {
              measurementSnapshotId: newSnapshot.id,
              snapshotDate,
              templateFieldId: templateField.id,
              fieldCode: row.code,
              valueText,
              valueNumber,
              createdBy: userEmail,
              updatedBy: userEmail,
            };
          })
        )
        .filter(Boolean) as Prisma.ReportSnapshotFieldValueCreateManyInput[];

      if (rows.length > 0) {
        await tx.reportSnapshotFieldValue.createMany({
          data: rows,
        });
      }

      await tx.reportDayStatus.upsert({
        where: {
          tenantId_reportId_day: {
            tenantId,
            reportId: report.id,
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
          id: crypto.randomUUID(),
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
      });

      return newSnapshot;
    });

    return NextResponse.json({
      ok: true,
      snapshotId: created.id,
      revisionNo: created.snapshotRevisionNo ?? 0,
      documentNumber,
    });
  } catch (error) {
    console.error("WORKFORCE_NEW_REVISION_ERROR", error);
    return NextResponse.json(
      { error: "Failed to create workforce revision." },
      { status: 500 }
    );
  }
}
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkforceReportData } from "@/lib/esg/get-workforce-report-data";

function toDateOnly(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));
}

function buildDocumentNumber(reportCode: string, date: string, revisionNo: number) {
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
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        tenantId,
        code: reportCode,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
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
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    const snapshotDate = toDateOnly(reportDate);

    const existing = await db.measurementSnapshot.findFirst({
      where: {
        tenantId,
        reportId: report.id,
        snapshotDate,
      },
      orderBy: [{ snapshotRevisionNo: "desc" }],
      select: {
        id: true,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Snapshot already exists for selected date. Use New Revision." },
        { status: 400 }
      );
    }

    const documentNumber = buildDocumentNumber(report.code, reportDate, 0);

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
      const snapshot = await tx.measurementSnapshot.create({
        data: {
          id: crypto.randomUUID(),
          tenantId,
          snapshotDate,
          reportId: report.id,
          snapshotRevisionNo: 0,
          snapshotNumber: 1,
          documentNumber,
          snapComment:
            "Initial workforce snapshot generated from Employee / Training / HSE records.",
          createdBy: userEmail,
          updatedBy: userEmail,
        },
        select: {
          id: true,
          snapshotRevisionNo: true,
          documentNumber: true,
        },
      });

      const rows = calculated.sections
        .flatMap((section) =>
          section.rows.map((row) => {
            const templateField = report.templateFields.find((f) => f.code === row.code);
            if (!templateField) return null;

            const raw = String(row.value ?? "").trim();
            const num = raw === "" ? null : Number(raw);
            const valueNumber = Number.isFinite(num) ? num : null;
            const valueText = valueNumber === null ? raw : null;

            return {
  measurementSnapshotId: snapshot.id,
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
        .filter((x): x is NonNullable<typeof x> => !!x);

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

      return snapshot;
    });

    return NextResponse.json({
      ok: true,
      snapshotId: created.id,
      revisionNo: created.snapshotRevisionNo ?? 0,
      documentNumber: created.documentNumber,
    });
  } catch (error) {
    console.error("WORKFORCE_GENERATE_ERROR", error);
    return NextResponse.json(
      { error: "Failed to generate workforce snapshot." },
      { status: 500 }
    );
  }
}
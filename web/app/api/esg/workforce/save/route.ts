import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

type FieldPayload = {
  fieldCode: string;
  value: string | number | boolean | null;
};

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

    const snapshotId = String(body?.snapshotId ?? "").trim();
    const fields = Array.isArray(body?.fields)
      ? (body.fields as FieldPayload[])
      : [];

    if (!snapshotId) {
      return NextResponse.json(
        { error: "snapshotId is required." },
        { status: 400 }
      );
    }

    const snapshot = await db.measurementSnapshot.findUnique({
      where: { id: snapshotId },
      select: {
        id: true,
        reportId: true,
        snapshotDate: true,
        report: {
          select: {
            id: true,
            templateFields: {
              where: { isActive: true },
              select: {
                id: true,
                code: true,
                fieldType: true,
              },
            },
          },
        },
      },
    });

    if (!snapshot) {
      return NextResponse.json(
        { error: "Snapshot not found." },
        { status: 404 }
      );
    }

    const fieldMap = new Map(
      snapshot.report.templateFields.map((f) => [f.code, f])
    );

    await db.$transaction(async (tx) => {
      for (const item of fields) {
        const fieldCode = String(item?.fieldCode ?? "").trim();
        const rawValue = item?.value ?? null;

        if (!fieldCode) continue;

        const field = fieldMap.get(fieldCode);
        if (!field) continue;

        let valueText: string | null = null;
        let valueNumber: number | null = null;
        let valueBoolean: boolean | null = null;
        let valueDate: Date | null = null;

        if (rawValue !== null && rawValue !== undefined && rawValue !== "") {
          switch (field.fieldType) {
            case "NUMBER":
            case "PERCENT": {
              const n = Number(rawValue);
              valueNumber = Number.isFinite(n) ? n : null;
              break;
            }

            case "BOOLEAN": {
              if (
                rawValue === true ||
                rawValue === "true" ||
                rawValue === "TRUE" ||
                rawValue === "Yes" ||
                rawValue === "YES"
              ) {
                valueBoolean = true;
              } else if (
                rawValue === false ||
                rawValue === "false" ||
                rawValue === "FALSE" ||
                rawValue === "No" ||
                rawValue === "NO"
              ) {
                valueBoolean = false;
              }
              break;
            }

            case "DATE":
            case "DATETIME": {
              const d = new Date(String(rawValue));
              valueDate = Number.isNaN(d.getTime()) ? null : d;
              break;
            }

            default: {
              valueText = String(rawValue);
              break;
            }
          }
        }

        await tx.reportSnapshotFieldValue.upsert({
          where: {
            measurementSnapshotId_fieldCode: {
              measurementSnapshotId: snapshot.id,
              fieldCode,
            },
          },
          update: {
            valueText,
            valueNumber,
            valueBoolean,
            valueDate,
            updatedBy: userEmail,
          },
          create: {
            measurementSnapshotId: snapshot.id,
            snapshotDate: snapshot.snapshotDate,
            templateFieldId: field.id,
            fieldCode,
            valueText,
            valueNumber,
            valueBoolean,
            valueDate,
            createdBy: userEmail,
            updatedBy: userEmail,
          },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("WORKFORCE_SAVE_ERROR", error);
    return NextResponse.json(
      { error: "Failed to save workforce values." },
      { status: 500 }
    );
  }
}
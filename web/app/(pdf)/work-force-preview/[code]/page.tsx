import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import WorkforceReportTemplate from "@/components/esg/templates/WorkforceReportTemplate";

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{
    tenantId?: string;
    token?: string;
    date?: string;
    rev?: string;
  }>;
};

function toDateOnly(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));
}

function ymd(value: Date | string) {
  const d = new Date(value);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function displayFieldValue(v: {
  valueText?: string | null;
  valueNumber?: unknown;
  valueBoolean?: boolean | null;
  valueDate?: Date | null;
  valueJson?: unknown;
}) {
  if (v.valueText !== null && v.valueText !== undefined) return String(v.valueText);
  if (v.valueNumber !== null && v.valueNumber !== undefined) return String(v.valueNumber);
  if (v.valueBoolean !== null && v.valueBoolean !== undefined) return v.valueBoolean ? "Yes" : "No";
  if (v.valueDate) return ymd(v.valueDate);
  if (v.valueJson !== null && v.valueJson !== undefined) return JSON.stringify(v.valueJson);
  return "";
}

export default async function WorkforcePreviewPage({
  params,
  searchParams,
}: Props) {
  const { code } = await params;
  const sp = await searchParams;

  const reportCode = String(code || "").toUpperCase();
  const reportDate = String(sp?.date || "").trim();
  const revisionNo = Number(sp?.rev ?? 0);
  const token = String(sp?.token ?? "").trim();
  const tenantIdFromQuery = String(sp?.tenantId ?? "").trim();

  let tenantId: string | null = null;

  if (tenantIdFromQuery) {
    tenantId = tenantIdFromQuery;
  } else if (token) {
    const approval = await db.reportApprovalToken.findUnique({
      where: { token },
      select: { tenantId: true },
    });

    if (!approval) notFound();
    tenantId = approval.tenantId;
  } else {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) notFound();

    const user = await db.user.findFirst({
      where: { email: session.user.email },
      select: {
        memberships: {
          where: { status: "ACTIVE" },
          orderBy: [{ createdAt: "desc" }],
          select: { tenantId: true },
        },
      },
    });

    tenantId = user?.memberships?.[0]?.tenantId ?? null;
  }

  if (!tenantId) notFound();

  const report = await db.reportDefinition.findFirst({
    where: {
      code: reportCode,
      isActive: true,
    },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      templateFields: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
        select: {
          id: true,
          code: true,
          label: true,
          sectionCode: true,
          fieldType: true,
          unit: true,
          sortOrder: true,
        },
      },
    },
  });

  if (!report) notFound();

  const snapshot = reportDate
    ? await db.measurementSnapshot.findFirst({
        where: {
          tenantId,
          reportId: report.id,
          snapshotDate: toDateOnly(reportDate),
          ...(revisionNo > 0 ? { snapshotRevisionNo: revisionNo } : {}),
        },
        orderBy: revisionNo > 0 ? undefined : [{ snapshotRevisionNo: "desc" }],
        include: {
          fieldValues: {
            include: {
              templateField: true,
            },
          },
        },
      })
    : null;

  const dayStatus =
    reportDate || snapshot?.snapshotDate
      ? await db.reportDayStatus.findUnique({
          where: {
            tenantId_reportId_day: {
              tenantId,
              reportId: report.id,
              day: snapshot?.snapshotDate ?? toDateOnly(reportDate),
            },
          },
          select: {
            status: true,
          },
        })
      : null;

  const valueMap = new Map(
    (snapshot?.fieldValues ?? []).map((v) => [v.fieldCode, v])
  );

  const groupedSections = report.templateFields.reduce<
    Array<{
      sectionCode: string;
      rows: Array<{
        code: string;
        label: string;
        unit: string | null;
        value: string;
      }>;
    }>
  >((acc, field) => {
    const key = field.sectionCode || "GENERAL";
    const value = valueMap.get(field.code);

    const existing = acc.find((s) => s.sectionCode === key);

    const row = {
      code: field.code,
      label: field.label,
      unit: field.unit ?? null,
      value: value ? displayFieldValue(value) : "0",
    };

    if (existing) {
      existing.rows.push(row);
    } else {
      acc.push({
        sectionCode: key,
        rows: [row],
      });
    }

    return acc;
  }, []);

  return (
    <main className="min-h-screen bg-white p-4">
      <WorkforceReportTemplate
        report={{
          code: report.code,
          title: report.name,
          description: report.description ?? "",
        }}
        reportDate={reportDate || (snapshot?.snapshotDate ? ymd(snapshot.snapshotDate) : "")}
        revisionNo={
          typeof snapshot?.snapshotRevisionNo === "number"
            ? snapshot.snapshotRevisionNo
            : 0
        }
        documentNumber={snapshot?.documentNumber ?? "—"}
        status={dayStatus?.status ?? "DRAFT"}
        sections={groupedSections}
      />
    </main>
  );
}
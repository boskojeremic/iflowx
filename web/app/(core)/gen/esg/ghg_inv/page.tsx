import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import PowerBIEmbed from "@/components/PowerBIEmbed";
import { powerBIReports } from "@/lib/powerbi-reports";
import GhgInvReportView from "@/components/esg/ghg_inv/GhgInvReportView";
import SendReportDialog from "@/components/esg/ghg_inv/SendReportDialog";
import ReportAndDateFilters from "@/components/esg/ghg_inv/ReportAndDateFilters";
import InsertGenerateButton from "@/components/esg/ghg_inv/InsertGenerateButton";
import { getAccessibleReportsForUser } from "@/lib/report-list-access";
import EditableMeasurementTable from "@/components/esg/ghg_inv/EditableMeasurementTable";
import NewRevisionButton from "@/components/esg/ghg_inv/NewRevisionButton";
import RevisionFilterSelect from "@/components/esg/ghg_inv/RevisionFilterSelect";

export const dynamic = "force-dynamic";

const REPORT_CODE = "GHG_INV";

type SearchParams = Promise<{
  tab?: string;
  rightTab?: string;
  report?: string;
  date?: string;
  rev?: string;
  _ts?: string;
  hq?: string;
  hdate?: string;
  hreport?: string;
  cpMode?: string;
  cpInputType?: string;
  cpTag?: string;
}>;

function formatNumericValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "";

  const num =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));

  if (Number.isNaN(num)) return String(value);

  if (num === 0) return "0.00";

  const abs = Math.abs(num);

  if (abs < 0.01) {
    return num.toExponential(2).replace("e", "E");
  }

  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function yesterdayYmd() {
  const d = new Date();
  d.setDate(d.getDate() - 1);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function parseYmd(value: string) {
  const [year, month, day] = String(value).split("-").map(Number);
  return { year, month, day };
}

function getDayRange(value: string) {
  const { year, month, day } = parseYmd(value);

  return {
    gte: new Date(Date.UTC(year, month - 1, day, 0, 0, 0)),
    lte: new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)),
  };
}

function ymd(value: Date | string) {
  const d = new Date(value);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateTime(value: Date | null | undefined) {
  if (!value) return "—";

  const d = new Date(value);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");

  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

type CheckPointRow = {
  detailId: string;
  measurementPointId: string;
  tagNo: string;
  description: string;
  value: string;
  unit: string;
  editable: boolean;
  sourceName: string;
};

type ChartPoint = {
  xLabel: string;
  date: Date;
  value: number;
  revisionNo: number;
  documentNumber: string;
};

export default async function GHGInventoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const sp = await searchParams;

  const previewTs = String(sp?._ts ?? "");
  const mainTab = String(sp?.tab ?? "data-entry").toLowerCase();
  const rightTab = String(sp?.rightTab ?? "report").toLowerCase();
  const selectedDate = String(sp?.date ?? yesterdayYmd());
  const selectedRevisionParam = sp?.rev;

  const historyQuery = String(sp?.hq ?? "").trim();
  const historyDate = String(sp?.hdate ?? "").trim();
  const historyReport = String(sp?.hreport ?? REPORT_CODE).toUpperCase().trim();

  const hasSelectedRevision =
    selectedRevisionParam !== undefined &&
    selectedRevisionParam !== null &&
    String(selectedRevisionParam).trim() !== "";

  const selectedRevision = hasSelectedRevision
    ? Number(selectedRevisionParam)
    : null;

  const moduleItem = await db.module.findFirst({
    where: {
      routePath: "/gen/esg",
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      code: true,
    },
  });

  if (!moduleItem) notFound();

  const user = await db.user.findUnique({
    where: { email: session.user?.email ?? "" },
    select: {
      id: true,
      name: true,
      email: true,
      memberships: {
        where: { status: "ACTIVE" },
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          role: true,
          tenantId: true,
          tenant: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },
    },
  });

  if (!user) notFound();

  const membership = user.memberships[0] ?? null;
  const tenant = membership?.tenant ?? null;
  if (!tenant) notFound();

  const reportGroup = await db.reportGroup.findFirst({
    where: {
      moduleId: moduleItem.id,
      isActive: true,
      reportDefinitions: {
        some: {
          code: REPORT_CODE,
          isActive: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
    },
  });

  if (!reportGroup) notFound();

  const mainTabs = [
    { key: "data-entry", label: "Data Entry" },
    { key: "dashboards", label: "Dashboards" },
    { key: "history", label: "History" },
  ];

  const rightTabs = [
    { key: "charts", label: "Checking Point" },
    { key: "report", label: "Report" },
    { key: "reports-in-process", label: "Reports In Process" },
    { key: "report-event-history", label: "Report Event History" },
  ];

  const accessibleReports = await getAccessibleReportsForUser({
    userId: user.id,
    tenantId: tenant.id,
  });

  const dataEntryReports = accessibleReports
    .filter((r) => r.reportGroupId === reportGroup.id && r.code === REPORT_CODE)
    .map((r, idx) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: null as string | null,
      sortOrder: idx + 1,
      reportGroupId: r.reportGroupId,
      responsibleFunctionId: r.responsibleFunctionId,
      approverFunctionId: r.approverFunctionId,
      mode: r.mode,
      canView: r.canView,
      canEdit: r.canEdit,
      canSubmit: r.canSubmit,
      canApprove: r.canApprove,
    }));

  const responsibleReports = dataEntryReports.filter(
    (r) => r.mode === "RESPONSIBLE"
  );
  const responsibleReportIds = new Set(responsibleReports.map((r) => r.id));
  const responsibleReportCodes = new Set(responsibleReports.map((r) => r.code));

  const accessibleReportCodes = new Set(dataEntryReports.map((r) => r.code));

  const activeDataEntryReport = dataEntryReports[0] ?? null;

  if (mainTab === "data-entry" && dataEntryReports.length === 0) {
    return (
      <div className="min-h-full space-y-4 overflow-y-auto p-4">
        <div className="text-sm text-white/50">
          <Link href="/gen/esg" className="transition hover:text-white/80">
            ESG Reports
          </Link>
          <span className="mx-2">/</span>
          <span className="text-white/80">GHG Inventory</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/70">
          You do not have access to this report.
        </div>
      </div>
    );
  }

  const approvedReportsRaw = await db.reportDayStatus.findMany({
    where: {
      tenantId: tenant.id,
      day: getDayRange(selectedDate),
      status: "APPROVED",
      reportDefinition: {
        reportGroupId: reportGroup.id,
        code: REPORT_CODE,
      },
    },
    orderBy: [
      { reportDefinition: { sortOrder: "asc" } },
      { reportDefinition: { name: "asc" } },
    ],
    select: {
      id: true,
      day: true,
      status: true,
      approvedAt: true,
      approvedBy: true,
      submittedAt: true,
      submittedBy: true,
      lockedAt: true,
      lockedBy: true,
      reportId: true,
      reportDefinition: {
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          sortOrder: true,
          reportGroupId: true,
        },
      },
    },
  });

  const approvedReports = approvedReportsRaw.filter((r) =>
    accessibleReportCodes.has(r.reportDefinition.code)
  );

  const activeApprovedReport = approvedReports[0] ?? null;

  const currentReportCode =
    activeDataEntryReport?.code ??
    activeApprovedReport?.reportDefinition.code ??
    REPORT_CODE;

  const availableRevisions =
    activeDataEntryReport
      ? await db.measurementSnapshot.findMany({
          where: {
            tenantId: tenant.id,
            reportId: activeDataEntryReport.id,
            snapshotDate: getDayRange(selectedDate),
          },
          orderBy: [{ snapshotRevisionNo: "desc" }],
          select: {
            id: true,
            snapshotRevisionNo: true,
            documentNumber: true,
          },
        })
      : [];

  const snapshot =
    activeDataEntryReport
      ? await db.measurementSnapshot.findFirst({
          where: {
            tenantId: tenant.id,
            reportId: activeDataEntryReport.id,
            snapshotDate: getDayRange(selectedDate),
            ...(selectedRevision !== null
              ? { snapshotRevisionNo: selectedRevision }
              : {}),
          },
          orderBy:
            selectedRevision !== null
              ? undefined
              : [{ snapshotRevisionNo: "desc" }],
          include: {
            details: {
              include: {
                measurementPoint: {
                  include: {
                    measurementUnit: true,
                    mpSource: true,
                  },
                },
              },
            },
          },
        })
      : null;

  const currentDayStatus =
    activeDataEntryReport
      ? await db.reportDayStatus.findFirst({
          where: {
            tenantId: tenant.id,
            reportId: activeDataEntryReport.id,
            day: getDayRange(selectedDate),
          },
          select: {
            status: true,
          },
        })
      : null;

  const latestApprovalAction =
    activeDataEntryReport
      ? await db.reportApprovalToken.findFirst({
          where: {
            tenantId: tenant.id,
            reportId: activeDataEntryReport.id,
            day: getDayRange(selectedDate),
          },
          orderBy: [{ createdAt: "desc" }],
          select: {
            status: true,
            approverEmail: true,
            rejectComment: true,
            actedAt: true,
            approverUserId: true,
          },
        })
      : null;

  const latestApprovalActor = latestApprovalAction?.approverUserId
    ? await db.user.findUnique({
        where: { id: latestApprovalAction.approverUserId },
        select: {
          name: true,
          email: true,
        },
      })
    : null;

  const approvalActorName =
    latestApprovalActor?.name?.trim() ||
    latestApprovalActor?.email ||
    latestApprovalAction?.approverEmail ||
    "Approver";

  const reportDisplayStatus =
    currentDayStatus?.status === "APPROVED"
      ? `Approved by ${approvalActorName}`
      : currentDayStatus?.status === "REJECTED"
      ? `Rejected by ${approvalActorName}`
      : currentDayStatus?.status === "SUBMITTED"
      ? "Submitted for Approval"
      : "Draft";

  const snapshotExists = !!snapshot;
  const snapshotHasDetails = !!snapshot && snapshot.details.length > 0;

  const selectedRevisionValue =
    selectedRevision !== null
      ? String(selectedRevision)
      : availableRevisions.length > 0
      ? String(availableRevisions[0].snapshotRevisionNo ?? "")
      : "";

  const latestRevisionNo = availableRevisions[0]?.snapshotRevisionNo ?? 0;
  const isLatestRevision =
    !snapshot?.snapshotRevisionNo ||
    snapshot.snapshotRevisionNo === latestRevisionNo;

  const activeReport = activeDataEntryReport
    ? {
        id: activeDataEntryReport.id,
        code: activeDataEntryReport.code,
        name: activeDataEntryReport.name,
        documentNumber: snapshot?.documentNumber ?? "—",
        revisionNo:
          typeof snapshot?.snapshotRevisionNo === "number"
            ? String(snapshot.snapshotRevisionNo)
            : "0",
        responsiblePerson: "—",
        validator: "—",
        accountant: "—",
        status: reportDisplayStatus,
        blocked: false,
        sortOrder: activeDataEntryReport.sortOrder,
        responsibleFunctionId: activeDataEntryReport.responsibleFunctionId,
        approverFunctionId: activeDataEntryReport.approverFunctionId,
        mode: activeDataEntryReport.mode,
        canView: activeDataEntryReport.canView,
        canEdit: activeDataEntryReport.canEdit,
        canSubmit: activeDataEntryReport.canSubmit,
        canApprove: activeDataEntryReport.canApprove,
      }
    : null;

  const canEditActiveReport = !!activeReport?.canEdit && isLatestRevision;
  const canSubmitActiveReport = !!activeReport?.canSubmit && isLatestRevision;
  const canApproveActiveReport = !!activeReport?.canApprove;
  const activeReportMode = activeReport?.mode ?? "NONE";

  const approverCandidatesRaw =
    activeReport?.approverFunctionId
      ? await db.membership.findMany({
          where: {
            tenantId: tenant.id,
            status: "ACTIVE",
            operationalFunctionId: activeReport.approverFunctionId,
          },
          select: {
            userId: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        })
      : [];

  const approverCandidates = approverCandidatesRaw
    .map((m) => ({
      userId: m.user.id,
      label: m.user.name?.trim() || m.user.email,
      email: m.user.email,
    }))
    .sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
    );

  const defaultApproverUserId = approverCandidates[0]?.userId ?? "";

  const manualData: CheckPointRow[] = snapshotHasDetails
    ? snapshot.details
        .filter((d) => d.measurementPoint.mpSource?.sourceName === "MANUAL")
        .map((d) => ({
          detailId: d.id,
          measurementPointId: d.measurementPointId,
          tagNo: d.measurementPoint.tagNo,
          description: d.measurementPoint.descEn ?? d.measurementPoint.tagNo ?? "",
          value: formatNumericValue(
            d.mpValueFloat ?? d.mpValueInt ?? d.mpValueText
          ),
          unit: d.measurementPoint.measurementUnit?.unitTitle ?? "",
          editable: true,
          sourceName: d.measurementPoint.mpSource?.sourceName ?? "MANUAL",
        }))
    : [];

  const scadaData: CheckPointRow[] = snapshotHasDetails
    ? snapshot.details
        .filter((d) => d.measurementPoint.mpSource?.sourceName === "SCADA")
        .map((d) => ({
          detailId: d.id,
          measurementPointId: d.measurementPointId,
          tagNo: d.measurementPoint.tagNo,
          description: d.measurementPoint.descEn ?? d.measurementPoint.tagNo ?? "",
          value: formatNumericValue(
            d.mpValueFloat ?? d.mpValueInt ?? d.mpValueText
          ),
          unit: d.measurementPoint.measurementUnit?.unitTitle ?? "",
          editable: false,
          sourceName: d.measurementPoint.mpSource?.sourceName ?? "SCADA",
        }))
    : [];

  const calculatedData: CheckPointRow[] = snapshotHasDetails
    ? snapshot.details
        .filter((d) => d.measurementPoint.mpSource?.sourceName === "CALCULATED")
        .map((d) => ({
          detailId: d.id,
          measurementPointId: d.measurementPointId,
          tagNo: d.measurementPoint.tagNo,
          description: d.measurementPoint.descEn ?? d.measurementPoint.tagNo ?? "",
          value: formatNumericValue(
            d.mpValueFloat ?? d.mpValueInt ?? d.mpValueText
          ),
          unit: d.measurementPoint.measurementUnit?.unitTitle ?? "",
          editable: false,
          sourceName: d.measurementPoint.mpSource?.sourceName ?? "CALCULATED",
        }))
    : [];

  const checkPointMode =
    String(sp?.cpMode ?? "inputs").toLowerCase() === "outputs"
      ? "outputs"
      : "inputs";

  const checkPointInputType =
    String(sp?.cpInputType ?? "manual").toLowerCase() === "scada"
      ? "scada"
      : "manual";

  const checkPointSourceName =
    checkPointMode === "outputs"
      ? "CALCULATED"
      : checkPointInputType === "scada"
      ? "SCADA"
      : "MANUAL";

  const selectedSnapshotDetailMap = new Map(
    (snapshot?.details ?? []).map((d) => [
      d.measurementPointId,
      {
        value: formatNumericValue(
          d.mpValueFloat ?? d.mpValueInt ?? d.mpValueText
        ),
        detailId: d.id,
      },
    ])
  );

  const checkPointCatalogRaw =
    activeDataEntryReport
      ? await db.measurementSnapshotDetail.findMany({
          where: {
            measurementSnapshot: {
              tenantId: tenant.id,
              reportId: activeDataEntryReport.id,
            },
            measurementPoint: {
              mpSource: {
                sourceName: checkPointSourceName,
              },
            },
          },
          include: {
            measurementPoint: {
              include: {
                measurementUnit: true,
                mpSource: true,
              },
            },
          },
          orderBy: [{ measurementPointId: "asc" }, { snapshotDate: "desc" }],
        })
      : [];

  const checkPointCatalogMap = new Map<string, CheckPointRow>();

  for (const d of checkPointCatalogRaw) {
    if (checkPointCatalogMap.has(d.measurementPointId)) continue;

    const selectedSnapshotValue = selectedSnapshotDetailMap.get(d.measurementPointId);

    checkPointCatalogMap.set(d.measurementPointId, {
      detailId: selectedSnapshotValue?.detailId ?? d.id,
      measurementPointId: d.measurementPointId,
      tagNo: d.measurementPoint.tagNo,
      description: d.measurementPoint.descEn ?? d.measurementPoint.tagNo ?? "",
      value: selectedSnapshotValue?.value ?? "",
      unit: d.measurementPoint.measurementUnit?.unitTitle ?? "",
      editable: checkPointSourceName === "MANUAL",
      sourceName: d.measurementPoint.mpSource?.sourceName ?? checkPointSourceName,
    });
  }

  const currentCheckPointRows = Array.from(checkPointCatalogMap.values()).sort((a, b) =>
    a.description.localeCompare(b.description, undefined, { sensitivity: "base" })
  );

  const selectedCheckPointTagParam = String(sp?.cpTag ?? "").trim();

  const selectedCheckPointRow =
    currentCheckPointRows.find((r) => r.tagNo === selectedCheckPointTagParam) ??
    currentCheckPointRows[0] ??
    null;

  const checkPointBaseQuery = `tab=data-entry&rightTab=charts&report=${currentReportCode}&date=${selectedDate}${
    selectedRevisionValue ? `&rev=${selectedRevisionValue}` : ""
  }`;

  const snapshotsForCharts =
    activeDataEntryReport
      ? await db.measurementSnapshot.findMany({
          where: {
            tenantId: tenant.id,
            reportId: activeDataEntryReport.id,
            snapshotDate: {
              lte: getDayRange(selectedDate).lte,
            },
          },
          orderBy: [{ snapshotDate: "asc" }, { snapshotRevisionNo: "desc" }],
          select: {
            id: true,
            snapshotDate: true,
            snapshotRevisionNo: true,
            documentNumber: true,
          },
        })
      : [];

  const latestSnapshotByDate = new Map<
    string,
    {
      id: string;
      snapshotDate: Date;
      snapshotRevisionNo: number | null;
      documentNumber: string | null;
    }
  >();

  for (const s of snapshotsForCharts) {
    const key = ymd(s.snapshotDate);
    if (!latestSnapshotByDate.has(key)) {
      latestSnapshotByDate.set(key, s);
    }
  }

  const latestSnapshotIdsForCharts = Array.from(latestSnapshotByDate.values()).map(
    (s) => s.id
  );

  const chartSeriesRaw =
    selectedCheckPointRow && latestSnapshotIdsForCharts.length > 0
      ? await db.measurementSnapshotDetail.findMany({
          where: {
            measurementSnapshotId: {
              in: latestSnapshotIdsForCharts,
            },
            measurementPointId: selectedCheckPointRow.measurementPointId,
            snapshotDate: {
              lte: getDayRange(selectedDate).lte,
            },
          },
          include: {
            measurementSnapshot: {
              select: {
                snapshotDate: true,
                snapshotRevisionNo: true,
                documentNumber: true,
              },
            },
          },
        })
      : [];

  const chartPoints: ChartPoint[] = chartSeriesRaw
    .map((d) => {
      const raw =
        d.mpValueFloat !== null && d.mpValueFloat !== undefined
          ? d.mpValueFloat
          : d.mpValueInt !== null && d.mpValueInt !== undefined
          ? d.mpValueInt
          : d.mpValueText !== null && d.mpValueText !== undefined
          ? Number(d.mpValueText)
          : null;

      if (raw === null || Number.isNaN(raw)) return null;

      return {
        xLabel: ymd(d.measurementSnapshot.snapshotDate),
        date: d.measurementSnapshot.snapshotDate,
        value: Number(raw),
        revisionNo: d.measurementSnapshot.snapshotRevisionNo ?? 0,
        documentNumber: d.measurementSnapshot.documentNumber ?? "",
      };
    })
    .filter((p): p is ChartPoint => !!p)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .filter((p) => ymd(p.date) <= selectedDate);

  const latestBarPoints = chartPoints.slice(-7);

  const eventHistory = [
    {
      eventDate: "1/2/2026 3:03 AM",
      stage: "SUBMITTED FOR VALIDATION",
      sentFrom: "Radoslava Jovancevic",
      sentTo: "Askar Yakupov",
      comment: "",
    },
  ];

  const activePreviewCode = REPORT_CODE;

  const activePreviewTitle =
    activeDataEntryReport?.name ??
    activeApprovedReport?.reportDefinition.name ??
    "GHG Emissions Inventory";

  const activePreviewHtmlSrc = `/ghg_inv-preview/${activePreviewCode}?date=${selectedDate}${
    previewTs ? `&_ts=${previewTs}` : ""
  }${selectedRevisionValue ? `&rev=${selectedRevisionValue}` : ""}${
    snapshot?.id ? `&snapshotId=${snapshot.id}` : ""
  }`;

  const activePreviewPdfSrc = snapshot?.documentNumber
  ? `/api/esg/ghg_inv/generate-pdf${
      previewTs ? `?ts=${previewTs}` : ""
    }`
  : "";

  const baseQuery = `report=${currentReportCode}&date=${selectedDate}${
    selectedRevisionValue ? `&rev=${selectedRevisionValue}` : ""
  }`;

  const historyStatusesRaw = await db.reportDayStatus.findMany({
    where: {
      tenantId: tenant.id,
      reportDefinition: {
        reportGroupId: reportGroup.id,
        code: REPORT_CODE,
      },
    },
    orderBy: [{ day: "desc" }, { reportDefinition: { sortOrder: "asc" } }],
    select: {
      id: true,
      day: true,
      status: true,
      approvedAt: true,
      approvedBy: true,
      submittedAt: true,
      submittedBy: true,
      lockedAt: true,
      lockedBy: true,
      reportId: true,
      reportDefinition: {
        select: {
          id: true,
          code: true,
          name: true,
          sortOrder: true,
        },
      },
    },
  });

  const historyStatuses = historyStatusesRaw.filter(
    (r) =>
      accessibleReportCodes.has(r.reportDefinition.code) &&
      responsibleReportIds.has(r.reportId) &&
      responsibleReportCodes.has(r.reportDefinition.code)
  );

  const historyReportIds = Array.from(
    new Set(historyStatuses.map((r) => r.reportId).filter(Boolean))
  );

  const historySnapshots =
    historyReportIds.length > 0
      ? await db.measurementSnapshot.findMany({
          where: {
            tenantId: tenant.id,
            reportId: {
              in: historyReportIds,
            },
          },
          orderBy: [{ snapshotDate: "desc" }, { snapshotRevisionNo: "desc" }],
          select: {
            id: true,
            reportId: true,
            snapshotDate: true,
            snapshotRevisionNo: true,
            documentNumber: true,
          },
        })
      : [];

  const latestHistorySnapshotByKey = new Map<
    string,
    {
      id: string;
      reportId: string;
      snapshotDate: Date;
      snapshotRevisionNo: number | null;
      documentNumber: string | null;
    }
  >();

  for (const s of historySnapshots) {
    const key = `${s.reportId}_${ymd(s.snapshotDate)}`;
    if (!latestHistorySnapshotByKey.has(key)) {
      latestHistorySnapshotByKey.set(key, s);
    }
  }

  const historyApprovalTokens =
    historyReportIds.length > 0
      ? await db.reportApprovalToken.findMany({
          where: {
            tenantId: tenant.id,
            reportId: {
              in: historyReportIds,
            },
          },
          orderBy: [{ day: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            reportId: true,
            day: true,
            status: true,
            approverEmail: true,
            rejectComment: true,
            actedAt: true,
            approverUserId: true,
            createdAt: true,
          },
        })
      : [];

  const approvalUserIds = Array.from(
    new Set(
      historyApprovalTokens
        .map((t) => t.approverUserId)
        .filter((v): v is string => !!v)
    )
  );

  const approvalUsers =
    approvalUserIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: approvalUserIds } },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : [];

  const approvalUserMap = new Map(
    approvalUsers.map((u) => [u.id, u.name?.trim() || u.email])
  );

  const historyRows: Array<{
    rowId: string;
    reportId: string;
    reportDate: string;
    reportTitle: string;
    reportCode: string;
    documentNumber: string;
    revisionNo: number;
    currentStatus: string;
    approvalAction: string;
    actedBy: string;
    actionDate: Date | null;
    comment: string;
    openHref: string;
  }> = [];

  for (const statusRow of historyStatuses) {
    const key = `${statusRow.reportId}_${ymd(statusRow.day)}`;
    const snapshotInfo = latestHistorySnapshotByKey.get(key);

    const tokensForRow = historyApprovalTokens.filter(
      (t) => t.reportId === statusRow.reportId && ymd(t.day) === ymd(statusRow.day)
    );

    const openHref = `/gen/esg/ghg_inv?tab=data-entry&rightTab=report&report=${statusRow.reportDefinition.code}&date=${ymd(
      statusRow.day
    )}&rev=${
      typeof snapshotInfo?.snapshotRevisionNo === "number"
        ? snapshotInfo.snapshotRevisionNo
        : 0
    }`;

    if (tokensForRow.length > 0) {
      for (const token of tokensForRow) {
        historyRows.push({
          rowId: `${statusRow.id}_${token.id}`,
          reportId: statusRow.reportId,
          reportDate: ymd(statusRow.day),
          reportTitle: statusRow.reportDefinition.name,
          reportCode: statusRow.reportDefinition.code,
          documentNumber: snapshotInfo?.documentNumber ?? "—",
          revisionNo:
            typeof snapshotInfo?.snapshotRevisionNo === "number"
              ? snapshotInfo.snapshotRevisionNo
              : 0,
          currentStatus: statusRow.status,
          approvalAction: token.status ?? "—",
          actedBy:
            (token.approverUserId
              ? approvalUserMap.get(token.approverUserId)
              : null) ||
            token.approverEmail ||
            "—",
          actionDate: token.actedAt ?? token.createdAt ?? null,
          comment: token.rejectComment ?? "—",
          openHref,
        });
      }
    } else {
      historyRows.push({
        rowId: statusRow.id,
        reportId: statusRow.reportId,
        reportDate: ymd(statusRow.day),
        reportTitle: statusRow.reportDefinition.name,
        reportCode: statusRow.reportDefinition.code,
        documentNumber: snapshotInfo?.documentNumber ?? "—",
        revisionNo:
          typeof snapshotInfo?.snapshotRevisionNo === "number"
            ? snapshotInfo.snapshotRevisionNo
            : 0,
        currentStatus: statusRow.status,
        approvalAction: statusRow.status,
        actedBy:
          statusRow.approvedBy || statusRow.submittedBy || statusRow.lockedBy || "—",
        actionDate:
          statusRow.approvedAt || statusRow.submittedAt || statusRow.lockedAt || null,
        comment: "—",
        openHref,
      });
    }
  }

  historyRows.sort((a, b) => {
    const aTime = a.actionDate ? new Date(a.actionDate).getTime() : 0;
    const bTime = b.actionDate ? new Date(b.actionDate).getTime() : 0;
    if (bTime !== aTime) return bTime - aTime;
    return b.reportDate.localeCompare(a.reportDate);
  });

  const filteredHistoryRows = historyRows.filter((row) => {
    const matchesDate = !historyDate || row.reportDate === historyDate;
    const matchesReport = !historyReport || row.reportCode === historyReport;

    const q = historyQuery.toLowerCase();
    const matchesQuery =
      !q ||
      row.reportTitle.toLowerCase().includes(q) ||
      row.reportCode.toLowerCase().includes(q) ||
      row.documentNumber.toLowerCase().includes(q) ||
      row.currentStatus.toLowerCase().includes(q) ||
      row.approvalAction.toLowerCase().includes(q) ||
      row.actedBy.toLowerCase().includes(q) ||
      row.comment.toLowerCase().includes(q);

    return matchesDate && matchesReport && matchesQuery;
  });

  const historyQueryString = [
    `tab=history`,
    currentReportCode ? `report=${currentReportCode}` : "",
    selectedDate ? `date=${selectedDate}` : "",
    selectedRevisionValue ? `rev=${selectedRevisionValue}` : "",
    historyQuery ? `hq=${encodeURIComponent(historyQuery)}` : "",
    historyDate ? `hdate=${historyDate}` : "",
    historyReport ? `hreport=${historyReport}` : "",
  ]
    .filter(Boolean)
    .join("&");

  return (
    <div className="min-h-full space-y-4 overflow-y-auto p-4">
      <div className="text-sm text-white/50">
        <Link href="/gen/esg" className="transition hover:text-white/80">
          ESG Reports
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white/80">GHG Inventory</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {mainTabs.map((t) => {
          const isActive = mainTab === t.key;
          return (
            <Link
              key={t.key}
              href={
                t.key === "history"
                  ? `/gen/esg/ghg_inv?${historyQueryString}`
                  : `/gen/esg/ghg_inv?tab=${t.key}&${baseQuery}`
              }
              className={[
                "rounded-lg border px-4 py-2 text-sm transition",
                isActive
                  ? "border-white/20 bg-white/15"
                  : "border-white/10 bg-white/[0.04] hover:bg-white/10",
              ].join(" ")}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {mainTab === "data-entry" && (
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-3xl font-bold">
                Welcome,
                <span className="text-white/70">
                  {user.name ? ` ${user.name}` : ""}
                </span>
              </div>

              <div className="mt-2 text-xs">
                <span className="rounded bg-white/10 px-2 py-1">
                  Mode: {activeReportMode}
                </span>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="grid grid-cols-1 items-end gap-3 lg:grid-cols-[2fr_1fr]">
                  <div className="min-w-0 w-full">
                    <ReportAndDateFilters
                      reports={dataEntryReports.map((r) => ({
                        id: r.id,
                        code: r.code,
                        name: r.name,
                      }))}
                      selectedReportCode={activeDataEntryReport?.code ?? REPORT_CODE}
                      selectedDate={selectedDate}
                      mainTab={mainTab}
                      rightTab={rightTab}
                    />
                  </div>

                  <div className="min-w-0 w-full">
                    <RevisionFilterSelect
                      revisions={availableRevisions.map((r) => ({
                        id: r.id,
                        revisionNo: r.snapshotRevisionNo ?? 0,
                        documentNumber: r.documentNumber ?? "",
                      }))}
                      value={selectedRevisionValue}
                      mainTab={mainTab}
                      rightTab={rightTab}
                      selectedReportCode={activeDataEntryReport?.code ?? REPORT_CODE}
                      selectedDate={selectedDate}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-center">
                  <div className="text-xs uppercase tracking-wide text-white/45">
                    Submitted Reports
                  </div>
                  <div className="mt-2 text-4xl font-semibold">
                    {currentDayStatus?.status === "SUBMITTED" ||
                    currentDayStatus?.status === "APPROVED"
                      ? 1
                      : 0}
                  </div>
                  <div className="mt-1 text-sm text-white/60">
                    {reportDisplayStatus}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-center">
                  <div className="text-xs uppercase tracking-wide text-white/45">
                    Rejected Reports
                  </div>
                  <div className="mt-2 text-4xl font-semibold">0</div>
                  <div className="mt-1 text-sm text-white/60">
                    Rejected Reports
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="grid items-end gap-3 md:grid-cols-[1fr_auto]">
                  <form
                    id="submit-approval-form"
                    action="/api/esg/ghg_inv/submit"
                    method="POST"
                    className="min-w-0"
                  >
                    <input type="hidden" name="tenantId" value={tenant.id} />
                    <input
                      type="hidden"
                      name="reportId"
                      value={activeDataEntryReport?.id ?? ""}
                    />
                    <input
                      type="hidden"
                      name="reportCode"
                      value={activePreviewCode}
                    />
                    <input
                      type="hidden"
                      name="reportName"
                      value={activePreviewTitle}
                    />
                    <input type="hidden" name="date" value={selectedDate} />
                    <input
                      type="hidden"
                      name="revisionNo"
                      value={snapshot?.snapshotRevisionNo ?? 0}
                    />
                    <input
                      type="hidden"
                      name="snapshotId"
                      value={snapshot?.id ?? ""}
                    />
                    <input
                      type="hidden"
                      name="documentNumber"
                      value={snapshot?.documentNumber ?? ""}
                    />
                    <input
                      type="hidden"
                      name="returnTo"
                      value={`/gen/esg/ghg_inv?${baseQuery}`}
                    />

                    <div className="text-sm font-medium">Select Approver</div>
                    <select
                      name="approverUserId"
                      disabled={
                        !canEditActiveReport ||
                        approverCandidates.length === 0 ||
                        !snapshotExists ||
                        (currentDayStatus?.status ?? "DRAFT") !== "DRAFT"
                      }
                      defaultValue={defaultApproverUserId}
                      className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm disabled:opacity-50"
                    >
                      {approverCandidates.length === 0 ? (
                        <option value="">No dedicated approver found</option>
                      ) : (
                        approverCandidates.map((a) => (
                          <option key={a.userId} value={a.userId}>
                            {a.label}
                          </option>
                        ))
                      )}
                    </select>
                  </form>

                  <div className="flex gap-2">
                    {activeDataEntryReport && (
                      <InsertGenerateButton
                        tenantId={tenant.id}
                        reportId={activeDataEntryReport.id}
                        reportCode={activePreviewCode}
                        reportDate={selectedDate}
                        disabled={snapshotExists}
                      />
                    )}

                    {activeDataEntryReport && (
                      <NewRevisionButton
                        tenantId={tenant.id}
                        reportId={activeDataEntryReport.id}
                        reportCode={activePreviewCode}
                        reportDate={selectedDate}
                        disabled={!snapshotExists || !isLatestRevision}
                      />
                    )}

                    {canSubmitActiveReport &&
                      snapshotExists &&
                      (currentDayStatus?.status ?? "DRAFT") === "DRAFT" && (
                        <button
                          type="submit"
                          form="submit-approval-form"
                          className="rounded-md border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-300 transition hover:bg-blue-500/15"
                        >
                          Submit
                        </button>
                      )}

                    {canApproveActiveReport &&
                      currentDayStatus?.status === "SUBMITTED" && (
                        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
                          Review from email
                        </div>
                      )}
                  </div>
                </div>

                <div className="mt-2 text-xs text-white/45">
                  {snapshotExists
                    ? `Viewing revision ${
                        typeof snapshot?.snapshotRevisionNo === "number"
                          ? snapshot.snapshotRevisionNo
                          : 0
                      }${
                        snapshot?.documentNumber
                          ? ` / ${snapshot.documentNumber}`
                          : ""
                      } / Status: ${reportDisplayStatus}`
                    : "No snapshot exists for the selected report/date. Use Insert to create it."}
                </div>

                {snapshotExists && !snapshotHasDetails && (
                  <div className="mt-2 text-xs text-amber-300">
                    Snapshot header exists, but no detail rows are linked to this revision yet.
                  </div>
                )}

                {currentDayStatus?.status === "REJECTED" &&
                  latestApprovalAction?.rejectComment && (
                    <div className="mt-2 text-xs text-red-300">
                      Reason: {latestApprovalAction.rejectComment}
                    </div>
                  )}
              </div>
            </div>

            <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-wide text-white/50">
                  Reports
                </div>
                <div className="mt-1 text-sm text-white/45">
                  Selected report:
                </div>
                <div className="mt-1 text-xs text-white/45">
                  Viewing revision:{" "}
                  {typeof snapshot?.snapshotRevisionNo === "number"
                    ? snapshot.snapshotRevisionNo
                    : 0}
                  {snapshot?.documentNumber ? ` / ${snapshot.documentNumber}` : ""}
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="bg-slate-950 text-white">
                        <th className="px-3 py-3 text-left">Report Name</th>
                        <th className="px-3 py-3 text-left">Document Number</th>
                        <th className="px-3 py-3 text-left">Revision.No</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeReport ? (
                        <tr
                          key={activeReport.id}
                          className={[
                            "border-b border-white/10",
                            "ring-1 ring-blue-500/40",
                            activeReport.mode === "RESPONSIBLE" &&
                              "bg-blue-500/10",
                            activeReport.mode === "APPROVER" &&
                              "bg-emerald-500/10",
                            activeReport.mode === "OWNER" && "bg-cyan-500/10",
                            activeReport.mode === "NONE" && "bg-white/5",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <td className="px-3 py-3">{activeReport.name}</td>
                          <td className="px-3 py-3">
                            {activeReport.documentNumber}
                          </td>
                          <td className="px-3 py-3">{activeReport.revisionNo}</td>
                        </tr>
                      ) : (
                        <tr className="border-b border-white/10 bg-white/5">
                          <td
                            colSpan={3}
                            className="px-3 py-6 text-center text-white/40"
                          >
                            No report selected.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {canEditActiveReport ? (
                <>
                  <DataSection
                    title="Manual Data Entry"
                    note="Double click on the highlighted cell to insert data:"
                  >
                    <EditableMeasurementTable rows={manualData} />
                  </DataSection>

                  <DataSection
                    title="SCADA Reading"
                    note="Values are loaded automatically from SCADA snapshot."
                  >
                    <SimpleTable rows={scadaData} />
                  </DataSection>

                  <DataSection
                    title="Calculated"
                    note="Calculated values generated by the calculation engine."
                  >
                    <SimpleTable rows={calculatedData} />
                  </DataSection>
                </>
              ) : (
                <>
                  <DataSection
                    title="Manual Data Entry (Read Only)"
                    note={
                      isLatestRevision
                        ? "You do not have permission to edit this report."
                        : "Older revisions are read-only."
                    }
                  >
                    <EditableMeasurementTable rows={manualData} />
                  </DataSection>

                  <DataSection
                    title="SCADA Reading (Read Only)"
                    note="Values are loaded automatically from SCADA snapshot."
                  >
                    <SimpleTable rows={scadaData} />
                  </DataSection>

                  <DataSection
                    title="Calculated (Read Only)"
                    note="Calculated values generated by the calculation engine."
                  >
                    <SimpleTable rows={calculatedData} />
                  </DataSection>
                </>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] xl:col-span-6">
            <div className="flex flex-wrap border-b border-white/10 bg-slate-950">
              {rightTabs.map((t) => {
                const isActive = rightTab === t.key;
                return (
                  <Link
                    key={t.key}
                    href={`/gen/esg/ghg_inv?tab=data-entry&rightTab=${t.key}&${baseQuery}`}
                    className={[
                      "border-b-2 px-5 py-4 text-sm transition",
                      isActive
                        ? "border-blue-500 text-white"
                        : "border-transparent text-white/60 hover:text-white",
                    ].join(" ")}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </div>

            <div className="flex h-full flex-col p-4">
              {rightTab === "charts" && (
                <div className="space-y-5">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Link
                      href={`/gen/esg/ghg_inv?${checkPointBaseQuery}&cpMode=inputs&cpInputType=${checkPointInputType}`}
                      className={[
                        "rounded-2xl px-4 py-3 text-center text-sm font-semibold transition",
                        checkPointMode === "inputs"
                          ? "bg-white/10 text-white ring-1 ring-white/10"
                          : "bg-white/[0.04] text-white/80 hover:bg-white/10",
                      ].join(" ")}
                    >
                      Inputs
                    </Link>

                    <Link
                      href={`/gen/esg/ghg_inv?${checkPointBaseQuery}&cpMode=outputs`}
                      className={[
                        "rounded-2xl px-4 py-3 text-center text-sm font-semibold transition",
                        checkPointMode === "outputs"
                          ? "bg-white/10 text-white ring-1 ring-white/10"
                          : "bg-white/[0.04] text-white/80 hover:bg-white/10",
                      ].join(" ")}
                    >
                      Outputs
                    </Link>
                  </div>

                  {checkPointMode === "inputs" && (
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/gen/esg/ghg_inv?${checkPointBaseQuery}&cpMode=inputs&cpInputType=manual`}
                        className={[
                          "inline-flex items-center rounded-md px-3 py-1.5 text-xs font-semibold transition",
                          checkPointInputType === "manual"
                            ? "bg-blue-500/15 text-white ring-1 ring-blue-500/30"
                            : "bg-white/[0.04] text-white/75 hover:bg-white/10",
                        ].join(" ")}
                      >
                        Manual Inputs
                      </Link>

                      <Link
                        href={`/gen/esg/ghg_inv?${checkPointBaseQuery}&cpMode=inputs&cpInputType=scada`}
                        className={[
                          "inline-flex items-center rounded-md px-3 py-1.5 text-xs font-semibold transition",
                          checkPointInputType === "scada"
                            ? "bg-blue-500/15 text-white ring-1 ring-blue-500/30"
                            : "bg-white/[0.04] text-white/75 hover:bg-white/10",
                        ].join(" ")}
                      >
                        SCADA Inputs
                      </Link>
                    </div>
                  )}

                  <div>
                    <div className="text-sm font-medium">
                      {checkPointMode === "outputs"
                        ? "Calculated Outputs:"
                        : checkPointInputType === "manual"
                        ? "Manual Input Tags:"
                        : "SCADA Input Tags:"}
                    </div>

                    <form method="GET" action="/gen/esg/ghg_inv" className="mt-2 space-y-2">
                      <input type="hidden" name="tab" value="data-entry" />
                      <input type="hidden" name="rightTab" value="charts" />
                      <input type="hidden" name="report" value={currentReportCode} />
                      <input type="hidden" name="date" value={selectedDate} />
                      {selectedRevisionValue ? (
                        <input type="hidden" name="rev" value={selectedRevisionValue} />
                      ) : null}
                      <input type="hidden" name="cpMode" value={checkPointMode} />
                      {checkPointMode === "inputs" ? (
                        <input
                          type="hidden"
                          name="cpInputType"
                          value={checkPointInputType}
                        />
                      ) : null}

                      <select
                        name="cpTag"
                        defaultValue={selectedCheckPointRow?.tagNo ?? ""}
                        className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm"
                        disabled={currentCheckPointRows.length === 0}
                      >
                        {currentCheckPointRows.length === 0 ? (
                          <option value="">No parameters available</option>
                        ) : (
                          currentCheckPointRows.map((row) => (
                            <option key={row.measurementPointId} value={row.tagNo}>
                              {row.description}
                            </option>
                          ))
                        )}
                      </select>

                      <button
                        type="submit"
                        className="rounded-md border border-white/10 bg-white/[0.04] px-4 py-2 text-sm transition hover:bg-white/10"
                        disabled={currentCheckPointRows.length === 0}
                      >
                        Apply
                      </button>
                    </form>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">Bar Chart</div>
                      {selectedCheckPointRow ? (
                        <div className="text-xs text-white/45">
                          {selectedCheckPointRow.tagNo} • {selectedCheckPointRow.unit || "—"}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-4">
                      <MiniBarChart
                        title={selectedCheckPointRow?.description ?? ""}
                        points={latestBarPoints}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">Trend Chart</div>
                      {selectedCheckPointRow ? (
                        <div className="text-xs text-white/45">
                          Current Value: {selectedCheckPointRow.value || "—"}{" "}
                          {selectedCheckPointRow.unit || ""}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-4">
                      <MiniTrendChart
                        title={selectedCheckPointRow?.description ?? ""}
                        points={chartPoints}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="text-sm font-medium">Selected Parameter Details</div>

                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[640px] text-sm">
                        <thead>
                          <tr className="bg-slate-950 text-white">
                            <th className="px-3 py-3 text-left">Tag No.</th>
                            <th className="px-3 py-3 text-left">Description</th>
                            <th className="px-3 py-3 text-right">Value</th>
                            <th className="px-3 py-3 text-left">Unit</th>
                            <th className="px-3 py-3 text-left">Group</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCheckPointRow ? (
                            <tr className="border-b border-white/10 bg-white/5">
                              <td className="px-3 py-3">{selectedCheckPointRow.tagNo}</td>
                              <td className="px-3 py-3">
                                {selectedCheckPointRow.description}
                              </td>
                              <td className="px-3 py-3 text-right">
                                {selectedCheckPointRow.value}
                              </td>
                              <td className="px-3 py-3">{selectedCheckPointRow.unit}</td>
                              <td className="px-3 py-3">
                                {checkPointMode === "outputs"
                                  ? "Calculated Output"
                                  : checkPointInputType === "manual"
                                  ? "Manual Input"
                                  : "SCADA Input"}
                              </td>
                            </tr>
                          ) : (
                            <tr className="border-b border-white/10 bg-white/5">
                              <td
                                colSpan={5}
                                className="px-3 py-6 text-center text-white/40"
                              >
                                No data for selected group.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {rightTab === "report" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-white/90">
                      Report Preview
                    </div>

                    <SendReportDialog
                      reportCode={activePreviewCode}
                      reportTitle={activePreviewTitle}
                      reportDate={selectedDate}
                      pdfUrl={activePreviewPdfSrc}
                      documentNumber={snapshot?.documentNumber ?? ""}
                      revisionNo={snapshot?.snapshotRevisionNo ?? 0}
                    />
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <GhgInvReportView
                      src={activePreviewHtmlSrc}
                      title={activePreviewTitle}
                      reportDate={selectedDate}
                    />
                  </div>
                </div>
              )}

              {rightTab === "reports-in-process" && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-sm">
                    <thead>
                      <tr className="bg-slate-950 text-white">
                        <th className="px-3 py-3 text-left">Selected Date</th>
                        <th className="px-3 py-3 text-left">Report Name</th>
                        <th className="px-3 py-3 text-left">Current Status</th>
                        <th className="px-3 py-3 text-left">Responsible Person</th>
                        <th className="px-3 py-3 text-left">Validator</th>
                        <th className="px-3 py-3 text-left">
                          Accountable Person
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeReport ? (
                        <tr
                          key={activeReport.id}
                          className={[
                            "border-b border-white/10",
                            "font-semibold text-white ring-1 ring-blue-500/40",
                            activeReport.mode === "RESPONSIBLE" &&
                              "bg-blue-500/10",
                            activeReport.mode === "APPROVER" &&
                              "bg-emerald-500/10",
                            activeReport.mode === "OWNER" && "bg-cyan-500/10",
                            activeReport.mode === "NONE" && "bg-white/5",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <td className="px-3 py-3">{selectedDate}</td>
                          <td className="px-3 py-3">{activeReport.name}</td>
                          <td className="px-3 py-3">
                            {String(activeReport.status).toLowerCase()} /{" "}
                            {activeReport.mode.toLowerCase()}
                          </td>
                          <td className="px-3 py-3">
                            {activeReport.responsiblePerson}
                          </td>
                          <td className="px-3 py-3">{activeReport.validator}</td>
                          <td className="px-3 py-3">
                            {activeReport.accountant}
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              )}

              {rightTab === "report-event-history" && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px] text-sm">
                    <thead>
                      <tr className="bg-slate-950 text-white">
                        <th className="px-3 py-3 text-left">Event Date</th>
                        <th className="px-3 py-3 text-left">Document Stage</th>
                        <th className="px-3 py-3 text-left">Sent From</th>
                        <th className="px-3 py-3 text-left">Sent To</th>
                        <th className="px-3 py-3 text-left">Comment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventHistory.map((e, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-white/10 bg-white/5"
                        >
                          <td className="px-3 py-3">{e.eventDate}</td>
                          <td className="px-3 py-3">{e.stage}</td>
                          <td className="px-3 py-3">{e.sentFrom}</td>
                          <td className="px-3 py-3">{e.sentTo}</td>
                          <td className="px-3 py-3">{e.comment || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {mainTab === "dashboards" && (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div>
            <div className="text-xl font-semibold">Dashboards</div>
            <div className="mt-1 text-sm text-white/60">
              Full ESG Power BI dashboard for GHG reporting.
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="font-medium">Power BI Dashboard</div>
            <div className="mt-3 text-sm text-white/60">
              This is the full ESG dashboard, including consolidated visuals and KPI views.
            </div>

            <div className="mt-4">
              <PowerBIEmbed
                title={powerBIReports.esg.title}
                reportUrl={powerBIReports.esg.url}
              />
            </div>
          </div>
        </div>
      )}

      {mainTab === "history" && (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div>
            <div className="text-xl font-semibold">Report History</div>
            <div className="mt-1 text-sm text-white/60">
              Chronological history of reports where you are responsible.
            </div>
          </div>

          <form
            method="GET"
            action="/gen/esg/ghg_inv"
            className="rounded-xl border border-white/10 bg-black/20 p-4"
          >
            <input type="hidden" name="tab" value="history" />
            <input type="hidden" name="report" value={currentReportCode} />
            <input type="hidden" name="date" value={selectedDate} />
            {selectedRevisionValue ? (
              <input type="hidden" name="rev" value={selectedRevisionValue} />
            ) : null}

            <div className="grid gap-3 lg:grid-cols-[1.4fr_0.9fr_1fr_auto_auto]">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wide text-white/45">
                  Search
                </div>
                <input
                  type="text"
                  name="hq"
                  defaultValue={historyQuery}
                  placeholder="Search title, document no, approver, comment..."
                  className="mt-1 h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm"
                />
              </div>

              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wide text-white/45">
                  Date
                </div>
                <input
                  type="date"
                  name="hdate"
                  defaultValue={historyDate}
                  className="mt-1 h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm"
                />
              </div>

              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wide text-white/45">
                  Report Type
                </div>
                <select
                  name="hreport"
                  defaultValue={historyReport}
                  className="mt-1 h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm"
                >
                  <option value="">All Responsible Reports</option>
                  {responsibleReports.map((r) => (
                    <option key={r.id} value={r.code}>
                      {r.code} — {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="h-11 rounded-md border border-white/10 bg-white/[0.04] px-4 text-sm transition hover:bg-white/10"
                >
                  Apply
                </button>
              </div>

              <div className="flex items-end">
                <Link
                  href={`/gen/esg/ghg_inv?tab=history&report=${currentReportCode}&date=${selectedDate}${
                    selectedRevisionValue ? `&rev=${selectedRevisionValue}` : ""
                  }`}
                  className="flex h-11 items-center rounded-md border border-white/10 bg-white/[0.04] px-4 text-sm transition hover:bg-white/10"
                >
                  Clear
                </Link>
              </div>
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1450px] text-sm">
              <thead>
                <tr className="bg-slate-950 text-white">
                  <th className="px-3 py-3 text-left">Report Date</th>
                  <th className="px-3 py-3 text-left">Report Title</th>
                  <th className="px-3 py-3 text-left">Code</th>
                  <th className="px-3 py-3 text-left">Document Number</th>
                  <th className="px-3 py-3 text-left">Revision</th>
                  <th className="px-3 py-3 text-left">Current Status</th>
                  <th className="px-3 py-3 text-left">Approval Action</th>
                  <th className="px-3 py-3 text-left">Acted By</th>
                  <th className="px-3 py-3 text-left">Action Date</th>
                  <th className="px-3 py-3 text-left">Comment</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistoryRows.length > 0 ? (
                  filteredHistoryRows.map((row) => (
                    <tr
                      key={row.rowId}
                      className="border-b border-white/10 bg-white/5 transition hover:bg-white/10"
                    >
                      <td className="px-3 py-3">
                        <Link href={row.openHref} className="block h-full w-full">
                          {row.reportDate}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <Link href={row.openHref} className="block h-full w-full">
                          {row.reportTitle}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <Link href={row.openHref} className="block h-full w-full">
                          {row.reportCode}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <Link href={row.openHref} className="block h-full w-full">
                          {row.documentNumber}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <Link href={row.openHref} className="block h-full w-full">
                          {row.revisionNo}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <Link href={row.openHref} className="block h-full w-full">
                          {row.currentStatus}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <Link href={row.openHref} className="block h-full w-full">
                          {row.approvalAction}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <Link href={row.openHref} className="block h-full w-full">
                          {row.actedBy}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <Link href={row.openHref} className="block h-full w-full">
                          {formatDateTime(row.actionDate)}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <Link href={row.openHref} className="block h-full w-full">
                          {row.comment}
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-b border-white/10 bg-white/5">
                    <td
                      colSpan={10}
                      className="px-3 py-6 text-center text-white/40"
                    >
                      No history found for selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function DataSection({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-sm font-semibold uppercase tracking-wide text-white/60">
        {title}
      </div>
      <div className="mt-1 text-sm text-white/40">{note}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function SimpleTable({
  rows,
}: {
  rows: Array<{
    tagNo: string;
    description: string;
    value: string;
    unit: string;
  }>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="bg-slate-950 text-white">
            <th className="px-3 py-3 text-left">Tag No.</th>
            <th className="px-3 py-3 text-left">Description</th>
            <th className="px-3 py-3 text-right">Value</th>
            <th className="px-3 py-3 text-left">Unit</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r, idx) => (
              <tr key={idx} className="border-b border-white/10 bg-white/5">
                <td className="px-3 py-3">{r.tagNo}</td>
                <td className="px-3 py-3">{r.description}</td>
                <td className="px-3 py-3 text-right">{r.value}</td>
                <td className="px-3 py-3">{r.unit}</td>
              </tr>
            ))
          ) : (
            <tr className="border-b border-white/10 bg-white/5">
              <td colSpan={4} className="px-3 py-6 text-center text-white/40">
                No data for selected report/date.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function MiniBarChart({
  title,
  points,
}: {
  title: string;
  points: ChartPoint[];
}) {
  if (!points.length) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-white/40">
        No chart data available.
      </div>
    );
  }

  const maxValue = Math.max(...points.map((p) => p.value), 1);

  return (
    <div className="space-y-4">
      <div className="text-center text-sm text-white/70">{title}</div>

      <div className="flex h-60 items-end gap-3">
        {points.map((p, idx) => {
          const height = Math.max((p.value / maxValue) * 180, 8);

          return (
            <div
              key={`${p.xLabel}_${idx}`}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <div className="text-[11px] text-white/55">
                {formatNumericValue(p.value)}
              </div>
              <div
                className="w-full max-w-[56px] rounded-t-md bg-blue-400/70"
                style={{ height: `${height}px` }}
                title={`${p.xLabel} / ${formatNumericValue(p.value)}`}
              />
              <div className="text-center text-[11px] leading-tight text-white/45">
                {p.xLabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniTrendChart({
  title,
  points,
}: {
  title: string;
  points: ChartPoint[];
}) {
  if (!points.length) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-white/40">
        No chart data available.
      </div>
    );
  }

  const width = 900;
  const height = 260;
  const pad = 24;

  const minValue = Math.min(...points.map((p) => p.value));
  const maxValue = Math.max(...points.map((p) => p.value));
  const valueRange = Math.max(maxValue - minValue, 1);

  const coords = points.map((p, i) => {
    const x =
      points.length === 1
        ? width / 2
        : pad + (i * (width - pad * 2)) / (points.length - 1);

    const y =
      height - pad - ((p.value - minValue) / valueRange) * (height - pad * 2);

    return { ...p, x, y };
  });

  const polyline = coords.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="space-y-4">
      <div className="text-center text-sm text-white/70">{title}</div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-64 w-full overflow-visible"
        preserveAspectRatio="none"
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const y = pad + (i * (height - pad * 2)) / 4;
          return (
            <line
              key={i}
              x1={pad}
              y1={y}
              x2={width - pad}
              y2={y}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1"
            />
          );
        })}

        <polyline
          fill="none"
          stroke="rgba(96,165,250,0.9)"
          strokeWidth="3"
          points={polyline}
        />

        {coords.map((p, i) => (
          <g key={`${p.xLabel}_${i}`}>
            <circle cx={p.x} cy={p.y} r="4" fill="rgba(147,197,253,1)" />
          </g>
        ))}
      </svg>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {points.slice(-8).map((p, i) => (
          <div
            key={`${p.xLabel}_${i}`}
            className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2"
          >
            <div className="text-[11px] text-white/45">{p.xLabel}</div>
            <div className="text-sm font-semibold text-white/85">
              {formatNumericValue(p.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
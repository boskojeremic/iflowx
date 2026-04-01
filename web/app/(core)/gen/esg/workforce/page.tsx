import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import ReportView from "@/components/ReportView";
import GenerateWorkforceSnapshotButton from "@/components/esg/GenerateWorkforceSnapshotButton";
import WorkforceFormClient from "@/components/esg/WorkforceFormClient";
import NewWorkforceRevisionButton from "@/components/esg/NewWorkforceRevisionButton";
import WorkforceRevisionSelect from "@/components/esg/WorkforceRevisionSelect";
import WorkforceDateSelect from "@/components/esg/WorkforceDateSelect";

export const dynamic = "force-dynamic";

const REPORT_CODE = "WORKFORCE";

type SearchParams = Promise<{
  tab?: string;
  rightTab?: string;
  date?: string;
  rev?: string;
  _ts?: string;
  hq?: string;
  hdate?: string;
}>;

function todayYmd() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

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

function getNumericValue(
  valueMap: Map<
    string,
    {
      valueNumber?: unknown;
      valueText?: string | null;
      valueBoolean?: boolean | null;
      valueDate?: Date | null;
      valueJson?: unknown;
    }
  >,
  code: string
) {
  const v = valueMap.get(code);
  if (!v) return 0;

  if (v.valueNumber !== null && v.valueNumber !== undefined) {
    const n = Number(v.valueNumber);
    return Number.isFinite(n) ? n : 0;
  }

  if (v.valueText !== null && v.valueText !== undefined) {
    const n = Number(v.valueText);
    return Number.isFinite(n) ? n : 0;
  }

  return 0;
}

async function getCurrentTenantContext(email: string) {
  const membership = await db.membership.findFirst({
    where: {
      user: { email },
      status: "ACTIVE",
    },
    select: {
      tenantId: true,
      tenant: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return membership ?? null;
}

export default async function WorkforceReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const ctx = await getCurrentTenantContext(session.user.email);
  if (!ctx) redirect("/login");

  const user = await db.user.findFirst({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) notFound();

  const tenantId = ctx.tenantId;
  const sp = await searchParams;

  const mainTab = String(sp?.tab ?? "data-entry").toLowerCase();
  const rightTab = String(sp?.rightTab ?? "report").toLowerCase();
  const selectedDate = String(sp?.date ?? todayYmd());
  const selectedRevisionParam = sp?.rev;
  const previewTs = String(sp?._ts ?? "");
  const historyQuery = String(sp?.hq ?? "").trim().toLowerCase();
  const historyDate = String(sp?.hdate ?? "").trim();

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

  const report = await db.reportDefinition.findFirst({
    where: {
      tenantId,
      code: REPORT_CODE,
      isActive: true,
      ReportGroup: {
        is: {
          tenantId,
          moduleId: moduleItem.id,
          isActive: true,
        },
      },
    },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      ReportGroup: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
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
          placeholder: true,
          helpText: true,
          enumOptions: true,
          sortOrder: true,
          isRequired: true,
        },
      },
      reportFunctionAssignments: {
        where: {
          tenantId,
          isActive: true,
        },
        select: {
          responsibleFunctionId: true,
          approverFunctionId: true,
        },
        take: 1,
      },
    },
  });

  if (!report) notFound();

  const availableRevisions = await db.measurementSnapshot.findMany({
    where: {
      tenantId,
      reportId: report.id,
      snapshotDate: toDateOnly(selectedDate),
    },
    orderBy: [{ snapshotRevisionNo: "desc" }],
    select: {
      id: true,
      snapshotRevisionNo: true,
      documentNumber: true,
    },
  });

  let snapshot = await db.measurementSnapshot.findFirst({
    where: {
      tenantId,
      reportId: report.id,
      snapshotDate: toDateOnly(selectedDate),
      ...(selectedRevision !== null ? { snapshotRevisionNo: selectedRevision } : {}),
    },
    orderBy: selectedRevision !== null ? undefined : [{ snapshotRevisionNo: "desc" }],
    include: {
      fieldValues: {
        include: {
          templateField: true,
        },
      },
    },
  });

  if (!snapshot && selectedRevision !== null) {
    snapshot = await db.measurementSnapshot.findFirst({
      where: {
        tenantId,
        reportId: report.id,
        snapshotDate: toDateOnly(selectedDate),
      },
      orderBy: [{ snapshotRevisionNo: "desc" }],
      include: {
        fieldValues: {
          include: {
            templateField: true,
          },
        },
      },
    });
  }

  const latestRevisionNo = availableRevisions[0]?.snapshotRevisionNo ?? 0;
  const isLatestRevision =
    !snapshot?.snapshotRevisionNo ||
    snapshot.snapshotRevisionNo === latestRevisionNo;

  const selectedRevisionValue =
    selectedRevision !== null
      ? String(selectedRevision)
      : availableRevisions.length > 0
        ? String(availableRevisions[0].snapshotRevisionNo ?? "")
        : "";

  const currentDayStatus = await db.reportDayStatus.findUnique({
    where: {
      tenantId_reportId_day: {
        tenantId,
        reportId: report.id,
        day: toDateOnly(selectedDate),
      },
    },
    select: {
      status: true,
      submittedAt: true,
      approvedAt: true,
      lockedAt: true,
      submittedBy: true,
      approvedBy: true,
      lockedBy: true,
    },
  });

  const latestApprovalAction = await db.reportApprovalToken.findFirst({
    where: {
      tenantId,
      reportId: report.id,
      day: toDateOnly(selectedDate),
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      status: true,
      approverEmail: true,
      rejectComment: true,
      actedAt: true,
      approverUserId: true,
    },
  });

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

  const approverFunctionId =
    report.reportFunctionAssignments[0]?.approverFunctionId ?? null;

  const approverCandidatesRaw = approverFunctionId
    ? await db.membership.findMany({
        where: {
          tenantId,
          status: "ACTIVE",
          operationalFunctionId: approverFunctionId,
        },
        select: {
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
    }))
    .sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
    );

  const defaultApproverUserId = approverCandidates[0]?.userId ?? "";

  const valueMap = new Map(
    (snapshot?.fieldValues ?? []).map((v) => [v.fieldCode, v])
  );

  const groupedSections = report.templateFields.reduce<
    Array<{
      sectionCode: string;
      fields: typeof report.templateFields;
    }>
  >((acc, field) => {
    const key = field.sectionCode || "GENERAL";
    const existing = acc.find((s) => s.sectionCode === key);
    if (existing) {
      existing.fields.push(field);
    } else {
      acc.push({
        sectionCode: key,
        fields: [field],
      });
    }
    return acc;
  }, []);

  const formSections = groupedSections.map((section) => ({
    sectionCode: section.sectionCode,
    fields: section.fields.map((field) => {
      const value = valueMap.get(field.code);
      return {
        ...field,
        value: value ? displayFieldValue(value) : "",
      };
    }),
  }));

  const snapshotExists = !!snapshot;
  const hasFieldValues = (snapshot?.fieldValues?.length ?? 0) > 0;

  const mainTabs = [
    { key: "data-entry", label: "Data Entry" },
    { key: "dashboards", label: "Dashboards" },
    { key: "history", label: "History" },
  ];

  const rightTabs = [
    { key: "summary", label: "Workforce Summary" },
    { key: "report", label: "Report" },
    { key: "reports-in-process", label: "Reports In Process" },
    { key: "report-event-history", label: "Report Event History" },
  ];

  const dashboardTabs = [
    { key: "charts", label: "Charts" },
    { key: "table", label: "Table" },
  ];

  const baseQuery = `date=${selectedDate}${
    selectedRevisionValue ? `&rev=${selectedRevisionValue}` : ""
  }`;

  const previewSrc =
    `/work-force-preview/${REPORT_CODE}` +
    `?tenantId=${encodeURIComponent(tenantId)}` +
    `&date=${encodeURIComponent(selectedDate)}` +
    `${previewTs ? `&_ts=${encodeURIComponent(previewTs)}` : ""}` +
    `${selectedRevisionValue ? `&rev=${encodeURIComponent(selectedRevisionValue)}` : ""}`;

  const totalEmployees = getNumericValue(valueMap, "TOTAL_EMP");
  const permanentEmployees = getNumericValue(valueMap, "PERM_EMP");
  const contractorEmployees = getNumericValue(valueMap, "CONT_EMP");
  const maleEmployees = getNumericValue(valueMap, "MALE_EMP");
  const femaleEmployees = getNumericValue(valueMap, "FEMALE_EMP");
  const ageLt30 = getNumericValue(valueMap, "AGE_LT30");
  const age30to50 = getNumericValue(valueMap, "AGE_30_50");
  const ageGt50 = getNumericValue(valueMap, "AGE_GT50");

  const summaryRows = [
    { section: "HEADCOUNT", metric: "Total Employees", value: totalEmployees, unit: "—" },
    { section: "HEADCOUNT", metric: "Permanent Employees", value: permanentEmployees, unit: "—" },
    { section: "HEADCOUNT", metric: "Contractors", value: contractorEmployees, unit: "—" },
    { section: "HEADCOUNT", metric: "Male Employees", value: maleEmployees, unit: "—" },
    { section: "HEADCOUNT", metric: "Female Employees", value: femaleEmployees, unit: "—" },
    { section: "AGE", metric: "Employees < 30", value: ageLt30, unit: "—" },
    { section: "AGE", metric: "Employees 30–50", value: age30to50, unit: "—" },
    { section: "AGE", metric: "Employees > 50", value: ageGt50, unit: "—" },
  ];

  const historyStatusesRaw = await db.reportDayStatus.findMany({
    where: {
      tenantId,
      reportId: report.id,
    },
    orderBy: [{ day: "desc" }],
    select: {
      id: true,
      day: true,
      status: true,
      submittedAt: true,
      approvedAt: true,
      lockedAt: true,
      submittedBy: true,
      approvedBy: true,
      lockedBy: true,
      reportId: true,
    },
  });

  const historySnapshots = await db.measurementSnapshot.findMany({
    where: {
      tenantId,
      reportId: report.id,
    },
    orderBy: [{ snapshotDate: "desc" }, { snapshotRevisionNo: "desc" }],
    select: {
      id: true,
      reportId: true,
      snapshotDate: true,
      snapshotRevisionNo: true,
      documentNumber: true,
    },
  });

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

  const historyRows = historyStatusesRaw
    .map((row) => {
      const key = `${row.reportId}_${ymd(row.day)}`;
      const snapshotInfo = latestHistorySnapshotByKey.get(key);

      return {
        id: row.id,
        reportDate: ymd(row.day),
        reportTitle: report.name,
        code: report.code,
        documentNumber: snapshotInfo?.documentNumber ?? "—",
        revisionNo:
          typeof snapshotInfo?.snapshotRevisionNo === "number"
            ? snapshotInfo.snapshotRevisionNo
            : 0,
        currentStatus: row.status,
        actionDate: row.approvedAt || row.submittedAt || row.lockedAt || null,
        actedBy: row.approvedBy || row.submittedBy || row.lockedBy || "—",
        openHref: `/gen/esg/workforce?tab=data-entry&date=${ymd(row.day)}&rev=${
          typeof snapshotInfo?.snapshotRevisionNo === "number"
            ? snapshotInfo.snapshotRevisionNo
            : 0
        }`,
      };
    })
    .filter((row) => {
      const matchesDate = !historyDate || row.reportDate === historyDate;
      const matchesQuery =
        !historyQuery ||
        row.reportTitle.toLowerCase().includes(historyQuery) ||
        row.code.toLowerCase().includes(historyQuery) ||
        row.documentNumber.toLowerCase().includes(historyQuery) ||
        row.currentStatus.toLowerCase().includes(historyQuery) ||
        row.actedBy.toLowerCase().includes(historyQuery);

      return matchesDate && matchesQuery;
    });

  return (
    <div className="min-h-full space-y-4 overflow-y-auto p-4">
      <div className="text-sm text-white/50">
        <Link href="/gen/esg" className="transition hover:text-white/80">
          ESG Reports
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white/80">{report.name}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {mainTabs.map((t) => {
          const isActive = mainTab === t.key;
          return (
            <Link
              key={t.key}
              href={`/gen/esg/workforce?tab=${t.key}&${baseQuery}`}
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
                  Mode: FORM REPORT
                </span>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="grid grid-cols-1 items-end gap-3 lg:grid-cols-[2fr_1fr_1fr]">
                  <div>
                    <div className="mb-1 text-xs uppercase tracking-wide text-white/45">
                      Report
                    </div>
                    <div className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm">
                      {report.name}
                    </div>
                  </div>

                  <div>
                    <WorkforceDateSelect value={selectedDate} />
                  </div>

                  <div className="min-w-0 w-full">
                    <WorkforceRevisionSelect
                      revisions={availableRevisions.map((r) => ({
                        id: r.id,
                        revisionNo: r.snapshotRevisionNo ?? 0,
                        documentNumber: r.documentNumber ?? "",
                      }))}
                      value={selectedRevisionValue}
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
                    {currentDayStatus?.status === "SUBMITTED" || currentDayStatus?.status === "APPROVED" ? "1" : "0"}
                  </div>
                  <div className="mt-1 text-sm text-white/60">
                    {currentDayStatus?.status ?? "Draft"}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-center">
                  <div className="text-xs uppercase tracking-wide text-white/45">
                    Rejected Reports
                  </div>
                  <div className="mt-2 text-4xl font-semibold">
                    {currentDayStatus?.status === "REJECTED" ? "1" : "0"}
                  </div>
                  <div className="mt-1 text-sm text-white/60">
                    {currentDayStatus?.status === "REJECTED" ? "Rejected Reports" : "—"}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="grid items-end gap-3 md:grid-cols-[1fr_auto]">
                  <form
                    id="submit-approval-form"
                    action="/api/esg/workforce/submit"
                    method="POST"
                    className="min-w-0"
                  >
                    <input type="hidden" name="tenantId" value={tenantId} />
                    <input type="hidden" name="reportId" value={report.id} />
                    <input type="hidden" name="reportCode" value={REPORT_CODE} />
                    <input type="hidden" name="reportName" value={report.name} />
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
                      value={`/gen/esg/workforce?${baseQuery}`}
                    />

                    <div className="text-sm font-medium">Select Approver</div>
                    <select
                      name="approverUserId"
                      disabled={
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
                    <GenerateWorkforceSnapshotButton
                      tenantId={tenantId}
                      reportCode={REPORT_CODE}
                      reportDate={selectedDate}
                      disabled={snapshotExists}
                    />

                    <NewWorkforceRevisionButton
                      tenantId={tenantId}
                      reportCode={REPORT_CODE}
                      reportDate={selectedDate}
                      disabled={!snapshotExists || !isLatestRevision}
                    />

                    {snapshotExists &&
                      (currentDayStatus?.status ?? "DRAFT") === "DRAFT" && (
                        <button
                          type="submit"
                          form="submit-approval-form"
                          className="rounded-md border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-300 transition hover:bg-blue-500/15"
                        >
                          Submit
                        </button>
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
                    : "No snapshot exists for the selected report/date. Use Generate to create it."}
                </div>

                {snapshotExists && !hasFieldValues && (
                  <div className="mt-2 text-xs text-amber-300">
                    Snapshot header exists, but no field values are saved yet.
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

            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-wide text-white/50">
                  Reports
                </div>
                <div className="mt-1 text-sm text-white/45">
                  Selected report:
                  <span className="ml-2 text-white/80">{report.name}</span>
                </div>
                <div className="mt-1 text-xs text-white/45">
                  Viewing revision:
                  <span className="ml-2 text-white/70">
                    {typeof snapshot?.snapshotRevisionNo === "number"
                      ? snapshot.snapshotRevisionNo
                      : 0}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="bg-slate-950 text-white">
                      <th className="px-3 py-3 text-left">Report Name</th>
                      <th className="px-3 py-3 text-left">Document Number</th>
                      <th className="px-3 py-3 text-right">Revision.No</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/10 bg-white/5">
                      <td className="px-3 py-3">{report.name}</td>
                      <td className="px-3 py-3">{snapshot?.documentNumber ?? "—"}</td>
                      <td className="px-3 py-3 text-right">
                        {typeof snapshot?.snapshotRevisionNo === "number"
                          ? snapshot.snapshotRevisionNo
                          : 0}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="space-y-5">
                {formSections.map((section) => (
                  <div
                    key={section.sectionCode}
                    className="rounded-xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="text-sm font-semibold uppercase tracking-wide text-white/60">
                      {section.sectionCode.replaceAll("_", " ")}
                    </div>

                    <div className="mt-2 text-xs text-white/40">
                      Values stored in generated report snapshot.
                    </div>

                    <div className="mt-4">
                      <WorkforceFormClient
                        snapshotId={snapshot?.id ?? ""}
                        canEdit={false}
                        sections={[section]}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="xl:col-span-6">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="flex flex-wrap border-b border-white/10 bg-slate-950">
                {rightTabs.map((t) => {
                  const isActive = rightTab === t.key;
                  return (
                    <Link
                      key={t.key}
                      href={`/gen/esg/workforce?tab=data-entry&rightTab=${t.key}&${baseQuery}`}
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

              {rightTab === "summary" && (
                <div className="space-y-4 p-4">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="text-sm font-medium">Workforce Summary</div>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[640px] text-sm">
                        <thead>
                          <tr className="bg-slate-950 text-white">
                            <th className="px-3 py-3 text-left">Section</th>
                            <th className="px-3 py-3 text-left">Metric</th>
                            <th className="px-3 py-3 text-right">Value</th>
                            <th className="px-3 py-3 text-left">Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summaryRows.map((row, idx) => (
                            <tr key={idx} className="border-b border-white/10 bg-white/5">
                              <td className="px-3 py-3">{row.section}</td>
                              <td className="px-3 py-3">{row.metric}</td>
                              <td className="px-3 py-3 text-right">{row.value}</td>
                              <td className="px-3 py-3">{row.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoBox label="Status" value={currentDayStatus?.status ?? "DRAFT"} />
                    <InfoBox
                      label="Approved By"
                      value={
                        currentDayStatus?.status === "APPROVED"
                          ? approvalActorName
                          : "—"
                      }
                    />
                    <InfoBox label="Submitted By" value={currentDayStatus?.submittedBy ?? "—"} />
                    <InfoBox
                      label="Document Number"
                      value={snapshot?.documentNumber ?? "—"}
                    />
                  </div>
                </div>
              )}

              {rightTab === "report" && (
                <div className="p-4">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <ReportView
                      pdfSrc={previewSrc}
                      title={report.name}
                      reportDate={selectedDate}
                    />
                  </div>
                </div>
              )}

              {rightTab === "reports-in-process" && (
                <div className="p-4">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="text-sm font-medium">Reports In Process</div>
                    <div className="mt-3 text-sm text-white/50">
                      Current workforce report is tracked through snapshot revision, approval status, and document number.
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <InfoBox label="Current Status" value={currentDayStatus?.status ?? "DRAFT"} />
                      <InfoBox
                        label="Current Revision"
                        value={
                          typeof snapshot?.snapshotRevisionNo === "number"
                            ? String(snapshot.snapshotRevisionNo)
                            : "0"
                        }
                      />
                      <InfoBox
                        label="Document Number"
                        value={snapshot?.documentNumber ?? "—"}
                      />
                      <InfoBox label="Submitted By" value={currentDayStatus?.submittedBy ?? "—"} />
                    </div>
                  </div>
                </div>
              )}

              {rightTab === "report-event-history" && (
                <div className="p-4">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="text-sm font-medium">Report Event History</div>

                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[720px] text-sm">
                        <thead>
                          <tr className="bg-slate-950 text-white">
                            <th className="px-3 py-3 text-left">Event</th>
                            <th className="px-3 py-3 text-left">Actor</th>
                            <th className="px-3 py-3 text-left">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-white/10 bg-white/5">
                            <td className="px-3 py-3">Submitted</td>
                            <td className="px-3 py-3">{currentDayStatus?.submittedBy ?? "—"}</td>
                            <td className="px-3 py-3">{formatDateTime(currentDayStatus?.submittedAt)}</td>
                          </tr>
                          <tr className="border-b border-white/10 bg-white/5">
                            <td className="px-3 py-3">Approved</td>
                            <td className="px-3 py-3">
                              {currentDayStatus?.status === "APPROVED" ? approvalActorName : "—"}
                            </td>
                            <td className="px-3 py-3">{formatDateTime(currentDayStatus?.approvedAt)}</td>
                          </tr>
                          <tr className="border-b border-white/10 bg-white/5">
                            <td className="px-3 py-3">Locked</td>
                            <td className="px-3 py-3">{currentDayStatus?.lockedBy ?? "—"}</td>
                            <td className="px-3 py-3">{formatDateTime(currentDayStatus?.lockedAt)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {mainTab === "dashboards" && (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-wrap border-b border-white/10 bg-slate-950 -m-5 mb-0">
            {dashboardTabs.map((t) => {
              const isActive = rightTab === t.key;
              return (
                <Link
                  key={t.key}
                  href={`/gen/esg/workforce?tab=dashboards&rightTab=${t.key}&${baseQuery}`}
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

          {rightTab === "charts" && (
            <div className="space-y-5 pt-4">
              <DashboardCard title="Headcount Composition">
                <MiniBarChart
                  title="Headcount Composition"
                  points={[
                    { label: "Total", value: totalEmployees },
                    { label: "Permanent", value: permanentEmployees },
                    { label: "Contractors", value: contractorEmployees },
                  ]}
                />
              </DashboardCard>

              <DashboardCard title="Gender Distribution">
                <MiniBarChart
                  title="Gender Distribution"
                  points={[
                    { label: "Male", value: maleEmployees },
                    { label: "Female", value: femaleEmployees },
                  ]}
                />
              </DashboardCard>

              <DashboardCard title="Age Distribution">
                <MiniBarChart
                  title="Age Distribution"
                  points={[
                    { label: "< 30", value: ageLt30 },
                    { label: "30–50", value: age30to50 },
                    { label: "> 50", value: ageGt50 },
                  ]}
                />
              </DashboardCard>

              <DashboardCard title="Workforce Ratios">
                <KpiGrid
                  items={[
                    {
                      label: "Permanent / Total",
                      value:
                        totalEmployees > 0
                          ? `${((permanentEmployees / totalEmployees) * 100).toFixed(1)}%`
                          : "0%",
                    },
                    {
                      label: "Contractors / Total",
                      value:
                        totalEmployees > 0
                          ? `${((contractorEmployees / totalEmployees) * 100).toFixed(1)}%`
                          : "0%",
                    },
                    {
                      label: "Female / Total",
                      value:
                        totalEmployees > 0
                          ? `${((femaleEmployees / totalEmployees) * 100).toFixed(1)}%`
                          : "0%",
                    },
                    {
                      label: "Male / Total",
                      value:
                        totalEmployees > 0
                          ? `${((maleEmployees / totalEmployees) * 100).toFixed(1)}%`
                          : "0%",
                    },
                  ]}
                />
              </DashboardCard>
            </div>
          )}

          {rightTab === "table" && (
            <div className="space-y-4 pt-4">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm font-medium">Summary Table</div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="bg-slate-950 text-white">
                        <th className="px-3 py-3 text-left">Section</th>
                        <th className="px-3 py-3 text-left">Metric</th>
                        <th className="px-3 py-3 text-right">Value</th>
                        <th className="px-3 py-3 text-left">Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryRows.map((row, idx) => (
                        <tr key={idx} className="border-b border-white/10 bg-white/5">
                          <td className="px-3 py-3">{row.section}</td>
                          <td className="px-3 py-3">{row.metric}</td>
                          <td className="px-3 py-3 text-right">{row.value}</td>
                          <td className="px-3 py-3">{row.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm font-medium">Snapshot Summary</div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <InfoBox label="Report Name" value={report.name} />
                  <InfoBox label="Code" value={report.code} />
                  <InfoBox label="Report Date" value={selectedDate} />
                  <InfoBox
                    label="Revision"
                    value={
                      typeof snapshot?.snapshotRevisionNo === "number"
                        ? String(snapshot.snapshotRevisionNo)
                        : "0"
                    }
                  />
                  <InfoBox
                    label="Document Number"
                    value={snapshot?.documentNumber ?? "—"}
                  />
                  <InfoBox
                    label="Status"
                    value={currentDayStatus?.status ?? "DRAFT"}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {mainTab === "history" && (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div>
            <div className="text-xl font-semibold">Report History</div>
            <div className="mt-1 text-sm text-white/60">
              Chronological history for workforce snapshots and approvals.
            </div>
          </div>

          <form
            method="GET"
            action="/gen/esg/workforce"
            className="rounded-xl border border-white/10 bg-black/20 p-4"
          >
            <input type="hidden" name="tab" value="history" />
            <input type="hidden" name="date" value={selectedDate} />
            {selectedRevisionValue ? (
              <input type="hidden" name="rev" value={selectedRevisionValue} />
            ) : null}

            <div className="grid gap-3 lg:grid-cols-[1.4fr_0.9fr_auto_auto]">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wide text-white/45">
                  Search
                </div>
                <input
                  type="text"
                  name="hq"
                  defaultValue={String(sp?.hq ?? "")}
                  placeholder="Search status, document no, actor..."
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
                  href={`/gen/esg/workforce?tab=history&date=${selectedDate}${
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
            <table className="w-full min-w-[1200px] text-sm">
              <thead>
                <tr className="bg-slate-950 text-white">
                  <th className="px-3 py-3 text-left">Report Date</th>
                  <th className="px-3 py-3 text-left">Report Title</th>
                  <th className="px-3 py-3 text-left">Code</th>
                  <th className="px-3 py-3 text-left">Document Number</th>
                  <th className="px-3 py-3 text-left">Revision</th>
                  <th className="px-3 py-3 text-left">Current Status</th>
                  <th className="px-3 py-3 text-left">Acted By</th>
                  <th className="px-3 py-3 text-left">Action Date</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.length > 0 ? (
                  historyRows.map((row) => (
                    <tr
                      key={row.id}
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
                          {row.code}
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
                          {row.actedBy}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <Link href={row.openHref} className="block h-full w-full">
                          {formatDateTime(row.actionDate)}
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-b border-white/10 bg-white/5">
                    <td
                      colSpan={8}
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

function DashboardCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3">
      <div className="text-[11px] uppercase tracking-wide text-white/45">
        {label}
      </div>
      <div className="mt-1 text-sm text-white/85">{value}</div>
    </div>
  );
}

function KpiGrid({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-4"
        >
          <div className="text-[11px] uppercase tracking-wide text-white/45">
            {item.label}
          </div>
          <div className="mt-2 text-2xl font-semibold text-white/90">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniBarChart({
  title,
  points,
}: {
  title: string;
  points: Array<{ label: string; value: number }>;
}) {
  if (!points.length || points.every((p) => p.value === 0)) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-white/40">
        No chart data available.
      </div>
    );
  }

  const maxValue = Math.max(...points.map((p) => p.value), 1);

  return (
    <div className="space-y-4">
      <div className="text-center text-sm text-white/70">{title}</div>

      <div className="flex h-56 items-end gap-3">
        {points.map((p, idx) => {
          const height = Math.max((p.value / maxValue) * 170, 8);

          return (
            <div
              key={`${p.label}_${idx}`}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <div className="text-[11px] text-white/55">{p.value}</div>
              <div
                className="w-full max-w-[72px] rounded-t-md bg-blue-400/70"
                style={{ height: `${height}px` }}
                title={`${p.label}: ${p.value}`}
              />
              <div className="text-center text-[11px] leading-tight text-white/45">
                {p.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
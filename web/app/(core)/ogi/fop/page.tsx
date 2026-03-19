import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import PowerBIEmbed from "@/components/PowerBIEmbed";
import { powerBIReports } from "@/lib/powerbi-reports";
import ReportView from "@/components/ReportView";
import { FOP_REPORT_META } from "@/lib/fop-report-meta";
import SendReportDialog from "@/components/fop/SendReportDialog";
import ReportAndDateFilters from "@/components/fop/ReportAndDateFilters";
import InsertGenerateButton from "@/components/fop/InsertGenerateButton";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  tab?: string;
  rightTab?: string;
  report?: string;
  date?: string;
  _ts?: string;
}>;

function todayYmd() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toDateOnly(value: string) {
  return new Date(`${value}T00:00:00`);
}

export default async function FieldOperationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const sp = await searchParams;

  const previewTs = String(sp?._ts ?? "");

  const mainTab = String(sp?.tab ?? "data-entry").toLowerCase();
  const rightTab = String(sp?.rightTab ?? "charts").toLowerCase();
  const selectedReportCode = String(sp?.report ?? "").toUpperCase();
  const selectedDate = String(sp?.date ?? todayYmd());

  const moduleItem = await db.module.findFirst({
    where: {
      routePath: "/ogi/fop",
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      code: true,
    },
  });

  if (!moduleItem) notFound();

  const reportGroup = await db.reportGroup.findFirst({
  where: {
    moduleId: moduleItem.id,
    isActive: true,
  },
  orderBy: [{ sortOrder: "asc" }],
  select: {
    id: true,
    code: true,
    name: true,
  },
});

  if (!reportGroup) notFound();

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

  const mainTabs = [
    { key: "data-entry", label: "Data Entry" },
    { key: "calculations", label: "Calculations" },
    { key: "review-package", label: "Review Package" },
    { key: "dashboards", label: "Dashboards" },
    { key: "report-view", label: "Report View" },
  ];

  const rightTabs = [
    { key: "charts", label: "Charts" },
    { key: "report", label: "Report" },
    { key: "reports-in-process", label: "Reports In Process" },
    { key: "report-event-history", label: "Report Event History" },
  ];

  const dataEntryReports = await db.reportDefinition.findMany({
    where: {
      isActive: true,
      reportGroupId: reportGroup.id,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      sortOrder: true,
      reportGroupId: true,
    },
  });

  const activeDataEntryReport =
    dataEntryReports.find((r) => r.code === selectedReportCode) ??
    dataEntryReports[0] ??
    null;

  const approvedReports = tenant
    ? await db.reportDayStatus.findMany({
        where: {
          tenantId: tenant.id,
          day: toDateOnly(selectedDate),
          status: "APPROVED",
          ReportDefinition: {
            reportGroupId: reportGroup.id,
          },
        },
        orderBy: [
          { ReportDefinition: { sortOrder: "asc" } },
          { ReportDefinition: { name: "asc" } },
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
          ReportDefinition: {
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
      })
    : [];

  const activeApprovedReport =
    approvedReports.find((r) => r.ReportDefinition.code === selectedReportCode) ??
    approvedReports[0] ??
    null;

  const reportRows = dataEntryReports.map((r, idx) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    documentNumber: "—",
    revisionNo: "0",
    responsiblePerson: "—",
    validator: "—",
    accountant: "—",
    status: "DRAFT",
    blocked: false,
    sortOrder: r.sortOrder ?? idx + 1,
  }));

  const activeReport =
    reportRows.find((r) => r.code === (activeDataEntryReport?.code ?? "")) ??
    reportRows[0] ??
    null;

  const manualData = [
    {
      tagNo: "MLT-2204-A",
      description: "WATER LEVEL IN TANK T-2200",
      value: "0.000",
      unit: "cm",
    },
    {
      tagNo: "MLT-2224-A",
      description: "WATER LEVEL IN TANK T-2220",
      value: "0.000",
      unit: "cm",
    },
    {
      tagNo: "MLT-32244-A",
      description: "WATER LEVEL IN TANK T-32240",
      value: "0.000",
      unit: "cm",
    },
    {
      tagNo: "MDI-OIL@15",
      description: "OIL DENSITY",
      value: "826.230",
      unit: "kg/m3",
    },
  ];

  const scadaData = [
    {
      tagNo: "LIT2204_QV",
      description: "CRUDE OIL LEVEL IN TANK T-2200",
      value: "215.098",
      unit: "cm",
    },
    {
      tagNo: "LIT2224_QV",
      description: "CRUDE OIL LEVEL IN TANK T-2220",
      value: "851.000",
      unit: "cm",
    },
    {
      tagNo: "LIT32247_QV",
      description: "CRUDE OIL LEVEL IN TANK T-32240",
      value: "630.201",
      unit: "cm",
    },
    {
      tagNo: "FOIT-5505",
      description: "TOTAL CRUDE OIL FLOW FROM MOTS",
      value: "0.000",
      unit: "t",
    },
  ];

  const calculatedData = [
    {
      tagNo: "CLT-2204-1",
      description: "CRUDE OIL LEVEL IN TANK T-2200 (CORRECTED WITH WATER LEVEL)",
      value: "215.10",
      unit: "cm",
    },
    {
      tagNo: "CQD-2204",
      description: "TOTAL CRUDE OIL DIFFERENCE IN TANK T-2200 DAILY",
      value: "(21.63)",
      unit: "t",
    },
    {
      tagNo: "CLT-2224-1",
      description: "CRUDE OIL LEVEL IN TANK T-2220 (CORRECTED WITH WATER LEVEL)",
      value: "851.00",
      unit: "cm",
    },
    {
      tagNo: "CQD-2224",
      description: "TOTAL CRUDE OIL DIFFERENCE IN TANK T-2220 DAILY",
      value: "276.52",
      unit: "t",
    },
    {
      tagNo: "CQD-2000",
      description: "TOTAL CRUDE OIL DIFFERENCE IN ALL TANKS DAILY",
      value: "817.93",
      unit: "t",
    },
    {
      tagNo: "CQD-2000-1",
      description: "CRUDE OIL PRODUCTION DAILY",
      value: "271.475",
      unit: "t",
    },
  ];

  const eventHistory = [
    {
      eventDate: "1/2/2026 3:03 AM",
      stage: "SUBMITTED FOR VALIDATION",
      sentFrom: "Radoslava Jovancevic",
      sentTo: "Askar Yakupov",
      comment: "",
    },
  ];

  const summary = {
    total: reportRows.length,
    completed: approvedReports.length,
    inProgress: 1,
    waiting: 2,
    blocked: 0,
    rejected: 0,
  };

  const activePreviewCode =
  activeDataEntryReport?.code ??
  activeApprovedReport?.ReportDefinition.code ??
  "DOR";

const activePreviewMeta =
  FOP_REPORT_META[activePreviewCode as keyof typeof FOP_REPORT_META] ??
  FOP_REPORT_META.DOR;

const activePreviewPdfSrc = `/api/fop/pdf/${activePreviewCode}_${selectedDate}.pdf${previewTs ? `?ts=${previewTs}` : ""}`;

  const baseQuery = `report=${
    activeDataEntryReport?.code ?? activeApprovedReport?.ReportDefinition.code ?? ""
  }&date=${selectedDate}`;

  return (
    <div className="p-4 space-y-4 min-h-full overflow-y-auto">
      <div className="text-sm text-white/50">
        <Link href="/ogi/fop" className="hover:text-white/80 transition">
          Field Operations
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white/80">FOP Entry Form</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {mainTabs.map((t) => {
          const isActive = mainTab === t.key;
          return (
            <Link
              key={t.key}
              href={`/ogi/fop?tab=${t.key}&${baseQuery}`}
              className={[
                "rounded-lg border px-4 py-2 text-sm transition",
                isActive
                  ? "bg-white/15 border-white/20"
                  : "bg-white/[0.04] border-white/10 hover:bg-white/10",
              ].join(" ")}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {mainTab === "data-entry" && (
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-6 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-3xl font-bold">
                Welcome,
                <span className="text-white/70">{user.name ? ` ${user.name}` : ""}</span>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
  <ReportAndDateFilters
    reports={dataEntryReports.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
    }))}
    selectedReportCode={activeDataEntryReport?.code ?? ""}
    selectedDate={selectedDate}
    mainTab={mainTab}
    rightTab={rightTab}
  />
</div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-center">
                  <div className="text-xs uppercase tracking-wide text-white/45">
                    Submitted Reports
                  </div>
                  <div className="mt-2 text-4xl font-semibold">0</div>
                  <div className="mt-1 text-sm text-white/60">Waiting for Validation</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-center">
                  <div className="text-xs uppercase tracking-wide text-white/45">
                    Rejected Reports
                  </div>
                  <div className="mt-2 text-4xl font-semibold">0</div>
                  <div className="mt-1 text-sm text-white/60">Rejected Reports</div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="grid gap-3 md:grid-cols-[1fr_auto] items-end">
                  <div>
                    <div className="text-sm font-medium">Select Validator</div>
                    <select className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm">
                      <option>Oleg Dedeiko</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <InsertGenerateButton
  reportCode={activePreviewCode}
  reportDate={selectedDate}
/>
                    <button className="rounded-md border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-300 hover:bg-blue-500/15 transition">
                      Submit
                    </button>
                  </div>
                </div>

                <div className="mt-2 text-xs text-white/45">
                  You cannot modify report that is already sent for approval.
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-5">
              <div>
                <div className="text-sm font-semibold uppercase tracking-wide text-white/50">
                  Reports
                </div>
                <div className="mt-1 text-sm text-white/45">Please, select report:</div>

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
                      {activeReport && (
                        <tr className="border-b border-white/10 bg-white/5">
                          <td className="px-3 py-3">{activeReport.name}</td>
                          <td className="px-3 py-3">{activeReport.documentNumber}</td>
                          <td className="px-3 py-3">{activeReport.revisionNo}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <DataSection
                title="Manual Data Entry"
                note="Double click on the highlighted cell to insert data:"
              >
                <SimpleTable rows={manualData} />
              </DataSection>

              <DataSection
                title="SCADA Reading"
                note="Double click on the highlighted cell to correct value:"
              >
                <SimpleTable rows={scadaData} />
              </DataSection>
            </div>
          </div>

          <div className="xl:col-span-6 rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
            <div className="flex flex-wrap border-b border-white/10 bg-slate-950">
              {rightTabs.map((t) => {
                const isActive = rightTab === t.key;
                return (
                  <Link
                    key={t.key}
                    href={`/ogi/fop?tab=data-entry&rightTab=${t.key}&${baseQuery}`}
                    className={[
                      "px-5 py-4 text-sm transition border-b-2",
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

            <div className="p-4 min-h-[900px]">
              {rightTab === "charts" && (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <button className="rounded-full bg-white/10 px-4 py-3 text-sm font-semibold">
                      Inputs
                    </button>
                    <button className="rounded-full bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/80">
                      Outputs
                    </button>
                  </div>

                  <div>
                    <div className="text-sm font-medium">Measurement Points:</div>
                    <select className="mt-2 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm">
                      <option>CRUDE OIL LEVEL IN TANK T-2200</option>
                    </select>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="text-sm font-medium">Bar Chart</div>
                    <div className="mt-3 h-72 rounded-lg border border-white/10 bg-black/20 flex items-center justify-center text-sm text-white/40">
                      PARAMETER BAR CHART PLACEHOLDER
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="text-sm font-medium">Trend Chart</div>
                    <div className="mt-3 h-72 rounded-lg border border-white/10 bg-black/20 flex items-center justify-center text-sm text-white/40">
                      PARAMETER TREND CHART PLACEHOLDER
                    </div>
                  </div>
                </div>
              )}

              {rightTab === "report" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-white/90">
                      PDF Output Preview
                    </div>

                    <SendReportDialog
  reportCode={activePreviewCode}
  reportTitle={activePreviewMeta.title}
  reportDate={selectedDate}
  pdfUrl={activePreviewPdfSrc}
/>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                   <ReportView
  pdfSrc={activePreviewPdfSrc}
  title={activePreviewMeta.title}
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
                        <th className="px-3 py-3 text-left">Accountable Person</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportRows.map((r) => {
                        const highlight = r.code === activeReport?.code;
                        return (
                          <tr
                            key={r.id}
                            className={[
                              "border-b border-white/10",
                              highlight ? "bg-red-500/20 text-red-300 font-semibold" : "bg-white/5",
                            ].join(" ")}
                          >
                            <td className="px-3 py-3">{selectedDate}</td>
                            <td className="px-3 py-3">{r.name}</td>
                            <td className="px-3 py-3">{r.status.toLowerCase()}</td>
                            <td className="px-3 py-3">{r.responsiblePerson}</td>
                            <td className="px-3 py-3">{r.validator}</td>
                            <td className="px-3 py-3">{r.accountant}</td>
                          </tr>
                        );
                      })}
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
                        <tr key={idx} className="border-b border-white/10 bg-white/5">
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

      {mainTab === "calculations" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-5">
          <div>
            <div className="text-xl font-semibold">Calculations</div>
            <div className="mt-1 text-sm text-white/60">
              Derived values, transfers between reports, and operational calculation logic.
            </div>
          </div>

          <DataSection
            title="Calculated Values"
            note="Preview of calculated operational values for the selected report:"
          >
            <SimpleTable rows={calculatedData} />
          </DataSection>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
            This tab will later include dependency logic, hierarchy checks, and transfer between preceding documents.
          </div>
        </div>
      )}

      {mainTab === "review-package" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-5">
          <div>
            <div className="text-xl font-semibold">Review Package</div>
            <div className="mt-1 text-sm text-white/60">
              Consolidated package for the current daily report group and selected report date.
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Total Reports" value={String(summary.total)} />
            <SummaryCard label="In Progress" value={String(summary.inProgress)} />
            <SummaryCard label="Waiting" value={String(summary.waiting)} />
            <SummaryCard label="Blocked" value={String(summary.blocked)} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="bg-slate-950 text-white">
                  <th className="px-3 py-3 text-left">Report Name</th>
                  <th className="px-3 py-3 text-left">Code</th>
                  <th className="px-3 py-3 text-left">Document Number</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-3 py-3 text-left">Responsible Person</th>
                  <th className="px-3 py-3 text-left">Validator</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.map((r) => (
                  <tr key={r.id} className="border-b border-white/10 bg-white/5">
                    <td className="px-3 py-3">{r.name}</td>
                    <td className="px-3 py-3">{r.code}</td>
                    <td className="px-3 py-3">{r.documentNumber}</td>
                    <td className="px-3 py-3">{r.status}</td>
                    <td className="px-3 py-3">{r.responsiblePerson}</td>
                    <td className="px-3 py-3">{r.validator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <button className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm hover:bg-white/10 transition">
              Generate Review Package
            </button>
            <button className="rounded-md border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-sm text-blue-300 hover:bg-blue-500/15 transition">
              Export Snapshot
            </button>
          </div>
        </div>
      )}

      {mainTab === "dashboards" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
          <div>
            <div className="text-xl font-semibold">Dashboards</div>
            <div className="mt-1 text-sm text-white/60">
              Full module-level Power BI operational dashboard for Field Operations.
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="font-medium">Power BI Dashboard</div>
            <div className="mt-3 text-sm text-white/60">
              This is the full Field Operations dashboard, including consolidated visuals, KPI views and maps.
            </div>

            <div className="mt-4">
              <PowerBIEmbed
                title={powerBIReports.fieldOperations.title}
                reportUrl={powerBIReports.fieldOperations.url}
              />
            </div>
          </div>
        </div>
      )}

      {mainTab === "report-view" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[260px]">
              <div className="text-[11px] uppercase tracking-wide text-white/45">
                Select Report
              </div>
              <select
                className="mt-1 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm"
                defaultValue={activeApprovedReport?.ReportDefinition.code ?? ""}
              >
                {approvedReports.map((r) => (
                  <option key={r.id} value={r.ReportDefinition.code}>
                    {r.ReportDefinition.code} — {r.ReportDefinition.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[180px]">
              <div className="text-[11px] uppercase tracking-wide text-white/45">
                Report Date
              </div>
              <input
                type="date"
                defaultValue={selectedDate}
                className="mt-1 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm"
              />
            </div>

            <div className="min-w-[180px]">
              <div className="text-[11px] uppercase tracking-wide text-white/45">
                Status
              </div>
              <div className="mt-1 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-emerald-300">
                {activeApprovedReport?.status ?? "—"}
              </div>
            </div>

            <div className="flex gap-2 ml-auto">
              <button className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm hover:bg-white/10 transition">
                Generate PDF
              </button>
              <button className="rounded-md border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-sm text-blue-300 hover:bg-blue-500/15 transition">
                Download PDF
              </button>
            </div>
          </div>

          {approvedReports.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
              No approved reports available for the selected date.
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="mb-3 text-sm font-medium">PDF Output Preview</div>
              <ReportView
  pdfSrc={activePreviewPdfSrc}
  title={activePreviewMeta.title}
  reportDate={selectedDate}
/>
            </div>
          )}
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
          {rows.map((r, idx) => (
            <tr key={idx} className="border-b border-white/10 bg-white/5">
              <td className="px-3 py-3">{r.tagNo}</td>
              <td className="px-3 py-3">{r.description}</td>
              <td className="px-3 py-3 text-right">{r.value}</td>
              <td className="px-3 py-3">{r.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="text-xs uppercase tracking-wide text-white/45">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  tab?: string;
}>;

function normalizeCode(value: string) {
  return String(value || "").trim().toUpperCase();
}

function todayYmd() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default async function ESGReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ reportCode: string }>;
  searchParams: SearchParams;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { reportCode } = await params;
  const sp = await searchParams;

  const activeTab = String(sp?.tab ?? "data-entry").toLowerCase();

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
      code: normalizeCode(reportCode),
      isActive: true,
      ReportGroup: {
        is: {
          moduleId: moduleItem.id,
        },
      },
    },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      sortOrder: true,
      ReportGroup: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  });

  if (!report) notFound();

  const tabs = [
    { key: "data-entry", label: "Data Entry" },
    { key: "calculations", label: "Calculations" },
    { key: "report-view", label: "Report View" },
  ];

  const tab = tabs.find((t) => t.key === activeTab)?.key ?? "data-entry";
  const currentDay = todayYmd();

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-white/50">
        <Link href="/gen/esg" className="hover:text-white/80 transition">
          ESG Reports
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white/80">{report.name}</span>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-3xl font-bold">{report.name}</div>
            <div className="mt-1 text-sm text-white/60">
              {report.description || "Report Workspace"}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/55">
              <div className="rounded-md border border-white/10 bg-black/20 px-3 py-1">
                Module: {moduleItem.name}
              </div>
              <div className="rounded-md border border-white/10 bg-black/20 px-3 py-1">
                Group: {report.ReportGroup.name}
              </div>
              <div className="rounded-md border border-white/10 bg-black/20 px-3 py-1">
                Code: {report.code}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href="/gen/esg"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm hover:bg-white/10 transition"
            >
              Back To Reports
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <Link
              key={t.key}
              href={`/gen/esg/${report.code.toLowerCase()}?tab=${t.key}`}
              className={[
                "rounded-lg border px-4 py-2 text-sm transition",
                active
                  ? "bg-white/15 border-white/20"
                  : "bg-white/[0.04] border-white/10 hover:bg-white/10",
              ].join(" ")}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* Workspace */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 min-h-[520px]">
        {tab === "data-entry" && (
          <div className="space-y-5">
            {/* Section header */}
            <div>
              <div className="text-xl font-semibold">Data Entry</div>
              <div className="mt-1 text-sm text-white/60">
                Enter, Review, And Validate Input Data For This Report
              </div>
            </div>

            {/* Top control bar */}
            <div className="grid gap-3 xl:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-wide text-white/45">
                  Reporting Day
                </div>
                <input
                  type="date"
                  defaultValue={currentDay}
                  className="mt-2 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm"
                />
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-wide text-white/45">
                  Methodology
                </div>
                <select className="mt-2 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm">
                  <option>Default Methodology</option>
                </select>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-wide text-white/45">
                  Status
                </div>
                <div className="mt-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                  Draft
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-4 flex items-end">
                <button className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition">
                  Save Inputs
                </button>
              </div>
            </div>

            {/* Main split layout */}
            <div className="grid gap-5 xl:grid-cols-12">
              {/* LEFT */}
              <div className="xl:col-span-7 space-y-5">
                {/* Report info */}
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold">Report Context</div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-white/45">
                        Report
                      </div>
                      <div className="mt-1 text-sm">{report.name}</div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-white/45">
                        Group
                      </div>
                      <div className="mt-1 text-sm">{report.ReportGroup.name}</div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-white/45">
                        Report Code
                      </div>
                      <div className="mt-1 text-sm">{report.code}</div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-white/45">
                        Workspace Type
                      </div>
                      <div className="mt-1 text-sm">Daily / Periodic Input Entry</div>
                    </div>
                  </div>
                </div>

                {/* Inputs */}
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Input Fields</div>
                      <div className="mt-1 text-xs text-white/50">
                        Primary Inputs, Manual Overrides, And Supporting Values
                      </div>
                    </div>

                    <button className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs hover:bg-white/10 transition">
                      Add Line
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-xs uppercase tracking-wide text-white/45">
                          Facility
                        </label>
                        <select className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm">
                          <option>Select Facility</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs uppercase tracking-wide text-white/45">
                          Asset / Equipment
                        </label>
                        <select className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm">
                          <option>Select Asset</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <label className="text-xs uppercase tracking-wide text-white/45">
                          Parameter
                        </label>
                        <select className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm">
                          <option>Select Parameter</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs uppercase tracking-wide text-white/45">
                          Value
                        </label>
                        <input
                          type="number"
                          placeholder="0.00"
                          className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs uppercase tracking-wide text-white/45">
                          Unit
                        </label>
                        <select className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm">
                          <option>Select Unit</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs uppercase tracking-wide text-white/45">
                        Note / Comment
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Enter Note..."
                        className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT */}
              <div className="xl:col-span-5 space-y-5">
                {/* Saved values */}
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold">Saved Values</div>
                  <div className="mt-1 text-xs text-white/50">
                    Existing Records For The Selected Day / Period
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-white/45">
                        Status
                      </div>
                      <div className="mt-1 text-sm text-white/70">
                        No Values Loaded Yet
                      </div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-white/45">
                        Last Update
                      </div>
                      <div className="mt-1 text-sm text-white/70">—</div>
                    </div>
                  </div>
                </div>

                {/* Validation */}
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold">Validation</div>
                  <div className="mt-3 space-y-2 text-sm text-white/65">
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                      Required Fields Must Be Completed
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                      Units Must Match Allowed Configuration
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                      Duplicate Entries Should Be Avoided
                    </div>
                  </div>
                </div>

                {/* Workflow */}
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold">Workflow</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm hover:bg-white/10 transition">
                      Save Draft
                    </button>
                    <button className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-300 hover:bg-amber-500/15 transition">
                      Submit
                    </button>
                    <button className="rounded-md border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-sm text-blue-300 hover:bg-blue-500/15 transition">
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "calculations" && (
          <div className="space-y-4">
            <div>
              <div className="text-xl font-semibold">Calculations</div>
              <div className="mt-1 text-sm text-white/60">
                Review Derived Values, Formula Outputs, And Calculation Logic
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="font-medium">Calculation Engine</div>
              <div className="mt-3 text-sm text-white/60">
                This Area Will Show Formula Results, Intermediate Values, And
                Traceability For The Selected Report.
              </div>
            </div>
          </div>
        )}

        {tab === "report-view" && (
          <div className="space-y-4">
            <div>
              <div className="text-xl font-semibold">Report View</div>
              <div className="mt-1 text-sm text-white/60">
                Final Presentation Layer For Review, Export, And Client Output
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="font-medium">Final Report Output</div>
              <div className="mt-3 text-sm text-white/60">
                This Area Will Display The Final Report Layout, KPI Summary,
                Tables, And Export-Ready Content.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
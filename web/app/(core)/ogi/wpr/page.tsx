import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { powerBIReports } from "@/lib/powerbi-reports";
import PowerBIEmbed from "@/components/PowerBIEmbed";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  tab?: string;
}>;

function todayYmd() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default async function WellProductionPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const sp = await searchParams;
  const activeTab = String(sp?.tab ?? "data-entry").toLowerCase();

  const moduleItem = await db.module.findFirst({
    where: {
      routePath: "/ogi/wpr",
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

  const tabs = [
    { key: "data-entry", label: "Data Entry" },
    { key: "production-log", label: "Production Log" },
    { key: "review-package", label: "Review Package" },
    { key: "dashboards", label: "Dashboards" },
    { key: "report-view", label: "Report View" },
  ];

  const tab = tabs.find((t) => t.key === activeTab)?.key ?? "data-entry";
  const currentDay = todayYmd();

  return (
    <div className="p-6 space-y-6 min-h-full overflow-y-auto">
      <div className="text-sm text-white/50">
        <Link href="/ogi/wpr" className="hover:text-white/80 transition">
          Well Production
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white/80">Well Production Report</span>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-3xl font-bold">Well Production</div>
            <div className="mt-1 text-sm text-white/60">
              Daily well production workspace for production entry, volume
              tracking, review package preparation, dashboards, and final
              report view.
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/55">
              <div className="rounded-md border border-white/10 bg-black/20 px-3 py-1">
                Module: {moduleItem.name}
              </div>
              <div className="rounded-md border border-white/10 bg-black/20 px-3 py-1">
                Tenant: {tenant?.name ?? "—"}
              </div>
              <div className="rounded-md border border-white/10 bg-black/20 px-3 py-1">
                Role: {membership?.role ?? "—"}
              </div>
              <div className="rounded-md border border-white/10 bg-black/20 px-3 py-1">
                User: {user.name ?? user.email ?? "—"}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href="/ogi/wpr"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm hover:bg-white/10 transition"
            >
              Back To Module
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <Link
              key={t.key}
              href={`/ogi/wpr?tab=${t.key}`}
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

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 min-h-[520px]">
        {tab === "data-entry" && (
          <div className="space-y-5">
            <div>
              <div className="text-xl font-semibold">Data Entry</div>
              <div className="mt-1 text-sm text-white/60">
                Enter daily well production inputs, production volumes, pressure
                values, uptime, and remarks.
              </div>
            </div>

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
                  Shift
                </div>
                <select className="mt-2 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm">
                  <option>DAY</option>
                  <option>NIGHT</option>
                  <option>FULL DAY</option>
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

            <div className="grid gap-5 xl:grid-cols-12">
              <div className="xl:col-span-7 space-y-5">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold">Production Context</div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-white/45">
                        Tenant
                      </div>
                      <div className="mt-1 text-sm">{tenant?.name ?? "—"}</div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-white/45">
                        Tenant Code
                      </div>
                      <div className="mt-1 text-sm">{tenant?.code ?? "—"}</div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-white/45">
                        Supervisor / Preparer
                      </div>
                      <div className="mt-1 text-sm">{user.name ?? "—"}</div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-white/45">
                        Workspace Type
                      </div>
                      <div className="mt-1 text-sm">Daily Well Production</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Production Inputs</div>
                      <div className="mt-1 text-xs text-white/50">
                        Record well, choke, pressure, production rates, uptime,
                        and operational remarks.
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
                          Field / Pad
                        </label>
                        <select className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm">
                          <option>Select Field / Pad</option>
                          <option>North Pad</option>
                          <option>South Pad</option>
                          <option>Central Pad</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs uppercase tracking-wide text-white/45">
                          Well
                        </label>
                        <select className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm">
                          <option>Select Well</option>
                          <option>Well-01</option>
                          <option>Well-02</option>
                          <option>Well-03</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <label className="text-xs uppercase tracking-wide text-white/45">
                          Choke Size
                        </label>
                        <input
                          type="text"
                          placeholder='e.g. 24/64"'
                          className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs uppercase tracking-wide text-white/45">
                          Tubing Pressure
                        </label>
                        <input
                          type="number"
                          placeholder="0.00"
                          className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs uppercase tracking-wide text-white/45">
                          Flowline Pressure
                        </label>
                        <input
                          type="number"
                          placeholder="0.00"
                          className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <label className="text-xs uppercase tracking-wide text-white/45">
                          Oil Rate
                        </label>
                        <input
                          type="number"
                          placeholder="BOPD"
                          className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs uppercase tracking-wide text-white/45">
                          Gas Rate
                        </label>
                        <input
                          type="number"
                          placeholder="MSCFD"
                          className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs uppercase tracking-wide text-white/45">
                          Water Rate
                        </label>
                        <input
                          type="number"
                          placeholder="BWPD"
                          className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <label className="text-xs uppercase tracking-wide text-white/45">
                          Uptime Hours
                        </label>
                        <input
                          type="number"
                          placeholder="24"
                          className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs uppercase tracking-wide text-white/45">
                          Well Status
                        </label>
                        <select className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm">
                          <option>FLOWING</option>
                          <option>SHUT-IN</option>
                          <option>TESTING</option>
                          <option>MAINTENANCE</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs uppercase tracking-wide text-white/45">
                          Test Separator
                        </label>
                        <select className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm">
                          <option>NO</option>
                          <option>YES</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs uppercase tracking-wide text-white/45">
                        Note / Comment
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Enter production note..."
                        className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="xl:col-span-5 space-y-5">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold">Draft Status</div>
                  <div className="mt-1 text-xs text-white/50">
                    Current preparation state for this well production package.
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                      <div className="text-xs uppercase tracking-wide text-white/45">
                        Current Status
                      </div>
                      <div className="mt-1 text-sm text-emerald-300">Draft</div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-white/45">
                        Last Saved
                      </div>
                      <div className="mt-1 text-sm text-white/70">—</div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-white/45">
                        Reporting Scope
                      </div>
                      <div className="mt-1 text-sm text-white/70">
                        Daily well rates, pressures, uptime, and status log
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold">Input Validation</div>
                  <div className="mt-3 space-y-2 text-sm text-white/65">
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                      Required Well And Date Fields Must Be Completed
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                      Production Rates Must Use Allowed Units
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                      Duplicate Well Entries For Same Day Should Be Avoided
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                      Review Package Must Be Prepared Before Submission
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold">Entry Actions</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm hover:bg-white/10 transition">
                      Save Draft
                    </button>
                    <button className="rounded-md border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-sm text-blue-300 hover:bg-blue-500/15 transition">
                      Prepare Review Package
                    </button>
                    <button className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm hover:bg-white/10 transition">
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "production-log" && (
          <div className="space-y-4">
            <div>
              <div className="text-xl font-semibold">Production Log</div>
              <div className="mt-1 text-sm text-white/60">
                Review daily production lines, well performance records, and
                operating history.
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="font-medium">Production Log Register</div>
              <div className="mt-3 text-sm text-white/60">
                This area should show recorded well production lines, pressure
                changes, downtime records, and operational comments for the
                selected reporting day.
              </div>
            </div>
          </div>
        )}

        {tab === "review-package" && (
          <div className="space-y-5">
            <div>
              <div className="text-xl font-semibold">Review Package</div>
              <div className="mt-1 text-sm text-white/60">
                Consolidated well production package with rate summary, well
                status, validation outcome, and approval-ready presentation.
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-12">
              <div className="xl:col-span-8 space-y-5">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold">Submission Summary</div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-white/45">
                        Report
                      </div>
                      <div className="mt-1 text-sm">Well Production Report</div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-white/45">
                        Reporting Day
                      </div>
                      <div className="mt-1 text-sm">{currentDay}</div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-white/45">
                        Review Package Status
                      </div>
                      <div className="mt-1 text-sm text-amber-300">
                        Pending Production Validation
                      </div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-white/45">
                        Submission Type
                      </div>
                      <div className="mt-1 text-sm">Production Review Package</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold">KPI Summary</div>
                  <div className="mt-3 grid gap-3 md:grid-cols-4">
                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-white/45">
                        Total Oil
                      </div>
                      <div className="mt-2 text-lg font-semibold">—</div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-white/45">
                        Total Gas
                      </div>
                      <div className="mt-2 text-lg font-semibold">—</div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-white/45">
                        Total Water
                      </div>
                      <div className="mt-2 text-lg font-semibold">—</div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-white/45">
                        Average Uptime
                      </div>
                      <div className="mt-2 text-lg font-semibold">—</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold">
                    Validation And Engineer Notes
                  </div>
                  <div className="mt-3 space-y-3">
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70">
                      Review package has not yet been validated by production
                      engineering.
                    </div>

                    <textarea
                      rows={5}
                      placeholder="Production engineer / preparer notes..."
                      className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold">Attachments And Trends</div>
                  <div className="mt-3 rounded-lg border border-dashed border-white/10 bg-black/20 p-6 text-sm text-white/50">
                    This area should present production trends, test results,
                    well notes, and export-ready review content.
                  </div>
                </div>
              </div>

              <div className="xl:col-span-4 space-y-5">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold">Submission Readiness</div>
                  <div className="mt-3 space-y-2 text-sm text-white/65">
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                      Input Data Saved
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                      Production Log Reviewed
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                      KPI Summary Reviewed
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                      Engineer Notes Completed
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold">Approval Actions</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="rounded-md border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-sm text-blue-300 hover:bg-blue-500/15 transition">
                      Generate Review Package
                    </button>
                    <button className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-300 hover:bg-amber-500/15 transition">
                      Submit For Approval
                    </button>
                    <button className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm hover:bg-white/10 transition">
                      Export Summary
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold">Approval Logic</div>
                  <div className="mt-3 text-sm text-white/60">
                    Approval should be performed on the consolidated production
                    package, including daily inputs, well logs, KPI summary,
                    and selected output views.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "dashboards" && (
          <div className="space-y-4">
            <div>
              <div className="text-xl font-semibold">Dashboards</div>
              <div className="mt-1 text-sm text-white/60">
                Interactive production dashboards for monitoring well
                performance and visual analysis.
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="font-medium">Power BI Dashboard</div>
              <div className="mt-3 text-sm text-white/60">
                This section provides the published Well Production Power BI
                dashboard.
              </div>

              <div className="mt-4">
                <PowerBIEmbed
                  title={powerBIReports.wellProduction.title}
                  reportUrl={powerBIReports.wellProduction.url}
                />
              </div>
            </div>
          </div>
        )}

        {tab === "report-view" && (
          <div className="space-y-5">
            <div>
              <div className="text-xl font-semibold">Report View</div>
              <div className="mt-1 text-sm text-white/60">
                Final well production report layout prepared for PDF generation,
                approval, and formal issue.
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-semibold">Final Report Summary</div>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="text-xs uppercase tracking-wide text-white/45">
                    Total Oil
                  </div>
                  <div className="mt-2 text-lg font-semibold">—</div>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="text-xs uppercase tracking-wide text-white/45">
                    Total Gas
                  </div>
                  <div className="mt-2 text-lg font-semibold">—</div>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="text-xs uppercase tracking-wide text-white/45">
                    Total Water
                  </div>
                  <div className="mt-2 text-lg font-semibold">—</div>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="text-xs uppercase tracking-wide text-white/45">
                    Average Uptime
                  </div>
                  <div className="mt-2 text-lg font-semibold">—</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-semibold">Report Narrative</div>
              <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                This area should contain the final structured well production
                report text, production engineer narrative, performance notes,
                rate summary, and approval-ready content for PDF export.
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-semibold">Tables And Attachments</div>
              <div className="mt-3 rounded-lg border border-dashed border-white/10 bg-black/20 p-6 text-sm text-white/50">
                Final report tables, daily production logs, supporting notes,
                and PDF-ready sections should be shown here.
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-semibold">Report Actions</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm hover:bg-white/10 transition">
                  Generate PDF
                </button>
                <button className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-500/15 transition">
                  Finalize Report
                </button>
                <button className="rounded-md border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-sm text-blue-300 hover:bg-blue-500/15 transition">
                  Export Package
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
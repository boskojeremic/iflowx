import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  group?: string;
}>;

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

function normalizeCode(value: string | undefined) {
  return String(value ?? "").trim().toUpperCase();
}

export default async function ESGHomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const ctx = await getCurrentTenantContext(session.user.email);
  if (!ctx) redirect("/login");

  const tenantId = ctx.tenantId;
  const sp = await searchParams;
  const activeGroupCode = normalizeCode(sp?.group);

  const esgModule = await db.module.findFirst({
    where: {
      routePath: "/gen/esg",
      isActive: true,
    },
    select: {
      id: true,
      code: true,
      name: true,
    },
  });

  if (!esgModule) {
    return (
      <div className="p-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            ESG Reports
          </h1>
          <p className="mt-2 text-sm text-white/60">
            ESG module is not configured.
          </p>
        </div>
      </div>
    );
  }

  const reportsRaw = await db.reportDefinition.findMany({
    where: {
     isActive: true,
      ReportGroup: {
        is: {
          moduleId: esgModule.id,
          isActive: true,
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
          sortOrder: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const groupsMap = new Map<
    string,
    {
      id: string;
      code: string;
      name: string;
      sortOrder: number;
      reports: Array<{
        id: string;
        code: string;
        name: string;
        description: string | null;
        sortOrder: number;
      }>;
    }
  >();

  for (const report of reportsRaw) {
    const group = report.ReportGroup;
    if (!group) continue;

    if (!groupsMap.has(group.id)) {
      groupsMap.set(group.id, {
        id: group.id,
        code: group.code,
        name: group.name,
        sortOrder: group.sortOrder ?? 100,
        reports: [],
      });
    }

    groupsMap.get(group.id)!.reports.push({
      id: report.id,
      code: report.code,
      name: report.name,
      description: report.description ?? null,
      sortOrder: report.sortOrder ?? 100,
    });
  }

  const allGroups = Array.from(groupsMap.values())
    .map((group) => ({
      ...group,
      reports: group.reports.sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.name.localeCompare(b.name);
      }),
    }))
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.name.localeCompare(b.name);
    });

  const filteredGroups =
    !activeGroupCode || activeGroupCode === "ALL"
      ? allGroups
      : allGroups.filter((group) => normalizeCode(group.code) === activeGroupCode);

  const totalReports = reportsRaw.length;
  const filteredReportCount = filteredGroups.reduce(
    (sum, group) => sum + group.reports.length,
    0
  );

  const tabs = [
    { key: "ALL", label: "All" },
    ...allGroups.map((group) => ({
      key: normalizeCode(group.code),
      label: `${group.name}`,
    })),
  ];

  const currentTab = !activeGroupCode ? "ALL" : activeGroupCode;

  return (
    <div className="min-h-full overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          ESG Reports
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Tenant-Level ESG Reporting Workspaces, Dashboards, Review Packages, And Report Views
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <div className="mb-4 text-[11px] uppercase tracking-[0.18em] text-white/40">
          ESG Reporting Areas
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const active = currentTab === tab.key;

            return (
              <Link
                key={tab.key}
                href={tab.key === "ALL" ? "/gen/esg" : `/gen/esg?group=${tab.key}`}
                className={[
                  "rounded-lg border px-4 py-2 text-sm transition",
                  active
                    ? "border-white/20 bg-white/15 text-white"
                    : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {filteredGroups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6">
            <div className="text-base font-medium text-white">
              No ESG Report Groups Available
            </div>
            <p className="mt-2 text-sm text-white/60">
              There are currently no active ESG report groups assigned in Master Data Admin.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredGroups.map((group) => (
              <section key={group.id} className="space-y-3">
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-semibold text-white/90">
                    {group.name} ({group.code})
                  </div>
                  <div className="text-xs text-white/50">
                    Reporting workspaces configured under this report group.
                  </div>
                </div>

                {group.reports.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-sm text-white/50">
                    No active reports in this group.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {group.reports.map((report) => (
                      <Link
                        key={report.id}
                        href={`/gen/esg/${report.code.toLowerCase()}`}
                        className="group rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-white/20 hover:bg-white/[0.05]"
                      >
                        <div className="text-base font-semibold text-white">
                          {report.name}
                        </div>

                        <div className="mt-2 text-sm text-white/65">
                          {report.description ||
                            "Open dedicated report workspace for data entry, calculations, dashboards, and report view."}
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-white/45">
                          <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1">
                            Group: {group.code}
                          </span>
                          <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1">
                            Code: {report.code}
                          </span>
                        </div>

                        <div className="mt-4 text-sm font-medium text-white/70 transition group-hover:text-white">
                          Open Workspace →
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <div className="text-sm font-semibold text-white">Current Scope</div>
        <p className="mt-2 text-sm text-white/60">
          This area is reserved for ESG reporting workspaces defined through Master Data Admin.
          Report Group names are loaded dynamically from tenant configuration.
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/50">
          <div className="rounded-md border border-white/10 bg-black/20 px-3 py-1">
            Tenant: {ctx.tenant.name}
          </div>
          <div className="rounded-md border border-white/10 bg-black/20 px-3 py-1">
            Module: {esgModule.name}
          </div>
          <div className="rounded-md border border-white/10 bg-black/20 px-3 py-1">
            Report Groups: {allGroups.length}
          </div>
          <div className="rounded-md border border-white/10 bg-black/20 px-3 py-1">
            Reports: {totalReports}
          </div>
          <div className="rounded-md border border-white/10 bg-black/20 px-3 py-1">
            Visible Reports: {filteredReportCount}
          </div>
        </div>
      </div>
    </div>
  );
}
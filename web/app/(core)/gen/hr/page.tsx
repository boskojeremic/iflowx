import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import EmployeeFilters from "@/components/hr/EmployeeFilters";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  group?: string;
}>;

export default async function HrHomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const sp = await searchParams;
  const selectedGroup = String(sp?.group ?? "ALL").toUpperCase();

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: {
      memberships: {
        where: { status: "ACTIVE" },
        orderBy: [{ createdAt: "desc" }],
        select: {
          tenantId: true,
        },
      },
    },
  });

  const tenantId = user?.memberships?.[0]?.tenantId ?? null;
  if (!tenantId) return null;

  const hrModule = await db.module.findFirst({
    where: {
      code: "HR",
      isActive: true,
    },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
    },
  });

  if (!hrModule) return null;

  const reportGroups = await db.reportGroup.findMany({
    where: {
      tenantId,
      moduleId: hrModule.id,
      isActive: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      sortOrder: true,
      reportDefinitions: {
        where: {
          tenantId,
          isActive: true,
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          sortOrder: true,
        },
      },
    },
  });

  const visibleGroups =
    selectedGroup === "ALL"
      ? reportGroups
      : reportGroups.filter((g) => g.code.toUpperCase() === selectedGroup);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          HR Reports
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Tenant-level HR reporting workspaces, workforce analytics, compliance,
          and review packages.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">
          HR Reporting Areas
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/gen/hr"
            className={[
              "rounded-lg border px-4 py-2 text-sm transition",
              selectedGroup === "ALL"
                ? "border-white/20 bg-white/15 text-white"
                : "border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/10",
            ].join(" ")}
          >
            All
          </Link>

          {reportGroups.map((group) => {
            const isActive = selectedGroup === group.code.toUpperCase();

            return (
              <Link
                key={group.id}
                href={`/gen/hr?group=${group.code}`}
                className={[
                  "rounded-lg border px-4 py-2 text-sm transition",
                  isActive
                    ? "border-white/20 bg-white/15 text-white"
                    : "border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/10",
                ].join(" ")}
              >
                {group.name.toUpperCase()}
              </Link>
            );
          })}
        </div>

        <div className="mt-6 space-y-6">
          {visibleGroups.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-white/50">
              No report groups found for HR module.
            </div>
          ) : (
            visibleGroups.map((group) => (
              <div key={group.id}>
                <div className="text-lg font-semibold text-white">
                  {group.name.toUpperCase()} ({group.code})
                </div>
                <div className="mt-1 text-sm text-white/50">
                  Reporting workspaces configured under this report group.
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {group.reportDefinitions.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/45">
                      No reports configured under this group.
                    </div>
                  ) : (
                    group.reportDefinitions.map((report) => (
                      <Link
                        key={report.id}
                        href={`/gen/hr/${report.code.toLowerCase()}`}
                        className="rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:bg-white/[0.05]"
                      >
                        <div className="text-xl font-semibold text-white">
                          {report.name.toUpperCase()}
                        </div>

                        <div className="mt-2 text-sm uppercase text-white/75">
                          {report.description || "No description available."}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-white/55">
                            Group: {group.code}
                          </span>
                          <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-white/55">
                            Code: {report.code}
                          </span>
                        </div>

                        <div className="mt-5 text-sm font-medium text-white">
                          Open Workspace →
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
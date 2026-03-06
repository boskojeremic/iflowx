import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  group?: string;
}>;

function slugify(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export default async function ESGReportsHomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const sp = await searchParams;
  const activeGroup = String(sp?.group ?? "all").toLowerCase();

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

  if (!moduleItem) {
    return (
      <div className="p-6">
        <div className="text-2xl font-bold">ESG Reports</div>
        <div className="mt-4 text-sm text-white/70">
          ESG module was not found in the database.
        </div>
      </div>
    );
  }

  const reportGroups = await db.reportGroup.findMany({
    where: {
      moduleId: moduleItem.id,
      isActive: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      sortOrder: true,
    },
  });

  const groupIds = reportGroups.map((g) => g.id);

  const reports =
    groupIds.length === 0
      ? []
      : await db.reportDefinition.findMany({
          where: {
            reportGroupId: { in: groupIds },
            isActive: true,
          },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: {
            id: true,
            reportGroupId: true,
            code: true,
            name: true,
            description: true,
            sortOrder: true,
          },
        });

  const groupsWithReports = reportGroups.map((group) => ({
    ...group,
    slug: slugify(group.code),
    reports: reports.filter((r) => r.reportGroupId === group.id),
  }));

  const visibleGroups =
    activeGroup === "all"
      ? groupsWithReports
      : groupsWithReports.filter((g) => g.slug === activeGroup);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="text-3xl font-bold">ESG Reports</div>
        <div className="mt-1 text-sm text-white/65">
          Select A Report To Enter Data, Review Inputs, And Generate Outputs
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/gen/esg"
          className={[
            "rounded-lg border px-4 py-2 text-sm transition",
            activeGroup === "all"
              ? "bg-white/15 border-white/20"
              : "bg-white/[0.04] border-white/10 hover:bg-white/10",
          ].join(" ")}
        >
          All
        </Link>

        {groupsWithReports.map((group) => (
          <Link
            key={group.id}
            href={`/gen/esg?group=${group.slug}`}
            className={[
              "rounded-lg border px-4 py-2 text-sm transition",
              activeGroup === group.slug
                ? "bg-white/15 border-white/20"
                : "bg-white/[0.04] border-white/10 hover:bg-white/10",
            ].join(" ")}
          >
            {group.name}
          </Link>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {visibleGroups.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
            No Reports Found For The Selected Group.
          </div>
        )}

        {visibleGroups.map((group) => (
          <div key={group.id} className="space-y-3">
            <div className="text-sm font-semibold uppercase tracking-wide text-white/80">
              {group.name}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.reports.map((report) => (
                <Link
                  key={report.id}
                  href={`/gen/esg/${report.code.toLowerCase()}`}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
                >
                  <div className="font-semibold">{report.name}</div>
                  <div className="mt-1 text-xs text-white/50">{report.code}</div>
                  <div className="mt-2 text-sm text-white/65">
                    {report.description || "Open Report Workspace"}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
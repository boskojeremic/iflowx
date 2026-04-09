import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import ReportMeasurementPointAssignments from "@/components/master-data/ReportMeasurementPointAssignments";
import ReportAssignmentsFilters from "@/components/master-data/ReportAssignmentsFilters";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  moduleId?: string;
  reportGroupId?: string;
  reportId?: string;
  q?: string;
}>;

async function getCurrentTenantContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const membership = await db.membership.findFirst({
    where: {
      user: { email: session.user.email },
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

export default async function ReportAssignmentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await getCurrentTenantContext();

  if (!ctx) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
        No active tenant found for current user.
      </div>
    );
  }

  const sp = await searchParams;
  const tenantId = ctx.tenantId;

  const selectedModuleId = String(sp.moduleId || "").trim();
  const selectedReportGroupId = String(sp.reportGroupId || "").trim();
  const selectedReportId = String(sp.reportId || "").trim();
  const q = String(sp.q || "").trim();

  const tenantModules = await db.tenantModule.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
    },
    select: {
      module: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
    orderBy: [{ module: { name: "asc" } }],
  });

  const modules = tenantModules.map((x) => x.module);

  const reportGroups = selectedModuleId
  ? await db.reportGroup.findMany({
      where: {
        moduleId: selectedModuleId,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })
  : [];

const reports = selectedReportGroupId
  ? await db.reportDefinition.findMany({
      where: {
        reportGroupId: selectedReportGroupId,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })
  : [];

  const allPoints = selectedReportId
    ? await db.measurementPoint.findMany({
        where: {
          tenantId,
          isActive: true,
          ...(q
            ? {
                OR: [
                  { tagNo: { contains: q, mode: "insensitive" } },
                  { descEn: { contains: q, mode: "insensitive" } },
                  { descRu: { contains: q, mode: "insensitive" } },
                  { sourceTag: { contains: q, mode: "insensitive" } },
                  {
                    mpSource: {
                      is: {
                        sourceName: { contains: q, mode: "insensitive" },
                      },
                    },
                  },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          tagNo: true,
          descEn: true,
          descRu: true,
          sourceTag: true,
          signalType: true,
          facility: {
            select: {
              name: true,
              code: true,
            },
          },
          asset: {
            select: {
              name: true,
              code: true,
            },
          },
          measurementUnit: {
            select: {
              unitTitle: true,
            },
          },
          mpSource: {
            select: {
              sourceName: true,
            },
          },
        },
        orderBy: [{ tagNo: "asc" }],
      })
    : [];

  const assigned = selectedReportId
    ? await db.reportMeasurementPoint.findMany({
        where: {
          tenantId,
          reportDefinitionId: selectedReportId,
          updEndDt: null,
        },
        select: {
          id: true,
          sortOrder: true,
          measurementPointId: true,
          measurementPoint: {
            select: {
              id: true,
              tagNo: true,
              descEn: true,
              descRu: true,
              sourceTag: true,
              signalType: true,
              facility: {
                select: {
                  name: true,
                  code: true,
                },
              },
              asset: {
                select: {
                  name: true,
                  code: true,
                },
              },
              measurementUnit: {
                select: {
                  unitTitle: true,
                },
              },
              mpSource: {
                select: {
                  sourceName: true,
                },
              },
            },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { measurementPoint: { tagNo: "asc" } }],
      })
    : [];

  const assignedIds = new Set(assigned.map((x) => x.measurementPointId));
  const available = allPoints.filter((x) => !assignedIds.has(x.id));
  const selectedReport = reports.find((r) => r.id === selectedReportId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Measurement Point Report Assignments
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Master Data Admin controls which measurement points belong to which report.
        </p>
      </div>

      <div className="flex gap-2">
        <a
          href="/master-data/measurement-points?tab=registry"
          className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/80 hover:bg-white/[0.06]"
        >
          Registry
        </a>
        <a
          href="/master-data/measurement-points/report-assignments"
          className="rounded-xl border border-blue-500/40 bg-blue-600 px-4 py-2 text-sm text-white"
        >
          Report Assignments
        </a>
      </div>

      <ReportAssignmentsFilters
        modules={modules}
        reportGroups={reportGroups}
        reports={reports}
        selectedModuleId={selectedModuleId}
        selectedReportGroupId={selectedReportGroupId}
        selectedReportId={selectedReportId}
        q={q}
      />

      {selectedReportId ? (
        <ReportMeasurementPointAssignments
          tenantId={tenantId}
          reportId={selectedReportId}
          reportName={selectedReport?.name ?? "Selected Report"}
          available={available.map((x) => ({
            id: x.id,
            tagNo: x.tagNo,
            desc: x.descEn || x.descRu || "",
            facility: x.facility ? `${x.facility.name} (${x.facility.code})` : "—",
            asset: x.asset ? `${x.asset.name} (${x.asset.code})` : "—",
            unit: x.measurementUnit?.unitTitle ?? "—",
            source: x.mpSource?.sourceName ?? "—",
          }))}
          assigned={assigned.map((x) => ({
            linkId: x.id,
            measurementPointId: x.measurementPointId,
            sortOrder: x.sortOrder ?? 100,
            tagNo: x.measurementPoint.tagNo,
            desc: x.measurementPoint.descEn || x.measurementPoint.descRu || "",
            facility: x.measurementPoint.facility
              ? `${x.measurementPoint.facility.name} (${x.measurementPoint.facility.code})`
              : "—",
            asset: x.measurementPoint.asset
              ? `${x.measurementPoint.asset.name} (${x.measurementPoint.asset.code})`
              : "—",
            unit: x.measurementPoint.measurementUnit?.unitTitle ?? "—",
            source: x.measurementPoint.mpSource?.sourceName ?? "—",
          }))}
        />
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/60">
          Select module, report group, and report to manage measurement point assignments.
        </div>
      )}
    </div>
  );
}
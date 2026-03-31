import { db } from "@/lib/db";
import { getCurrentUserReportContext } from "@/lib/report-access";
import { getReportPermissions } from "@/lib/report-permissions";

export type AccessibleReportRow = {
  id: string;
  code: string;
  name: string;
  reportGroupId: string;
  reportGroupName: string;
  moduleId: string;
  moduleName: string;
  industryName: string | null;
  responsibleFunctionId: string | null;
  approverFunctionId: string | null;
  mode: "NONE" | "RESPONSIBLE" | "APPROVER" | "OWNER";
  canView: boolean;
  canEdit: boolean;
  canSubmit: boolean;
  canApprove: boolean;
};

export async function getAccessibleReportsForUser(args: {
  userId: string;
  tenantId: string;
}): Promise<AccessibleReportRow[]> {
  const context = await getCurrentUserReportContext({
    userId: args.userId,
    tenantId: args.tenantId,
  });

  if (!context) return [];

  const reports = await db.reportDefinition.findMany({
    where: {
      isActive: true,
      ReportGroup: {
        Module: {
          tenantModules: {
            some: {
              tenantId: args.tenantId,
              status: "ACTIVE",
            },
          },
        },
      },
    },
    select: {
      id: true,
      code: true,
      name: true,
      reportGroupId: true,
      ReportGroup: {
        select: {
          id: true,
          name: true,
          Module: {
            select: {
              id: true,
              name: true,
              Industry: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
      reportFunctionAssignments: {
        where: {
          tenantId: args.tenantId,
          isActive: true,
        },
        select: {
          responsibleFunctionId: true,
          approverFunctionId: true,
        },
        take: 1,
      },
    },
    orderBy: [
      { ReportGroup: { Module: { Industry: { sortOrder: "asc" } } } },
      { ReportGroup: { Module: { name: "asc" } } },
      { ReportGroup: { name: "asc" } },
      { sortOrder: "asc" },
      { name: "asc" },
    ],
  });

  const result: AccessibleReportRow[] = [];

  for (const r of reports) {
    const assignment = r.reportFunctionAssignments[0] ?? null;

    const permissions = getReportPermissions({
      accessRole: context.accessRole,
      operationalFunctionId: context.operationalFunctionId,
      responsibleFunctionId: assignment?.responsibleFunctionId ?? null,
      approverFunctionId: assignment?.approverFunctionId ?? null,
    });

    if (!permissions.canView) continue;

    result.push({
      id: r.id,
      code: r.code,
      name: r.name,
      reportGroupId: r.ReportGroup.id,
      reportGroupName: r.ReportGroup.name,
      moduleId: r.ReportGroup.Module.id,
      moduleName: r.ReportGroup.Module.name,
      industryName: r.ReportGroup.Module.Industry?.name ?? null,
      responsibleFunctionId: assignment?.responsibleFunctionId ?? null,
      approverFunctionId: assignment?.approverFunctionId ?? null,
      mode: permissions.mode,
      canView: permissions.canView,
      canEdit: permissions.canEdit,
      canSubmit: permissions.canSubmit,
      canApprove: permissions.canApprove,
    });
  }

  return result;
}
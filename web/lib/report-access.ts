import { db } from "@/lib/db";
import { getReportPermissions, type AccessRole, type ReportPermissions } from "@/lib/report-permissions";

export type CurrentUserReportContext = {
  userId: string;
  tenantId: string;
  accessRole: AccessRole;
  operationalFunctionId: string | null;
};

export type ReportFunctionAssignment = {
  reportId: string;
  responsibleFunctionId: string | null;
  approverFunctionId: string | null;
};

export async function getCurrentUserReportContext(args: {
  userId: string;
  tenantId: string;
}): Promise<CurrentUserReportContext | null> {
  const membership = await db.membership.findFirst({
    where: {
      userId: args.userId,
      tenantId: args.tenantId,
      status: "ACTIVE",
    },
    select: {
      userId: true,
      tenantId: true,
      role: true,
      operationalFunctionId: true,
    },
  });

  if (!membership) return null;

  return {
    userId: membership.userId,
    tenantId: membership.tenantId,
    accessRole: membership.role as AccessRole,
    operationalFunctionId: membership.operationalFunctionId ?? null,
  };
}

export async function getReportFunctionAssignment(args: {
  tenantId: string;
  reportId: string;
}): Promise<ReportFunctionAssignment | null> {
  const assignment = await db.tenantReportFunctionAssignment.findFirst({
    where: {
      tenantId: args.tenantId,
      reportId: args.reportId,
      isActive: true,
    },
    select: {
      reportId: true,
      responsibleFunctionId: true,
      approverFunctionId: true,
    },
  });

  if (!assignment) {
    return {
      reportId: args.reportId,
      responsibleFunctionId: null,
      approverFunctionId: null,
    };
  }

  return assignment;
}

export async function getUserReportPermissions(args: {
  userId: string;
  tenantId: string;
  reportId: string;
}): Promise<ReportPermissions | null> {
  const context = await getCurrentUserReportContext({
    userId: args.userId,
    tenantId: args.tenantId,
  });

  if (!context) return null;

  const assignment = await getReportFunctionAssignment({
    tenantId: args.tenantId,
    reportId: args.reportId,
  });

  return getReportPermissions({
    accessRole: context.accessRole,
    operationalFunctionId: context.operationalFunctionId,
    responsibleFunctionId: assignment?.responsibleFunctionId ?? null,
    approverFunctionId: assignment?.approverFunctionId ?? null,
  });
}
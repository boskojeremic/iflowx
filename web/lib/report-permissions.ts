export type AccessRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

export type ReportAccessMode =
  | "NONE"
  | "RESPONSIBLE"
  | "APPROVER"
  | "OWNER";

export type ReportPermissions = {
  canView: boolean;
  canEdit: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  canMasterData: boolean;
  canSeeAllTenantReports: boolean;
  mode: ReportAccessMode;
};

export function canSeeMasterDataAdmin(accessRole: AccessRole): boolean {
  return accessRole === "OWNER";
}

export function canManageTenantAdmin(accessRole: AccessRole): boolean {
  return accessRole === "OWNER" || accessRole === "ADMIN";
}

export function getReportPermissions(args: {
  accessRole: AccessRole;
  operationalFunctionId?: string | null;
  responsibleFunctionId?: string | null;
  approverFunctionId?: string | null;
}): ReportPermissions {
  const {
    accessRole,
    operationalFunctionId,
    responsibleFunctionId,
    approverFunctionId,
  } = args;

  const isResponsible =
    !!operationalFunctionId &&
    !!responsibleFunctionId &&
    operationalFunctionId === responsibleFunctionId;

  const isApprover =
    !!operationalFunctionId &&
    !!approverFunctionId &&
    operationalFunctionId === approverFunctionId;

  const isOwner = accessRole === "OWNER";
  const isAdmin = accessRole === "ADMIN";

  if (isOwner) {
    return {
      canView: true,
      canEdit: isResponsible,
      canSubmit: isResponsible,
      canApprove: isApprover,
      canMasterData: true,
      canSeeAllTenantReports: true,
      mode: "OWNER",
    };
  }

  if (isResponsible) {
    return {
      canView: true,
      canEdit: true,
      canSubmit: true,
      canApprove: false,
      canMasterData: false,
      canSeeAllTenantReports: false,
      mode: "RESPONSIBLE",
    };
  }

  if (isApprover) {
    return {
      canView: true,
      canEdit: false,
      canSubmit: false,
      canApprove: true,
      canMasterData: false,
      canSeeAllTenantReports: false,
      mode: "APPROVER",
    };
  }

  if (isAdmin) {
    return {
      canView: true,
      canEdit: false,
      canSubmit: false,
      canApprove: false,
      canMasterData: false,
      canSeeAllTenantReports: true,
      mode: "NONE",
    };
  }

  return {
    canView: false,
    canEdit: false,
    canSubmit: false,
    canApprove: false,
    canMasterData: false,
    canSeeAllTenantReports: false,
    mode: "NONE",
  };
}
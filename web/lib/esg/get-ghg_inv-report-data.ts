import { db } from "@/lib/db";

export type Ghg_InvPreviewRow = {
  detailId: string;
  tag: string;
  description: string;
  value: string | number | null;
  unit: string;
  source: string;
  comment: string;
  sortOrder: number;
};

export type Ghg_InvPreviewData = {
  exists: boolean;
  canInsert: boolean;
  header: {
    reportTitle: string;
    documentNumber: string;
    revision: number;
    preparedBy: string;
    approvedBy: string;
    comment: string;
    status: string;
    siteName: string;
  };
  sections: {
    manual: Ghg_InvPreviewRow[];
    scada: Ghg_InvPreviewRow[];
    calculated: Ghg_InvPreviewRow[];
    undefined: Ghg_InvPreviewRow[];
  };
};

function getDayRange(value: string) {
  return {
    gte: new Date(`${value}T00:00:00.000Z`),
    lte: new Date(`${value}T23:59:59.999Z`),
  };
}

function pickValue(detail: {
  mpValueFloat: number | null;
  mpValueInt: number | null;
  mpValueText: string | null;
}) {
  if (detail.mpValueFloat !== null && detail.mpValueFloat !== undefined) {
    return detail.mpValueFloat;
  }
  if (detail.mpValueInt !== null && detail.mpValueInt !== undefined) {
    return detail.mpValueInt;
  }
  if (detail.mpValueText !== null && detail.mpValueText !== undefined) {
    return detail.mpValueText;
  }
  return null;
}

export async function getGhgInvReportData(params: {
  tenantId: string;
  reportCode: string;
  reportDate: string;
  revisionNo?: number;
  snapshotId?: string;
}): Promise<Ghg_InvPreviewData | null> {
  const { tenantId, reportCode, reportDate, revisionNo, snapshotId } = params;

  const report = await db.reportDefinition.findFirst({
    where: {
      code: reportCode,
      isActive: true,
    },
    select: {
      id: true,
      code: true,
      name: true,
    },
  });

  if (!report) return null;

  const site = await db.site.findFirst({
    where: {
      tenantId,
      isActive: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      name: true,
    },
  });

  const snapshot =
    snapshotId
      ? await db.measurementSnapshot.findFirst({
          where: {
            id: snapshotId,
            tenantId,
            reportId: report.id,
          },
          include: {
            details: {
              include: {
                measurementPoint: {
                  include: {
                    measurementUnit: true,
                    mpSource: true,
                  },
                },
              },
            },
            responsibleUser: {
              select: {
                name: true,
                firstName: true,
                lastName: true,
              },
            },
            approverUser: {
              select: {
                name: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        })
      : await db.measurementSnapshot.findFirst({
          where: {
            tenantId,
            reportId: report.id,
            snapshotDate: getDayRange(reportDate),
            ...(revisionNo !== undefined && revisionNo !== null
              ? { snapshotRevisionNo: revisionNo }
              : {}),
          },
          orderBy:
            revisionNo !== undefined && revisionNo !== null
              ? undefined
              : [{ snapshotRevisionNo: "desc" }],
          include: {
            details: {
              include: {
                measurementPoint: {
                  include: {
                    measurementUnit: true,
                    mpSource: true,
                  },
                },
              },
            },
            responsibleUser: {
              select: {
                name: true,
                firstName: true,
                lastName: true,
              },
            },
            approverUser: {
              select: {
                name: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

  const currentDayStatus = await db.reportDayStatus.findFirst({
    where: {
      tenantId,
      reportId: report.id,
      day: getDayRange(reportDate),
    },
    select: {
      status: true,
    },
  });

  const latestApprovalAction = await db.reportApprovalToken.findFirst({
    where: {
      tenantId,
      reportId: report.id,
      day: getDayRange(reportDate),
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      status: true,
      approverEmail: true,
      approverUserId: true,
      rejectComment: true,
    },
  });

  const latestApprovalActor = latestApprovalAction?.approverUserId
    ? await db.user.findUnique({
        where: { id: latestApprovalAction.approverUserId },
        select: {
          name: true,
          email: true,
        },
      })
    : null;

  const approvalActorName =
    latestApprovalActor?.name?.trim() ||
    latestApprovalActor?.email ||
    latestApprovalAction?.approverEmail ||
    "Approver";

  const displayStatus =
    currentDayStatus?.status === "APPROVED"
      ? `Approved by ${approvalActorName}`
      : currentDayStatus?.status === "REJECTED"
      ? `Rejected by ${approvalActorName}`
      : currentDayStatus?.status === "SUBMITTED"
      ? "Submitted for Approval"
      : "Draft";

  if (!snapshot) {
    return {
      exists: false,
      canInsert: true,
      header: {
        reportTitle: report.name || report.code,
        documentNumber: "",
        revision: 0,
        preparedBy: "",
        approvedBy: "",
        comment: latestApprovalAction?.rejectComment ?? "",
        status: displayStatus,
        siteName: site?.name ?? "",
      },
      sections: {
        manual: [],
        scada: [],
        calculated: [],
        undefined: [],
      },
    };
  }

  const preparedBy =
    snapshot.responsibleUser?.name ||
    [snapshot.responsibleUser?.firstName, snapshot.responsibleUser?.lastName]
      .filter(Boolean)
      .join(" ") ||
    "";

  const approvedBy =
    snapshot.approverUser?.name ||
    [snapshot.approverUser?.firstName, snapshot.approverUser?.lastName]
      .filter(Boolean)
      .join(" ") ||
    "";

  const rows: Ghg_InvPreviewRow[] = snapshot.details
    .map((d) => {
      const mp = d.measurementPoint;
      const source = String(mp.mpSource?.sourceName ?? "UNDEFINED")
        .trim()
        .toUpperCase();

      let value = pickValue(d);

      if (value === null && source === "CALCULATED") value = 0;
      if (value === null && source === "MANUAL") value = 0;
      if (value === null && source === "SCADA") value = 0;

      return {
        detailId: d.id,
        tag: mp.tagNo ?? "",
        description: mp.descEn ?? mp.descRu ?? "",
        value,
        unit: mp.measurementUnit?.unitTitle ?? "",
        source,
        comment: "",
        sortOrder: 0,
      };
    })
    .sort((a, b) => a.tag.localeCompare(b.tag));

  return {
    exists: true,
    canInsert: false,
    header: {
      reportTitle: report.name || report.code,
      documentNumber: snapshot.documentNumber ?? "",
      revision: snapshot.snapshotRevisionNo ?? 0,
      preparedBy: preparedBy || "Operations Reporting System",
      approvedBy,
      comment: latestApprovalAction?.rejectComment ?? snapshot.snapComment ?? "",
      status: displayStatus,
      siteName: site?.name ?? "",
    },
    sections: {
      manual: rows.filter((r) => r.source === "MANUAL"),
      scada: rows.filter((r) => r.source === "SCADA"),
      calculated: rows.filter((r) => r.source === "CALCULATED"),
      undefined: rows.filter((r) => r.source === "UNDEFINED"),
    },
  };
}
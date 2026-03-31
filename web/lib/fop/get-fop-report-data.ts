import { db } from "@/lib/db";

export type FopPreviewRow = {
  detailId: string;
  tag: string;
  description: string;
  value: string | number | null;
  unit: string;
  source: string;
  comment: string;
  sortOrder: number;
};

export type FopPreviewData = {
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
  };
  sections: {
    manual: FopPreviewRow[];
    scada: FopPreviewRow[];
    calculated: FopPreviewRow[];
    undefined: FopPreviewRow[];
  };
};

function toDateOnly(value: string) {
  return new Date(`${value}T00:00:00`);
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

export async function getFopReportData(params: {
  tenantId: string;
  reportCode: string;
  reportDate: string;
  revisionNo?: number;
}): Promise<FopPreviewData | null> {
  const { tenantId, reportCode, reportDate, revisionNo } = params;

  const report = await db.reportDefinition.findFirst({
    where: {
      tenantId,
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

  const snapshot = await db.measurementSnapshot.findFirst({
    where: {
      tenantId,
      reportId: report.id,
      snapshotDate: toDateOnly(reportDate),
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

  const currentDayStatus = await db.reportDayStatus.findUnique({
    where: {
      tenantId_reportId_day: {
        tenantId,
        reportId: report.id,
        day: toDateOnly(reportDate),
      },
    },
    select: {
      status: true,
    },
  });

  const latestApprovalAction = await db.reportApprovalToken.findFirst({
    where: {
      tenantId,
      reportId: report.id,
      day: toDateOnly(reportDate),
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      status: true,
      approverEmail: true,
      approverUserId: true,
      rejectComment: true,
    },
  });

  const latestApprovalActor =
    latestApprovalAction?.approverUserId
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

  const rows: FopPreviewRow[] = snapshot.details
    .map((d) => {
      const mp = d.measurementPoint;
      const source = mp.mpSource?.sourceName ?? "UNDEFINED";

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
    },
    sections: {
      manual: rows.filter((r) => r.source === "MANUAL"),
      scada: rows.filter((r) => r.source === "SCADA"),
      calculated: rows.filter((r) => r.source === "CALCULATED"),
      undefined: rows.filter((r) => r.source === "UNDEFINED"),
    },
  };
}
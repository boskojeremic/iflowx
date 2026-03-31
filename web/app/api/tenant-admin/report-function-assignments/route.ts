import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function getCurrentUserAndTenant(email: string) {
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

async function getModuleSeatSummary(tenantId: string, moduleId: string) {
  const tenantModuleInfo = await db.tenantModule.findFirst({
    where: {
      tenantId,
      moduleId,
      status: "ACTIVE",
    },
    select: {
      seatLimit: true,
      endsAt: true,
    },
  });

  const moduleReportIds = (
    await db.reportDefinition.findMany({
      where: {
        tenantId,
        ReportGroup: {
          tenantId,
          moduleId,
        },
        isActive: true,
      },
      select: {
        id: true,
      },
    })
  ).map((r) => r.id);

  const moduleAssignments = moduleReportIds.length
    ? await db.tenantReportFunctionAssignment.findMany({
        where: {
          tenantId,
          reportId: {
            in: moduleReportIds,
          },
          isActive: true,
        },
        select: {
          responsibleFunctionId: true,
          approverFunctionId: true,
        },
      })
    : [];

  const assignedFunctionIds = Array.from(
    new Set(
      moduleAssignments.flatMap((a) =>
        [a.responsibleFunctionId, a.approverFunctionId].filter(Boolean)
      )
    )
  ) as string[];

  const usedSeats = assignedFunctionIds.length
    ? await db.membership.count({
        where: {
          tenantId,
          status: "ACTIVE",
          operationalFunctionId: {
            in: assignedFunctionIds,
          },
        },
      })
    : 0;

  const seatLimit = tenantModuleInfo?.seatLimit ?? 0;
  const availableSeats = Math.max(seatLimit - usedSeats, 0);

  return {
    seatLimit,
    usedSeats,
    availableSeats,
    validUntil: tenantModuleInfo?.endsAt?.toISOString() ?? null,
  };
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const current = await getCurrentUserAndTenant(session.user.email);

    if (!current) {
      return NextResponse.json(
        { error: "No active tenant found" },
        { status: 400 }
      );
    }

    const tenantId = current.tenantId;
    const { searchParams } = new URL(req.url);

    const moduleId = searchParams.get("moduleId") || "";
    const reportGroupId = searchParams.get("reportGroupId") || "";

    const tenantModulesRaw = await db.tenantModule.findMany({
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
            Industry: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const modules = tenantModulesRaw
      .map((x) => ({
        id: x.module.id,
        code: x.module.code,
        name: x.module.name,
        industryId: x.module.Industry?.id ?? "",
        industryName: x.module.Industry?.name ?? "Other",
      }))
      .sort(
        (a, b) =>
          a.industryName.localeCompare(b.industryName, undefined, {
            sensitivity: "base",
          }) ||
          a.name.localeCompare(b.name, undefined, {
            sensitivity: "base",
          })
      );

    const reportGroups = moduleId
      ? await db.reportGroup.findMany({
          where: {
            tenantId,
            moduleId,
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

    const reportsRaw = reportGroupId
      ? await db.reportDefinition.findMany({
          where: {
            tenantId,
            reportGroupId,
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

    const operationalFunctions = await db.operationalFunction.findMany({
      where: {
        tenantId,
      },
      select: {
        id: true,
        name: true,
        abbreviation: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    const assignments = reportsRaw.length
      ? await db.tenantReportFunctionAssignment.findMany({
          where: {
            tenantId,
            reportId: {
              in: reportsRaw.map((r) => r.id),
            },
            isActive: true,
          },
          select: {
            reportId: true,
            responsibleFunctionId: true,
            approverFunctionId: true,
          },
        })
      : [];

    const assignmentMap = new Map(
      assignments.map((a) => [
        a.reportId,
        {
          responsibleFunctionId: a.responsibleFunctionId,
          approverFunctionId: a.approverFunctionId,
        },
      ])
    );

    const reports = reportsRaw.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      responsibleFunctionId:
        assignmentMap.get(r.id)?.responsibleFunctionId ?? null,
      approverFunctionId:
        assignmentMap.get(r.id)?.approverFunctionId ?? null,
    }));

    const licenseSummary = moduleId
      ? await getModuleSeatSummary(tenantId, moduleId)
      : {
          seatLimit: 0,
          usedSeats: 0,
          availableSeats: 0,
          validUntil: null,
        };

    return NextResponse.json({
      tenant: current.tenant,
      modules,
      reportGroups,
      reports,
      operationalFunctions,
      selectedModuleId: moduleId || null,
      selectedreportGroupId: reportGroupId || null,
      licenseSummary,
    });
  } catch (error) {
    console.error(
      "GET /api/tenant-admin/report-function-assignments failed:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const current = await getCurrentUserAndTenant(session.user.email);

    if (!current) {
      return NextResponse.json(
        { error: "No active tenant found" },
        { status: 400 }
      );
    }

    const tenantId = current.tenantId;
    const body = await req.json();

    const reportId = String(body?.reportId ?? "").trim();
    const responsibleFunctionId = body?.responsibleFunctionId
      ? String(body.responsibleFunctionId)
      : null;
    const approverFunctionId = body?.approverFunctionId
      ? String(body.approverFunctionId)
      : null;

    if (!reportId) {
      return NextResponse.json({ error: "REPORT_REQUIRED" }, { status: 400 });
    }

    const report = await db.reportDefinition.findFirst({
      where: {
        id: reportId,
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
        reportGroupId: true,
        ReportGroup: {
          select: {
            moduleId: true,
            tenantId: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "INVALID_REPORT" }, { status: 400 });
    }

    const tenantModule = await db.tenantModule.findFirst({
      where: {
        tenantId,
        moduleId: report.ReportGroup.moduleId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        seatLimit: true,
        endsAt: true,
      },
    });

    if (!tenantModule) {
      return NextResponse.json(
        { error: "REPORT_MODULE_NOT_ASSIGNED_TO_TENANT" },
        { status: 400 }
      );
    }

    if (responsibleFunctionId) {
      const f = await db.operationalFunction.findFirst({
        where: {
          id: responsibleFunctionId,
          tenantId,
        },
        select: { id: true },
      });

      if (!f) {
        return NextResponse.json(
          { error: "INVALID_RESPONSIBLE_FUNCTION" },
          { status: 400 }
        );
      }
    }

    if (approverFunctionId) {
      const f = await db.operationalFunction.findFirst({
        where: {
          id: approverFunctionId,
          tenantId,
        },
        select: { id: true },
      });

      if (!f) {
        return NextResponse.json(
          { error: "INVALID_APPROVER_FUNCTION" },
          { status: 400 }
        );
      }
    }

    const moduleReportIds = (
      await db.reportDefinition.findMany({
        where: {
          tenantId,
          ReportGroup: {
            tenantId,
            moduleId: report.ReportGroup.moduleId,
          },
          isActive: true,
        },
        select: {
          id: true,
        },
      })
    ).map((r) => r.id);

    const existingAssignments = await db.tenantReportFunctionAssignment.findMany(
      {
        where: {
          tenantId,
          reportId: {
            in: moduleReportIds,
          },
          isActive: true,
        },
        select: {
          reportId: true,
          responsibleFunctionId: true,
          approverFunctionId: true,
        },
      }
    );

    const simulatedAssignments = existingAssignments.filter(
      (a) => a.reportId !== reportId
    );

    simulatedAssignments.push({
      reportId,
      responsibleFunctionId,
      approverFunctionId,
    });

    const simulatedFunctionIds = Array.from(
      new Set(
        simulatedAssignments.flatMap((a) =>
          [a.responsibleFunctionId, a.approverFunctionId].filter(Boolean)
        )
      )
    ) as string[];

    const simulatedUsedSeats = simulatedFunctionIds.length
      ? await db.membership.count({
          where: {
            tenantId,
            status: "ACTIVE",
            operationalFunctionId: {
              in: simulatedFunctionIds,
            },
          },
        })
      : 0;

    if (simulatedUsedSeats > (tenantModule.seatLimit ?? 0)) {
      return NextResponse.json(
        {
          error: "LICENSE_LIMIT_EXCEEDED",
          details: {
            seatLimit: tenantModule.seatLimit ?? 0,
            usedSeats: simulatedUsedSeats,
            availableSeats: Math.max(
              (tenantModule.seatLimit ?? 0) - simulatedUsedSeats,
              0
            ),
            validUntil: tenantModule.endsAt?.toISOString() ?? null,
          },
        },
        { status: 409 }
      );
    }

    const saved = await db.tenantReportFunctionAssignment.upsert({
      where: {
        tenantId_reportId: {
          tenantId,
          reportId,
        },
      },
      update: {
        responsibleFunctionId,
        approverFunctionId,
        isActive: true,
      },
      create: {
        tenantId,
        reportId,
        responsibleFunctionId,
        approverFunctionId,
        isActive: true,
      },
    });

    const licenseSummary = await getModuleSeatSummary(
      tenantId,
      report.ReportGroup.moduleId
    );

    return NextResponse.json({
      ok: true,
      item: saved,
      licenseSummary,
    });
  } catch (error) {
    console.error(
      "POST /api/tenant-admin/report-function-assignments failed:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
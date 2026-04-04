import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import FopReportTemplate from "@/components/fop/templates/FopReportTemplate";
import { FOP_REPORT_META, type FopReportCode } from "@/lib/fop-report-meta";
import { getFopReportData } from "@/lib/fop/get-fop-report-data";

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{
    date?: string;
    rev?: string;
    token?: string;
    pdf?: string;
    key?: string;
  }>;
};

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildUtcDayRange(dateText: string) {
  const start = new Date(`${dateText}T00:00:00.000Z`);
  const end = new Date(`${dateText}T23:59:59.999Z`);
  return { start, end };
}

export default async function FopPreviewPage({
  params,
  searchParams,
}: Props) {
  const { code } = await params;
  const sp = await searchParams;

  const reportCode = String(code || "").toUpperCase() as FopReportCode;
  const token = String(sp?.token || "").trim();
  const pdfMode = String(sp?.pdf || "").trim() === "1";
  const pdfKey = String(sp?.key || "").trim();
  const validPdfKey =
    !!process.env.PDF_INTERNAL_SECRET &&
    pdfKey === process.env.PDF_INTERNAL_SECRET;

  let tenantId: string | null = null;
  let reportDate = String(sp?.date || "").trim();
  let revisionNo = Number(sp?.rev ?? 0);

  const reportDefinition = await db.reportDefinition.findFirst({
    where: {
      code: reportCode,
    },
    select: {
      id: true,
      code: true,
    },
  });

  if (!reportDefinition) notFound();

  if (pdfMode) {
    if (!validPdfKey) notFound();
    if (!reportDate) notFound();

    const { start, end } = buildUtcDayRange(reportDate);

    const snapshot = await db.measurementSnapshot.findFirst({
      where: {
        reportId: reportDefinition.id,
        snapshotRevisionNo: revisionNo,
        snapshotDate: {
          gte: start,
          lte: end,
        },
      },
      orderBy: [{ snapshotDate: "desc" }],
      select: {
        tenantId: true,
      },
    });

    tenantId = snapshot?.tenantId ?? null;
    if (!tenantId) notFound();
  } else if (token) {
    const approval = await db.reportApprovalToken.findUnique({
      where: { token },
      select: {
        tenantId: true,
        reportCode: true,
        day: true,
        revisionNo: true,
        expiresAt: true,
        status: true,
      },
    });

    if (!approval) notFound();

    const isExpired = approval.expiresAt.getTime() < Date.now();
    if (isExpired) notFound();

    tenantId = approval.tenantId;
    reportDate = ymd(approval.day);
    revisionNo = approval.revisionNo ?? 0;

    if (approval.reportCode.toUpperCase() !== reportCode) {
      notFound();
    }
  } else {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) notFound();

    const user = await db.user.findUnique({
      where: {
        email: session.user.email,
      },
      select: {
        memberships: {
          where: { status: "ACTIVE" },
          orderBy: [{ createdAt: "desc" }],
          select: { tenantId: true },
        },
      },
    });

    tenantId = user?.memberships?.[0]?.tenantId ?? null;
    if (!tenantId) notFound();

    if (!reportDate) {
      const latestSnapshot = await db.measurementSnapshot.findFirst({
        where: {
          tenantId,
          reportId: reportDefinition.id,
        },
        orderBy: [{ snapshotDate: "desc" }, { snapshotRevisionNo: "desc" }],
        select: {
          snapshotDate: true,
          snapshotRevisionNo: true,
        },
      });

      if (!latestSnapshot) notFound();

      reportDate = ymd(latestSnapshot.snapshotDate);
      revisionNo = latestSnapshot.snapshotRevisionNo ?? 0;
    }
  }

  const reportMeta = FOP_REPORT_META[reportCode] ?? FOP_REPORT_META.DOR;

  const data = await getFopReportData({
    tenantId,
    reportCode,
    reportDate,
    revisionNo,
  });

  if (!data) notFound();

  if (pdfMode) {
    return (
      <main
        style={{
          margin: 0,
          padding: 0,
          background: "#ffffff",
          minHeight: "100vh",
        }}
      >
        <FopReportTemplate
          report={reportMeta}
          reportDate={reportDate}
          data={data}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white p-4">
      <FopReportTemplate
        report={reportMeta}
        reportDate={reportDate}
        data={data}
      />
    </main>
  );
}
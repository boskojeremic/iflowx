import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import FopReportTemplate from "@/components/fop/templates/FopReportTemplate";
import { FOP_REPORT_META, type FopReportCode } from "@/lib/fop-report-meta";
import { getFopReportData } from "@/lib/fop/get-fop-report-data";

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ date?: string; rev?: string; token?: string }>;
};

function ymd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default async function FopPreviewPage({
  params,
  searchParams,
}: Props) {
  const { code } = await params;
  const sp = await searchParams;

  const reportCode = String(code || "").toUpperCase() as FopReportCode;
  const token = String(sp?.token || "").trim();

  let tenantId: string | null = null;
  let reportDate = String(sp?.date || "");
  let revisionNo = Number(sp?.rev ?? 0);

  if (token) {
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
  }

  const reportMeta = FOP_REPORT_META[reportCode] ?? FOP_REPORT_META.DOR;

  const data = await getFopReportData({
    tenantId,
    reportCode,
    reportDate,
    revisionNo,
  });

  if (!data) {
    notFound();
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
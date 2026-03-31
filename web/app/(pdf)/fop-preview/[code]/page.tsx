import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import FopReportTemplate from "@/components/fop/templates/FopReportTemplate";
import { FOP_REPORT_META, type FopReportCode } from "@/lib/fop-report-meta";
import { getFopReportData } from "@/lib/fop/get-fop-report-data";

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ date?: string; rev?: string }>;
};

export default async function FopPreviewPage({
  params,
  searchParams,
}: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) notFound();

  const { code } = await params;
  const sp = await searchParams;

  const reportCode = String(code || "").toUpperCase() as FopReportCode;
  const reportDate = String(sp?.date || "");
  const revisionNo = Number(sp?.rev ?? 0);

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

  const tenantId = user?.memberships?.[0]?.tenantId ?? null;
  if (!tenantId) notFound();

  const reportMeta =
    FOP_REPORT_META[reportCode] ?? FOP_REPORT_META.DOR;

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
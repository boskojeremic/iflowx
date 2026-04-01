import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import GhgInvReportTemplate from "@/components/esg/templates/Ghg_invReportTemplate";
import {
  GHG_Inv_REPORT_META,
  type GHG_InvReportCode,
} from "@/lib/ghg_inv-report-meta";
import { getGhgInvReportData } from "@/lib/esg/get-ghg_inv-report-data";

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ date?: string; rev?: string }>;
};

export default async function GhgInvPreviewPage({
  params,
  searchParams,
}: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) notFound();

  const { code } = await params;
  const sp = await searchParams;

  const reportCode = String(code || "").toUpperCase() as GHG_InvReportCode;
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
    GHG_Inv_REPORT_META[reportCode] ?? GHG_Inv_REPORT_META.GHG_INV;

  const data = await getGhgInvReportData({
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
      <GhgInvReportTemplate
        report={reportMeta}
        reportDate={reportDate}
        data={data}
      />
    </main>
  );
}
import { notFound } from "next/navigation";
import FopReportTemplate from "@/components/fop/templates/FopReportTemplate";
import { FOP_REPORT_META, type FopReportCode } from "@/lib/fop-report-meta";

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ date?: string }>;
};

export default async function FopPreviewPage({
  params,
  searchParams,
}: Props) {
  const { code } = await params;
  const sp = await searchParams;

  const reportCode = String(code || "").toUpperCase() as FopReportCode;
  const reportDate = String(sp?.date || "2026-03-16");

  const reportMeta = FOP_REPORT_META[reportCode];

  if (!reportMeta) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-white p-4">
      <FopReportTemplate report={reportMeta} reportDate={reportDate} />
    </main>
  );
}
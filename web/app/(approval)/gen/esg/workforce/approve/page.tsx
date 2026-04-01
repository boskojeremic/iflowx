import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ReportView from "@/components/ReportView";
import WorkforceApprovalActions from "@/components/esg/WorkforceApprovalActions";

type SearchParams = Promise<{
  token?: string;
}>;

function ymd(value: Date | string) {
  const d = new Date(value);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default async function WorkforceApprovePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const token = String(sp?.token ?? "").trim();

  if (!token) notFound();

  const approval = await db.reportApprovalToken.findUnique({
    where: { token },
  });

  if (!approval) notFound();

  const isExpired = approval.expiresAt.getTime() < Date.now();
  const isPending = approval.status === "PENDING" && !isExpired;

  const reportDate = ymd(approval.day);

  const pdfSrc =
    `/work-force-preview/${approval.reportCode}` +
    `?tenantId=${encodeURIComponent(approval.tenantId)}` +
    `&date=${encodeURIComponent(reportDate)}` +
    `&rev=${encodeURIComponent(String(approval.revisionNo))}`;

  return (
    <div className="min-h-screen bg-[#07110d] p-6 text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6">
        <div className="w-full max-w-5xl rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="text-xl font-semibold">{approval.reportName}</div>
              <div className="mt-1 text-sm text-white/60">
                Date: {reportDate} / Revision: {approval.revisionNo}
                {approval.documentNumber ? ` / ${approval.documentNumber}` : ""}
              </div>
            </div>

            <div className="text-sm">
              {isExpired ? (
                <span className="rounded bg-red-500/15 px-3 py-1 text-red-300">
                  Expired
                </span>
              ) : approval.status === "APPROVED" ? (
                <span className="rounded bg-emerald-500/15 px-3 py-1 text-emerald-300">
                  Approved
                </span>
              ) : approval.status === "REJECTED" ? (
                <span className="rounded bg-red-500/15 px-3 py-1 text-red-300">
                  Rejected
                </span>
              ) : (
                <span className="rounded bg-blue-500/15 px-3 py-1 text-blue-300">
                  Pending Approval
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <ReportView
              pdfSrc={pdfSrc}
              title={approval.reportName}
              reportDate={reportDate}
            />
          </div>

          {approval.status === "REJECTED" && approval.rejectComment && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
              <div className="font-medium">Rejection reason</div>
              <div className="mt-2 whitespace-pre-wrap">
                {approval.rejectComment}
              </div>
            </div>
          )}

          {approval.status === "APPROVED" && (
            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              This report has already been approved.
            </div>
          )}

          {isExpired && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
              This approval link has expired.
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <WorkforceApprovalActions token={approval.token} isPending={isPending} />
          </div>
        </div>
      </div>
    </div>
  );
}
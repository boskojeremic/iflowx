import ReportGroupsPanel from "@/components/core-admin/ReportGroupsPanel";
import BackToMasterData from "@/components/master-data/BackToMasterData";

export const dynamic = "force-dynamic";

export default function MasterDataReportGroupsPage() {
  return (
    <div className="space-y-6">
      {/* Header + Back */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Report Groups</h1>
          <p className="mt-1 text-sm text-white/60">
            Maintain Tenant-Level Report Group Structure By Module
          </p>
        </div>

        <BackToMasterData />
      </div>

      {/* Content */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <ReportGroupsPanel />
      </div>
    </div>
  );
}
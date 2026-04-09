import Link from "next/link";

export default function MasterDataAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Master Data Admin</h1>
        <p className="mt-1 text-sm text-white/60">
          Tenant-Level Technical Setup For Sites, Facilities, Assets, Parameters, And Reporting
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-4 text-xs uppercase tracking-wider text-white/40">
          Master Data Areas
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Link
            href="/master-data/sites"
            className="rounded-xl border border-white/10 bg-black/20 p-5 transition hover:bg-white/[0.06]"
          >
            <div className="font-semibold">Sites</div>
            <div className="mt-2 text-sm text-white/65">
              Manage Tenant Sites, Fields, Plants, And Operating Areas
            </div>
          </Link>

          <Link
            href="/master-data/facilities"
            className="rounded-xl border border-white/10 bg-black/20 p-5 transition hover:bg-white/[0.06]"
          >
            <div className="font-semibold">Facilities</div>
            <div className="mt-2 text-sm text-white/65">
              Manage Facilities Within Selected Tenant Sites
            </div>
          </Link>

          <Link
            href="/master-data/asset-types"
            className="rounded-xl border border-white/10 bg-black/20 p-5 transition hover:bg-white/[0.06]"
          >
            <div className="font-semibold">Asset Types</div>
            <div className="mt-2 text-sm text-white/65">
              Define Standard Asset Type Catalog For Tenant Setup
            </div>
          </Link>

          <Link
            href="/master-data/assets"
            className="rounded-xl border border-white/10 bg-black/20 p-5 transition hover:bg-white/[0.06]"
          >
            <div className="font-semibold">Assets</div>
            <div className="mt-2 text-sm text-white/65">
              Manage Assets, Hierarchy, Roles, And Reporting Sources
            </div>
          </Link>

          <Link
            href="/master-data/parameters"
            className="rounded-xl border border-white/10 bg-black/20 p-5 transition hover:bg-white/[0.06]"
          >
            <div className="font-semibold">Parameters</div>
            <div className="mt-2 text-sm text-white/65">
              Define Reporting Parameters, Units, And Source Configuration
            </div>
          </Link>

          <Link
            href="/master-data/measurement-points"
            className="rounded-xl border border-white/10 bg-black/20 p-5 transition hover:bg-white/[0.06]"
          >
            <div className="font-semibold">Measurement Points</div>
            <div className="mt-2 text-sm text-white/65">
              Set Up Data Capture Points, Tags, And Measurement Sources
            </div>
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="text-sm font-semibold">Current Scope</div>
        <div className="mt-2 text-sm text-white/65">
          This Area Is Reserved For Master Data Administration By Authorized Tenant Users.
          Tenant Admin Assigns Privileges, While Master Data Admin Maintains Operational Structure.
        </div>
      </div>
    </div>
  );
}
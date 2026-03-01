import { getCurrentUser } from "@/lib/authz";
import { getLicenseStatusForUser } from "@/lib/license-status";

export default async function LicenseStatusCard() {
  const me = await getCurrentUser();
  if (!me) return null;

  const status = await getLicenseStatusForUser(me.id);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] shadow-sm">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="text-sm font-semibold text-white/90">License Status</div>
        <div className="text-xs text-white/50">
          User identity + tenant membership
        </div>
      </div>

      <div className="px-5 py-4 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="text-white/60">User</div>
          <div className="text-white/90 text-right">
            {me.name ?? "-"}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="text-white/60">Email</div>
          <div className="text-white/90 text-right">{me.email}</div>
        </div>

        <div className="h-px bg-white/10" />

        <div className="flex items-center justify-between gap-4">
          <div className="text-white/60">Tenant</div>
          <div className="text-white/90 text-right">
            {status?.tenant ? (
              <>
                {status.tenant.name}{" "}
                <span className="text-white/50">({status.tenant.code})</span>
              </>
            ) : (
              <span className="text-white/50">Not assigned</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="text-white/60">Role</div>
          <div className="text-white/90 text-right">
            {status?.role ?? <span className="text-white/50">N/A</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
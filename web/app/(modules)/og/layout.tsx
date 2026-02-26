// app/(modules)/og/layout.tsx  (SERVER component)
import Link from "next/link";
import { getCurrentUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { getPortalNavForTenant } from "@/lib/portal-nav";

export default async function OGLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  if (!me) return <div className="p-6 text-white">UNAUTH</div>;

  // Nađi tenantId iz membership-a (ako već imaš "activeTenantId" logiku, koristi nju)
  // Ovde uzimam prvi ACTIVE membership kao primer:
  const membership = await db.membership.findFirst({
    where: { userId: me.id, status: "ACTIVE" },
    select: { tenantId: true },
  });

  if (!membership) {
    return <div className="p-6 text-white">No tenant membership</div>;
  }

  const nav = await getPortalNavForTenant(membership.tenantId);

  return (
    <div className="min-h-screen flex text-white">
      <aside className="w-[280px] border-r border-white/10 p-4">
        {/* Super Admin button hard-coded */}
        {me.isSuperAdmin && (
          <div className="mb-4">
            <Link
              href="/core-admin/tenant-control"
              className="block rounded px-3 py-2 bg-white/10 border border-white/15 hover:bg-white/15"
            >
              Core Admin
            </Link>
          </div>
        )}

        {/* DB-driven modules */}
        <div className="space-y-4">
  {nav.map((p, idx) => (
    <div key={idx}>
      <div className="flex flex-col gap-2">
        {p.modules.map((m) => (
          <Link
            key={m.code}
            href={m.routePath}
            className="block rounded px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10"
          >
            {m.name}
          </Link>
        ))}
      </div>
    </div>
  ))}

  {nav.length === 0 && (
    <div className="text-xs text-white/50">
      No modules assigned to this tenant yet.
    </div>
  )}
</div>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
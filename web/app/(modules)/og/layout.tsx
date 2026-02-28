// app/(modules)/og/layout.tsx  (SERVER component)
import Link from "next/link";
import { getCurrentUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { getPortalNavForUserTenant } from "@/lib/portal-nav";

export default async function OGLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  if (!me) return <div className="p-6 text-white">UNAUTH</div>;

  // Uzmi "najnoviji" ACTIVE membership (da ne uzme pogrešan tenant kad imaš više njih)
  const membership = await db.membership.findFirst({
  where: {
    userId: me.id,
    status: "ACTIVE",
    tenantId: "65c37a30-c5f8-48b6-bc04-ba440225e43f", // <-- tvoj UOG_TEST tenantId
  },
  select: { tenantId: true },
});

  if (!membership) {
    return <div className="p-6 text-white">No tenant membership</div>;
  }

  const nav = await getPortalNavForUserTenant(me.id, membership.tenantId);

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
          {nav.map((p: any) => (
            <div key={p.industryCode}>
              <div className="text-xs opacity-60 mb-2">{p.industryName}</div>

              <div className="flex flex-col gap-2">
                {p.modules.map((m: any) => (
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
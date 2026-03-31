import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/authz";
import { checkUserLicense } from "@/lib/license";
import { getPortalNavForUserTenant } from "@/lib/portal-nav";
import AppSidebar from "@/components/AppSidebar";
import MobileNavClient from "@/components/MobileNavClient";

export default async function CoreAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    return <div style={{ padding: 24 }}>Not signed in</div>;
  }

  const membership = await db.membership.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
    },
    orderBy: [
      { accessStartsAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    select: {
      tenantId: true,
      role: true,
      tenant: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  });

  const tenantId = membership?.tenantId ?? null;

  const showCoreAdmin = !!user.isSuperAdmin;

  const isTenantAdmin =
    membership?.role === "ADMIN" || membership?.role === "OWNER";

  const isMasterDataAdmin =
    membership?.role === "ADMIN" || membership?.role === "OWNER";

  const showTenantAdmin = !user.isSuperAdmin && isTenantAdmin;
  const showMasterDataAdmin = !user.isSuperAdmin && isMasterDataAdmin;

  const lic = await checkUserLicense(user.email);

  const { nav } = tenantId
    ? await getPortalNavForUserTenant(user.id, tenantId)
    : { nav: [] };

  const groups = nav
    .map((g: any) => ({
      key: String(g.industryCode ?? g.industryName ?? "IND"),
      title: String(g.industryName ?? "Modules"),
      items: (g.modules ?? [])
        .filter((m: any) => !!m?.routePath)
        .map((m: any) => ({
          code: String(m.code ?? ""),
          label: String(m.name ?? m.code ?? "Module"),
          href: String(m.routePath),
        })),
    }))
    .filter((g: any) => g.items.length > 0);

  const displayUser = user.name?.trim() || user.email;
  const displayRole = user.isSuperAdmin ? "SUPERADMIN" : membership?.role ?? "-";
  const displayTenant = membership?.tenant
    ? `${membership.tenant.code} · ${membership.tenant.name}`
    : "NO TENANT";

  return (
    <div className="flex min-h-screen md:h-screen overflow-hidden bg-[#07110d] text-white">
      <AppSidebar
        tenantId={tenantId}
        userId={user.id}
        showCoreAdmin={showCoreAdmin}
        showTenantAdmin={showTenantAdmin}
        showMasterDataAdmin={showMasterDataAdmin}
      />

      <div className="flex min-h-screen md:h-screen flex-1 min-w-0 flex-col overflow-y-auto md:overflow-hidden bg-[#07110d]">
        <div className="shrink-0 md:hidden">
          <MobileNavClient
            groups={groups}
            showCoreAdmin={showCoreAdmin}
            showTenantAdmin={showTenantAdmin}
            showMasterDataAdmin={showMasterDataAdmin}
          />
        </div>

        <div className="flex h-14 shrink-0 items-center justify-end gap-2 border-b border-white/10 bg-[#0b0f0d] px-3 sm:px-4 md:px-6">
          <div className="hidden md:flex items-center gap-2 text-[11px] sm:text-xs">
            <div className="rounded-md border border-white/10 bg-[#151a18] px-3 py-1">
              Tenant: <b>{displayTenant}</b>
            </div>

            <div className="rounded-md border border-white/10 bg-[#151a18] px-3 py-1">
              User: <b>{displayUser}</b>
            </div>

            <div className="rounded-md border border-white/10 bg-[#151a18] px-3 py-1">
              Role: <b>{displayRole}</b>
            </div>

            {!user.isSuperAdmin && lic && (
              <div className="rounded-md border border-white/10 bg-[#151a18] px-3 py-1">
                License status: <b>{lic.active ? "ACTIVE" : "INACTIVE"}</b>
                {!lic.active && lic.reason ? (
                  <span className="ml-2 opacity-70">({lic.reason})</span>
                ) : null}
              </div>
            )}
          </div>

          <div className="flex md:hidden items-center gap-2 text-[11px]">
            <div className="rounded-md border border-white/10 bg-[#151a18] px-2 py-1">
              <b>{membership?.tenant?.code ?? "NO TENANT"}</b>
            </div>

            <div className="rounded-md border border-white/10 bg-[#151a18] px-2 py-1">
              <b>{displayRole}</b>
            </div>

            {!user.isSuperAdmin && lic && (
              <div className="rounded-md border border-white/10 bg-[#151a18] px-2 py-1">
                <b>{lic.active ? "ACTIVE" : "INACTIVE"}</b>
              </div>
            )}
          </div>
        </div>

        <main className="flex-1 overflow-visible md:overflow-hidden bg-[#07110d] p-3 sm:p-4 md:p-6">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col md:h-full px-0 sm:px-2 md:px-4 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
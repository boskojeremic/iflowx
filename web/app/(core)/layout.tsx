// app/(core)/layout.tsx
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/authz";
import { checkUserLicense } from "@/lib/license";
import AppSidebar from "@/components/AppSidebar";

export default async function CoreAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return <div style={{ padding: 24 }}>Not signed in</div>;
  }

  const memberships = await db.membership.findMany({
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
    },
  });

  const tenantId = memberships[0]?.tenantId ?? null;

  const showCoreAdmin = !!user.isSuperAdmin;

  const isTenantAdmin = memberships.some(
    (m) => m.role === "ADMIN" || m.role === "OWNER"
  );

  const isMasterDataAdmin = memberships.some(
    (m) => m.role === "ADMIN" || m.role === "OWNER"
  );

  const showTenantAdmin = !user.isSuperAdmin && isTenantAdmin;
  const showMasterDataAdmin = !user.isSuperAdmin && isMasterDataAdmin;

  const lic = await checkUserLicense(user.email);

    return (
    <div className="flex min-h-screen overflow-hidden">
      <AppSidebar
        tenantId={tenantId}
        userId={user.id}
        showCoreAdmin={showCoreAdmin}
        showTenantAdmin={showTenantAdmin}
        showMasterDataAdmin={showMasterDataAdmin}
      />

      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="md:hidden border-b px-3 py-2 bg-background sticky top-0 z-30">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">IFlowX</div>
            <a
              href="/home"
              className="rounded border px-3 py-1 text-xs font-medium"
            >
              HOME
            </a>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {showCoreAdmin && (
              <a
                href="/core-admin?tab=industry"
                className="rounded border px-3 py-1 text-xs"
              >
                CORE ADMIN
              </a>
            )}

            {showTenantAdmin && (
              <a
                href="/tenant-admin?tab=users"
                className="rounded border px-3 py-1 text-xs"
              >
                TENANT ADMIN
              </a>
            )}

            {showMasterDataAdmin && (
              <a
                href="/master-data"
                className="rounded border px-3 py-1 text-xs"
              >
                MASTER DATA
              </a>
            )}
          </div>
        </div>

        <div className="h-14 px-3 sm:px-4 md:px-6 flex items-center justify-end border-b">
          {!user.isSuperAdmin && lic && (
            <div className="text-[11px] sm:text-xs px-2 sm:px-3 py-1 rounded-md border border-white/10 bg-white/[0.03]">
              License status: <b>{lic.active ? "ACTIVE" : "INACTIVE"}</b>
              {!lic.active && lic.reason ? (
                <span className="ml-2 opacity-70">({lic.reason})</span>
              ) : null}
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4 md:p-6 w-full">
          <div className="mx-auto w-full max-w-[1600px] px-0 sm:px-2 md:px-4 lg:px-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
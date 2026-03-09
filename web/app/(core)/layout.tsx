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
    <div className="flex min-h-screen overflow-hidden bg-background">
      <AppSidebar
        tenantId={tenantId}
        userId={user.id}
        showCoreAdmin={showCoreAdmin}
        showTenantAdmin={showTenantAdmin}
        showMasterDataAdmin={showMasterDataAdmin}
      />

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="flex h-14 items-center justify-end border-b px-3 sm:px-4 md:px-6">
          {!user.isSuperAdmin && lic && (
            <div className="max-w-full rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] sm:px-3 sm:py-1 sm:text-xs">
              License status: <b>{lic.active ? "ACTIVE" : "INACTIVE"}</b>
              {!lic.active && lic.reason ? (
                <span className="ml-2 opacity-70">({lic.reason})</span>
              ) : null}
            </div>
          )}
        </div>

        <div className="w-full p-3 sm:p-4 md:p-6">
          <div className="mx-auto w-full max-w-[1600px] px-0 sm:px-2 md:px-4 lg:px-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
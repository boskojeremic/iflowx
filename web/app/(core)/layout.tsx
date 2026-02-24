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

  const membership = await db.membership.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    select: { tenantId: true },
  });

  const tenantId = membership?.tenantId ?? null;

  const lic = await checkUserLicense(user.email);

  return (
    <div className="min-h-screen flex">
      <AppSidebar tenantId={tenantId} showCoreAdmin={!!user.isSuperAdmin} />

      <main className="flex-1 min-w-0">
        {/* header bar */}
        <div className="h-14 px-6 flex items-center justify-end border-b">
          {!user.isSuperAdmin && lic && lic.licenseState !== "ACTIVE" && (
            <div className="text-xs px-3 py-1 rounded-md border">
              License status: <b>{lic.licenseState}</b>
            </div>
          )}
        </div>

        {/* centered content */}
        <div className="p-6 w-full">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </div>
      </main>
    </div>
  );
}
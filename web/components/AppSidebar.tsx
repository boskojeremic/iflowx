// components/AppSidebar.tsx
import AppSidebarClient from "./AppSidebarClient";
import { getPortalNavForTenant } from "@/lib/portal-nav";

export default async function AppSidebar({
  tenantId,
  showCoreAdmin,
}: {
  tenantId: string | null;
  showCoreAdmin: boolean;
}) {
  const nav = tenantId ? await getPortalNavForTenant(tenantId) : [];

  const groups = nav.map((g) => ({
    title: g.industryName,
    items: g.modules.map((m) => ({ label: m.name, href: m.routePath })),
  }));

  return <AppSidebarClient groups={groups} showCoreAdmin={showCoreAdmin} />;
}
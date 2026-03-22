import AppSidebarHydrationSafe from "./AppSidebarHydrationSafe";
import { getPortalNavForUserTenant } from "@/lib/portal-nav";

export type SidebarItem = {
  code: string;
  label: string;
  href: string;
};

export type SidebarGroupData = {
  key: string;
  title: string;
  items: SidebarItem[];
};

export default async function AppSidebar({
  tenantId,
  userId,
  showCoreAdmin,
  showTenantAdmin,
  showMasterDataAdmin,
}: {
  tenantId: string | null;
  userId: string;
  showCoreAdmin: boolean;
  showTenantAdmin: boolean;
  showMasterDataAdmin: boolean;
}) {
const { nav, adminLinks } = tenantId
  ? await getPortalNavForUserTenant(userId, tenantId)
  : {
      nav: [],
      adminLinks: {
        showTenantAdmin: false,
        showMasterDataAdmin: false,
      },
    };

  const groups: SidebarGroupData[] = nav
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
    .filter((g) => g.items.length > 0);

  return (
    <AppSidebarHydrationSafe
  groups={groups}
  showCoreAdmin={showCoreAdmin}
  showTenantAdmin={adminLinks.showTenantAdmin}
  showMasterDataAdmin={adminLinks.showMasterDataAdmin}
/>
  );
}
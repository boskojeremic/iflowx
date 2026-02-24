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

  // Industry grouping (ako tenant ima više industrija)
  // Pošto getPortalNavForTenant vraća platforme, a platforma pripada Industry,
  // trenutno nemamo industry name u rezultatu.
  // Zato u ovoj fazi prikazujemo platforme kao headings (sigurno radi).
  // Industry heading dodajemo u sledećem koraku (KORAK 4).
  const groups = nav.map((p) => ({
    title: p.platformName,
    items: p.modules.map((m) => ({ label: m.name, href: m.routePath })),
  }));

  return <AppSidebarClient groups={groups} showCoreAdmin={showCoreAdmin} />;
}
"use client";

import { useEffect, useState } from "react";
import AppSidebarClient from "./AppSidebarClient";
import type { SidebarGroupData } from "./AppSidebar";

export default function AppSidebarHydrationSafe({
  groups,
  showCoreAdmin,
  showTenantAdmin,
  showMasterDataAdmin,
}: {
  groups: SidebarGroupData[];
  showCoreAdmin: boolean;
  showTenantAdmin: boolean;
  showMasterDataAdmin: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <AppSidebarClient
      groups={groups}
      showCoreAdmin={showCoreAdmin}
      showTenantAdmin={showTenantAdmin}
      showMasterDataAdmin={showMasterDataAdmin}
    />
  );
}
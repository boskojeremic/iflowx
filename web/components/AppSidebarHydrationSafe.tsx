"use client";

import { useEffect, useState } from "react";
import AppSidebarClient from "./AppSidebarClient";
import type { SidebarGroupData } from "./AppSidebar";

export default function AppSidebarHydrationSafe({
  groups,
  showCoreAdmin,
}: {
  groups: SidebarGroupData[];
  showCoreAdmin: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // možeš vratiti skeleton ako hoćeš, ali null je najbrže
  if (!mounted) return null;

  return <AppSidebarClient groups={groups} showCoreAdmin={showCoreAdmin} />;
}
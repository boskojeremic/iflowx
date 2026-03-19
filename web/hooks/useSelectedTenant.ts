"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "coreAdminSelectedTenantId";

export function useSelectedTenant() {
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setSelectedTenantId(saved);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!selectedTenantId) return;
    localStorage.setItem(STORAGE_KEY, selectedTenantId);
  }, [selectedTenantId]);

  return {
    selectedTenantId,
    setSelectedTenantId,
  };
}
"use client";

import { useCallback, useEffect, useState } from "react";

export type TenantLite = {
  id: string;
  name: string;
  code: string;
  createdAt?: string;
};

type TenantsApiWrapped = { ok: boolean; tenants?: TenantLite[]; error?: string };
type TenantsApiRaw = TenantLite[];

function normalizeTenants(payload: unknown): TenantLite[] {
  // Case A: stari stil (array)
  if (Array.isArray(payload)) return payload as TenantLite[];

  // Case B: novi stil ({ ok, tenants })
  if (payload && typeof payload === "object") {
    const p = payload as TenantsApiWrapped;
    if (Array.isArray(p.tenants)) return p.tenants;
  }

  return [];
}

export function useTenants() {
  const [tenants, setTenants] = useState<TenantLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const r = await fetch("/api/admin/tenants", { cache: "no-store" });
      const data = (await r.json().catch(() => null)) as unknown;

      if (!r.ok) {
        const msg =
          data && typeof data === "object" && (data as any).error
            ? String((data as any).error)
            : `HTTP_${r.status}`;
        setTenants([]);
        setError(msg);
        return;
      }

      const list = normalizeTenants(data);
      setTenants(list);
    } catch (e: any) {
      setTenants([]);
      setError(e?.message ?? "FETCH_FAILED");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { tenants, loading, error, reload };
}
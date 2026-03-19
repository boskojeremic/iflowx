"use client";

import { useEffect, useMemo, useState } from "react";
import { useSelectedTenant } from "@/hooks/useSelectedTenant";

type Tenant = { id: string; name: string; code: string };

type TenantControlStats = {
  activeUsers: number;
  invitedUsers: number;
  activeAdmins: number;
  invitedAdmins: number;
};

type TenantControlModule = {
  id: string; // tenantModule id
  status: string; // "ACTIVE"
  startsAt: string | null;
  endsAt: string | null;
  seatLimit: number;
  module: { id: string; code: string; name: string; sortOrder: number };
};

type TenantControlIndustryGroup = {
  industry: { id: string; code: string; name: string; sortOrder: number };
  modules: TenantControlModule[];
};

type TenantControlResponse = {
  ok: boolean;
  error?: string;
  tenant?: Tenant;
  stats?: TenantControlStats;
  industries?: TenantControlIndustryGroup[];
};

function normalizeTenants(payload: any): Tenant[] {
  if (Array.isArray(payload)) return payload as Tenant[];
  if (payload && typeof payload === "object" && Array.isArray(payload.tenants)) {
    return payload.tenants as Tenant[];
  }
  return [];
}

function safeDate(iso?: string | null) {
  if (!iso) return null;
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? null : t;
}

function fmtDate(iso?: string | null) {
  const d = safeDate(iso);
  return d ? d.toLocaleDateString() : "-";
}

function daysLeft(isoEnd?: string | null) {
  const end = safeDate(isoEnd);
  if (!end) return null;
  return Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function isInPeriod(startsAt: string | null, endsAt: string | null) {
  const s = safeDate(startsAt);
  const e = safeDate(endsAt);
  if (!s || !e) return false;
  const now = Date.now();
  return now >= s.getTime() && now <= e.getTime();
}

export default function TenantControlPanel() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const {
    selectedTenantId: tenantId,
    setSelectedTenantId: setTenantId,
  } = useSelectedTenant();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [stats, setStats] = useState<TenantControlStats>({
    activeUsers: 0,
    invitedUsers: 0,
    activeAdmins: 0,
    invitedAdmins: 0,
  });
  const [industries, setIndustries] = useState<TenantControlIndustryGroup[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTenants() {
    const r = await fetch("/api/admin/tenants", { cache: "no-store" });
    const d = await r.json().catch(() => null);

    if (!r.ok) {
      throw new Error(d?.error ? String(d.error) : `TENANTS_HTTP_${r.status}`);
    }

    const list = normalizeTenants(d);
    setTenants(list);

    const savedTenantId =
      typeof window !== "undefined"
        ? localStorage.getItem("coreAdminSelectedTenantId")
        : "";

    if (savedTenantId && list.some((t) => t.id === savedTenantId)) {
      setTenantId(savedTenantId);
      return;
    }

    if (list[0]?.id) {
      setTenantId(list[0].id);
    }
  }

  async function loadTenantControl(tid: string) {
    setError("");

    const r = await fetch(
      `/api/admin/tenant-control?tenantId=${encodeURIComponent(tid)}`,
      { cache: "no-store" }
    );
    const d: TenantControlResponse | null = await r.json().catch(() => null);

    if (!r.ok || !d?.ok) {
      setTenant(null);
      setStats({
        activeUsers: 0,
        invitedUsers: 0,
        activeAdmins: 0,
        invitedAdmins: 0,
      });
      setIndustries([]);
      setError(d?.error ?? `TENANT_CONTROL_HTTP_${r.status}`);
      return;
    }

    setTenant(d.tenant ?? null);
    setStats(
      d.stats ?? {
        activeUsers: 0,
        invitedUsers: 0,
        activeAdmins: 0,
        invitedAdmins: 0,
      }
    );
    setIndustries(d.industries ?? []);
  }

  async function reloadAll() {
    try {
      setLoading(true);
      setError("");
      await loadTenants();
      if (tenantId) await loadTenantControl(tenantId);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await loadTenants();
      } catch (e: any) {
        setError(String(e?.message ?? e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!tenantId) return;

    (async () => {
      try {
        setLoading(true);
        await loadTenantControl(tenantId);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId]);

  const industriesActiveOnly = useMemo(() => {
    const filtered = (industries ?? [])
      .map((g) => {
        const ms = (g.modules ?? []).filter(
          (m) => m.status === "ACTIVE" && isInPeriod(m.startsAt, m.endsAt)
        );
        return { ...g, modules: ms };
      })
      .filter((g) => g.modules.length > 0);

    filtered.sort(
      (a, b) => (a.industry.sortOrder ?? 0) - (b.industry.sortOrder ?? 0)
    );

    for (const g of filtered) {
      g.modules.sort(
        (a, b) => (a.module.sortOrder ?? 0) - (b.module.sortOrder ?? 0)
      );
    }

    return filtered;
  }, [industries]);

  const selectedTenantLabel = useMemo(() => {
    const t = tenants.find((x) => x.id === tenantId);
    return t ? `${t.name} (${t.code})` : "—";
  }, [tenants, tenantId]);

  return (
    <div className="w-full text-white flex flex-col h-full min-h-0 gap-4">
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-semibold">Tenant Control</h2>
          <div className="text-sm text-white/60">
            Read-only licensing + tenant users overview (per module).
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-white/60">Tenant</div>
          <select
            className="h-9 border border-white/20 bg-black/30 rounded-md px-3"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            disabled={loading || tenants.length === 0}
          >
            {tenants.length === 0 ? (
              <option value="">{loading ? "Loading..." : "No tenants"}</option>
            ) : (
              tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))
            )}
          </select>

          <button
            onClick={reloadAll}
            className="h-9 px-3 bg-white/10 border border-white/15 rounded-md hover:bg-white/15 disabled:opacity-50"
            disabled={loading}
            title="Reload"
          >
            Reload
          </button>
        </div>
      </div>

      {error ? (
        <div className="border border-red-500/30 bg-red-500/10 rounded p-3 text-sm shrink-0">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="text-sm text-white/70">Selected</div>
          <div className="text-sm font-semibold text-white/80">
            {tenant ? `${tenant.name} (${tenant.code})` : selectedTenantLabel}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="text-xs text-white/50">Active Users</div>
            <div className="text-white/80 font-semibold">{stats.activeUsers}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="text-xs text-white/50">Invited Users</div>
            <div className="text-white/80 font-semibold">{stats.invitedUsers}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="text-xs text-white/50">Active Admins</div>
            <div className="text-white/80 font-semibold">{stats.activeAdmins}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="text-xs text-white/50">Invited Admins</div>
            <div className="text-white/80 font-semibold">{stats.invitedAdmins}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <div className="rounded-xl border border-white/10 overflow-hidden flex flex-col h-full">
          <div className="bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-wider text-white/50 shrink-0">
            Modules & Licenses (per Industry)
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-3 text-sm text-white/60">Loading…</div>
            ) : industriesActiveOnly.length === 0 ? (
              <div className="px-3 py-3 text-sm text-white/60">
                No active modules for the selected tenant (within current license period).
              </div>
            ) : (
              <div className="space-y-3 p-3">
                {industriesActiveOnly.map((g) => (
                  <div
                    key={g.industry.id}
                    className="rounded-lg border border-white/10 overflow-hidden"
                  >
                    <div className="flex items-center justify-between bg-white/[0.04] px-3 py-2">
                      <div className="text-sm font-semibold text-white/80">
                        {g.industry.name}{" "}
                        <span className="text-xs text-white/50">
                          ({g.industry.code})
                        </span>
                      </div>
                      <div className="text-xs text-white/50">
                        {g.modules.length} modules
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2 bg-white/[0.03] px-3 py-2 text-[11px] uppercase tracking-wider text-white/50">
                      <div className="col-span-5">Module</div>
                      <div className="col-span-2">Seat Limit</div>
                      <div className="col-span-2">Start</div>
                      <div className="col-span-2">End</div>
                      <div className="col-span-1 text-right">Days</div>
                    </div>

                    <div className="divide-y divide-white/10">
                      {g.modules.map((m) => {
                        const dl = daysLeft(m.endsAt);
                        const warn = dl !== null && dl < 15;

                        return (
                          <div
                            key={m.id}
                            className="grid grid-cols-12 gap-2 px-3 py-2 text-sm items-center"
                          >
                            <div className="col-span-5">
                              <div className="font-semibold text-white/85">
                                {m.module.name}
                              </div>
                              <div className="text-[11px] text-white/45">
                                {m.module.code}
                              </div>
                            </div>

                            <div className="col-span-2 text-white/80">
                              {m.seatLimit}
                            </div>
                            <div className="col-span-2 text-white/80">
                              {fmtDate(m.startsAt)}
                            </div>
                            <div className="col-span-2 text-white/80">
                              {fmtDate(m.endsAt)}
                            </div>

                            <div className="col-span-1 text-right">
                              {dl === null ? (
                                <span className="text-white/60">-</span>
                              ) : warn ? (
                                <span className="font-semibold text-red-300">
                                  {dl}
                                  <span className="ml-1">!</span>
                                </span>
                              ) : (
                                <span className="font-semibold text-white/80">
                                  {dl}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-3 py-2 text-[11px] text-white/40 border-t border-white/10 shrink-0">
            Rule: invited users/admins are not active. Modules are shown only if
            today is within license start/end. License warning: days left &lt; 15.
          </div>
        </div>
      </div>
    </div>
  );
}
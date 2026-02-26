"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminRowButton } from "@/components/core-admin/AdminButtons";

type Industry = { id: string; name: string; code: string };
type Tenant = { id: string; name: string; code: string };

type ModuleRow = {
  id: string;
  industryId: string;
  name: string;
  code: string;
  sortOrder: number;
  isActive: boolean;
};

type TenantModuleRow = {
  id: string;
  tenantId: string;
  moduleId: string;
  status: "ACTIVE" | "DISABLED";
  seatLimit: number;
  startsAt: string | null;
  endsAt: string | null;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// input[type=date] expects YYYY-MM-DD
function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromDateInputValue(v: string) {
  if (!v) return null;
  // interpret as local date 00:00
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function isTodayBetween(start: Date | null, end: Date | null) {
  if (!start || !end) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return today >= s && today <= e;
}

function yesterday() {
  const now = new Date();
  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  y.setDate(y.getDate() - 1);
  return y;
}

export default function LicensingPanel() {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [tenantModules, setTenantModules] = useState<TenantModuleRow[]>([]);

  const [industryId, setIndustryId] = useState<string>("");
  const [tenantId, setTenantId] = useState<string>("");

  const [busy, setBusy] = useState(false);

  async function loadIndustries() {
    const r = await fetch("/api/industries", { cache: "no-store" });
    const d = await r.json().catch(() => null);
    setIndustries(d?.industries ?? []);
    if (!industryId && d?.industries?.[0]?.id) setIndustryId(d.industries[0].id);
  }

  async function loadTenants() {
    const r = await fetch("/api/admin/tenants", { cache: "no-store" });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d?.ok) {
      toast.error("Tenants load failed", { description: d?.error ?? `HTTP ${r.status}` });
      setTenants([]);
      return;
    }
    setTenants(d.tenants ?? []);
    if (!tenantId && d?.tenants?.[0]?.id) setTenantId(d.tenants[0].id);
  }

  async function loadModulesByIndustry(indId: string) {
    if (!indId) {
      setModules([]);
      return;
    }
    const r = await fetch(`/api/modules?industryId=${encodeURIComponent(indId)}`, {
      cache: "no-store",
    });
    const d = await r.json().catch(() => null);
    const list: ModuleRow[] = d?.modules ?? [];
    setModules(list);
  }

  async function loadTenantModules(tid: string, indId: string) {
    if (!tid || !indId) {
      setTenantModules([]);
      return;
    }

    // server returns tenantModules only for modules in this industry (recommended)
    const r = await fetch(
      `/api/admin/tenant-modules?tenantId=${encodeURIComponent(tid)}&industryId=${encodeURIComponent(
        indId
      )}`,
      { cache: "no-store" }
    );
    const d = await r.json().catch(() => null);

    if (!r.ok || !d?.ok) {
      toast.error("Licensing load failed", { description: d?.error ?? `HTTP ${r.status}` });
      setTenantModules([]);
      return;
    }

    setTenantModules(d.tenantModules ?? []);
  }

  useEffect(() => {
    loadIndustries();
    loadTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (industryId) loadModulesByIndustry(industryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [industryId]);

  useEffect(() => {
    if (tenantId && industryId) loadTenantModules(tenantId, industryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, industryId]);

  // map for quick access
  const tmByModuleId = useMemo(() => {
    const m = new Map<string, TenantModuleRow>();
    for (const x of tenantModules) m.set(x.moduleId, x);
    return m;
  }, [tenantModules]);

  const rows = useMemo(() => {
    // render modules from selected industry, sorted by sortOrder then name
    return [...modules]
      .filter((x) => x.industryId === industryId)
      .sort((a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100) || a.name.localeCompare(b.name))
      .map((mod) => {
        const tm = tmByModuleId.get(mod.id) || null;

        const seatLimit = tm?.seatLimit ?? 1;
        const startsAt = tm?.startsAt ?? null;
        const endsAt = tm?.endsAt ?? null;
        const status = tm?.status ?? "DISABLED";

        // derived status (auto-enable when today in range)
        const s = startsAt ? new Date(startsAt) : null;
        const e = endsAt ? new Date(endsAt) : null;
        const shouldBeActive = isTodayBetween(s, e);

        return {
          mod,
          tm,
          seatLimit,
          startsAt,
          endsAt,
          status,
          derivedStatus: shouldBeActive ? "ACTIVE" : "DISABLED",
        };
      });
  }, [modules, industryId, tmByModuleId]);

  async function saveRow(moduleId: string, patch: Partial<TenantModuleRow>) {
    if (!tenantId) return;

    setBusy(true);
    try {
      const r = await fetch("/api/admin/tenant-modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          moduleId,
          ...patch,
        }),
      });

      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) {
        toast.error("Save failed", { description: d?.error ?? `HTTP ${r.status}` });
        return;
      }

      // refresh
      await loadTenantModules(tenantId, industryId);
    } finally {
      setBusy(false);
    }
  }

  async function onChangeSeat(moduleId: string, seatLimit: number) {
    await saveRow(moduleId, { seatLimit });
  }

  async function onChangeDates(moduleId: string, startsAt: Date | null, endsAt: Date | null) {
    // auto status
    const autoStatus = isTodayBetween(startsAt, endsAt) ? "ACTIVE" : "DISABLED";

    await saveRow(moduleId, {
      startsAt: startsAt ? startsAt.toISOString() : null,
      endsAt: endsAt ? endsAt.toISOString() : null,
      status: autoStatus,
    });
  }

  async function toggle(moduleId: string) {
    const tm = tmByModuleId.get(moduleId) || null;

    // If currently ACTIVE -> disable: set endsAt = yesterday, keep startsAt, set status DISABLED
    if (tm && tm.status === "ACTIVE") {
      const y = yesterday();
      const s = tm.startsAt ? new Date(tm.startsAt) : null;

      await saveRow(moduleId, {
        startsAt: s ? s.toISOString() : new Date().toISOString(),
        endsAt: y.toISOString(),
        status: "DISABLED",
      });
      return;
    }

    // If DISABLED -> enable
    // Ensure dates exist; if missing, set: start=today, end=+30d (you can change default)
    const now = new Date();
    const start = tm?.startsAt ? new Date(tm.startsAt) : now;
    const end = tm?.endsAt ? new Date(tm.endsAt) : (() => {
      const x = new Date(now);
      x.setDate(x.getDate() + 30);
      return x;
    })();

    const autoStatus = isTodayBetween(start, end) ? "ACTIVE" : "DISABLED";
    // user wants ENABLE now -> force ACTIVE, but only if today is within; otherwise keep DISABLED
    // (you can also force ACTIVE always, but this matches your "between dates" rule)
    await saveRow(moduleId, {
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      status: autoStatus,
    });
  }

  return (
    <div className="space-y-4 text-white">
      {/* Filters */}
      <div className="grid grid-cols-12 gap-2 items-center">
        <div className="col-span-12 md:col-span-5 flex items-center gap-2">
          <div className="text-xs text-white/60 w-[70px]">Industry</div>
          <select
            className="flex-1 px-3 py-2 bg-black/40 border border-white/20 rounded-md"
            value={industryId}
            onChange={(e) => setIndustryId(e.target.value)}
            disabled={busy}
          >
            {industries.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.code})
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-12 md:col-span-7 flex items-center gap-2">
          <div className="text-xs text-white/60 w-[70px]">Tenant</div>
          <select
            className="flex-1 px-3 py-2 bg-black/40 border border-white/20 rounded-md"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            disabled={busy}
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-white/[0.04] text-xs uppercase tracking-wider text-white/60">
          <div className="col-span-4">Module</div>
          <div className="col-span-2">Seat Limit</div>
          <div className="col-span-2">Start</div>
          <div className="col-span-2">End</div>
          <div className="col-span-2 text-right">Status</div>
        </div>

        {rows.map((r, idx) => {
          const tm = r.tm;

          const startVal = toDateInputValue(r.startsAt);
          const endVal = toDateInputValue(r.endsAt);

          // UI status: if today between dates => show ACTIVE, else show stored tm.status (but we also auto-save on date change)
          const showActive = r.derivedStatus === "ACTIVE" && (tm?.status !== "DISABLED");
          const statusLabel = showActive ? "ACTIVE" : "DISABLED";

          return (
            <div
              key={r.mod.id}
              className={[
                "grid grid-cols-12 gap-2 px-4 py-3 items-center",
                idx ? "border-t border-white/10" : "",
              ].join(" ")}
            >
              <div className="col-span-4 font-semibold">{r.mod.name}</div>

              <div className="col-span-2">
                <input
                  className="w-[80px] px-2 py-1 bg-black/40 border border-white/20 rounded"
                  value={String(r.seatLimit)}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isFinite(n)) return;
                    onChangeSeat(r.mod.id, Math.max(1, Math.trunc(n)));
                  }}
                  disabled={busy}
                  inputMode="numeric"
                />
              </div>

              <div className="col-span-2">
                <input
                  type="date"
                  className="w-full px-2 py-1 bg-black/40 border border-white/20 rounded"
                  value={startVal}
                  onChange={(ev) => {
                    const s = fromDateInputValue(ev.target.value);
                    const e = fromDateInputValue(endVal);
                    onChangeDates(r.mod.id, s, e);
                  }}
                  disabled={busy}
                />
              </div>

              <div className="col-span-2">
                <input
                  type="date"
                  className="w-full px-2 py-1 bg-black/40 border border-white/20 rounded"
                  value={endVal}
                  onChange={(e) => {
                    const s = fromDateInputValue(startVal);
                    const en = fromDateInputValue(e.target.value);
                    onChangeDates(r.mod.id, s, en);
                  }}
                  disabled={busy}
                />
              </div>

              <div className="col-span-2 flex justify-end">
                <AdminRowButton
                  onClick={() => toggle(r.mod.id)}
                  disabled={busy}
                  variant={statusLabel === "ACTIVE" ? "green" : undefined}
                >
                  {statusLabel}
                </AdminRowButton>
              </div>
            </div>
          );
        })}

        {rows.length === 0 && (
          <div className="p-4 text-sm text-white/60">No modules for selected Industry.</div>
        )}
      </div>
    </div>
  );
}
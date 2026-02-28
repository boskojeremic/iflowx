"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminRowButton } from "@/components/core-admin/AdminButtons";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromDateInputValue(v: string) {
  if (!v) return null;
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

  // ✅ confirm only for DISABLE (one-way)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ moduleId: string; moduleName: string } | null>(null);

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
    setModules((d?.modules ?? []) as ModuleRow[]);
  }

  async function loadTenantModules(tid: string, indId: string) {
    if (!tid || !indId) {
      setTenantModules([]);
      return;
    }

    const r = await fetch(
      `/api/admin/tenant-modules?tenantId=${encodeURIComponent(tid)}&industryId=${encodeURIComponent(indId)}`,
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

  const tmByModuleId = useMemo(() => {
    const m = new Map<string, TenantModuleRow>();
    for (const x of tenantModules) m.set(x.moduleId, x);
    return m;
  }, [tenantModules]);

  const rows = useMemo(() => {
    return [...modules]
      .filter((x) => x.industryId === industryId)
      .sort((a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100) || a.name.localeCompare(b.name))
      .map((mod) => {
        const tm = tmByModuleId.get(mod.id) || null;

        const seatLimit = tm?.seatLimit ?? 1;
        const startsAt = tm?.startsAt ?? null;
        const endsAt = tm?.endsAt ?? null;
        const status = tm?.status ?? "DISABLED";

        const s = startsAt ? new Date(startsAt) : null;
        const e = endsAt ? new Date(endsAt) : null;
        const derivedActive = isTodayBetween(s, e) ? "ACTIVE" : "DISABLED";

        return { mod, tm, seatLimit, startsAt, endsAt, status, derivedActive };
      });
  }, [modules, industryId, tmByModuleId]);

  async function saveRow(moduleId: string, patch: Partial<TenantModuleRow>) {
    if (!tenantId) return;

    setBusy(true);
    try {
      const r = await fetch("/api/admin/tenant-modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, moduleId, ...patch }),
      });

      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) {
        toast.error("Save failed", { description: d?.error ?? `HTTP ${r.status}` });
        return;
      }

      await loadTenantModules(tenantId, industryId);
    } finally {
      setBusy(false);
    }
  }

  async function onChangeSeat(moduleId: string, seatLimit: number) {
    await saveRow(moduleId, { seatLimit });
  }

  async function onChangeDates(moduleId: string, startsAt: Date | null, endsAt: Date | null) {
    // ✅ Active is driven ONLY by dates
    const autoStatus = isTodayBetween(startsAt, endsAt) ? "ACTIVE" : "DISABLED";

    await saveRow(moduleId, {
      startsAt: startsAt ? startsAt.toISOString() : null,
      endsAt: endsAt ? endsAt.toISOString() : null,
      status: autoStatus,
    });
  }

  async function disableByButton(moduleId: string) {
  const tm = tmByModuleId.get(moduleId) || null;

  const y = yesterday();
  const s = tm?.startsAt ? new Date(tm.startsAt) : new Date();

  await saveRow(moduleId, {
    startsAt: s.toISOString(),
    endsAt: y.toISOString(),
    status: "DISABLED",
  });

  toast.success("Module disabled", {
    description: "The module has been successfully disabled for this tenant.",
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

          // ✅ status shown is derived from dates (and saved on date change)
          const statusLabel = r.derivedActive as "ACTIVE" | "DISABLED";

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
                  onChange={(ev) => {
                    const s = fromDateInputValue(startVal);
                    const en = fromDateInputValue(ev.target.value);
                    onChangeDates(r.mod.id, s, en);
                  }}
                  disabled={busy}
                />
              </div>

              <div className="col-span-2 flex justify-end">
                <AdminRowButton
                  onClick={() => {
                    // ✅ one-way: only ACTIVE can be disabled by click
                    if (statusLabel !== "ACTIVE") {
                      toast.message("Info", {
                        description: "ACTIVE status se dobija samo promenom datuma (Start/End).",
                      });
                      return;
                    }

                    setConfirmTarget({ moduleId: r.mod.id, moduleName: r.mod.name });
                    setConfirmOpen(true);
                  }}
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

      {/* ✅ Confirm dialog */}
      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setConfirmTarget(null);
        }}
      >
        <AlertDialogContent className="border border-white/10 bg-[#0b0f0e] text-white shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Disable module?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Do you want to disable <b className="text-white">{confirmTarget?.moduleName}</b> for this tenant?
              <br />
                          </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border border-white/15 bg-white/5 text-white hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                if (!confirmTarget) return;
                await disableByButton(confirmTarget.moduleId);
                setConfirmOpen(false);
                setConfirmTarget(null);
              }}
            >
              Yes, disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
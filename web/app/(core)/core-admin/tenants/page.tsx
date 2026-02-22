"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Tenant = {
  id: string;
  name: string;
  code: string;
  seatLimit: number;
  licenseStartsAt: string | null;
  licenseEndsAt: string | null;
};

function toLocalInputValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function daysRemaining(isoEnd: string | null) {
  if (!isoEnd) return null;
  const now = new Date();
  const end = new Date(isoEnd);
  const ms = end.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setError("");
    setLoading(true);

    const r = await fetch("/api/admin/tenants", { cache: "no-store" });
    const d = await r.json().catch(() => null);

    if (!r.ok) {
      setError(`Failed to load tenants (HTTP ${r.status})`);
      setTenants([]);
      setLoading(false);
      return;
    }

    if (d?.ok) setTenants(d.tenants ?? []);
    else setError(d?.error ?? "Failed to load tenants.");

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveTenant(t: Tenant) {
    setError("");
    setSavingId(t.id);

    const r = await fetch("/api/admin/tenants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: t.id,
        seatLimit: Number(t.seatLimit),
        licenseStartsAt: t.licenseStartsAt,
        licenseEndsAt: t.licenseEndsAt,
      }),
    });

    const d = await r.json().catch(() => null);

    setSavingId(null);

    if (!r.ok || !d?.ok) {
      setError(d?.error ? String(d.error) : `Save failed (HTTP ${r.status})`);
      return;
    }

    await load();
  }

  async function deleteTenant(t: Tenant) {
    const ok = confirm(
      `DELETE tenant "${t.name}"?\n\nThis will remove ALL tenant data (assets, emitters, inputs, results, memberships, invites, etc.).`
    );
    if (!ok) return;

    setError("");
    setSavingId(t.id);

    const r = await fetch(
      `/api/admin/tenants?tenantId=${encodeURIComponent(t.id)}`,
      { method: "DELETE" }
    );

    const d = await r.json().catch(() => null);

    setSavingId(null);

    if (!r.ok || !d?.ok) {
      setError(d?.error ? String(d.error) : `Delete failed (HTTP ${r.status})`);
      return;
    }

    await load();
  }

  return (
    <div className="max-w-[1400px] mx-auto p-6 text-white space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Tenants</h1>
          <div className="text-sm text-white/60">
            Set seat limit and license validity per tenant.
          </div>
        </div>

        <Link
          href="/core-admin/tenants/new"
          className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700"
        >
          + Create Tenant
        </Link>
      </div>

      {error && (
        <div className="border border-red-500/30 bg-red-500/10 rounded p-3 text-sm">
          {error}
        </div>
      )}

      {loading && <p>Loading…</p>}

      {!loading && tenants.length === 0 && (
        <p className="opacity-70">No tenants yet.</p>
      )}

      {!loading && tenants.length > 0 && (
        <div className="border border-white/15 rounded overflow-hidden">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-white/5">
              <tr>
                <th className="p-3 text-left w-[32%]">Tenant</th>
                <th className="p-3 text-left w-[8%]">Code</th>
                <th className="p-3 text-left w-[10%]">Seat limit</th>
                <th className="p-3 text-left w-[16%]">Start</th>
                <th className="p-3 text-left w-[16%]">End</th>
                <th className="p-3 text-left w-[10%]">Remaining</th>
                <th className="p-3 text-right w-[8%] whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            <tbody>
              {tenants.map((t, idx) => {
                const remaining = daysRemaining(t.licenseEndsAt);

                return (
                  <tr key={t.id} className={idx ? "border-t border-white/10" : ""}>
                    <td className="p-3">
                      <div className="font-semibold leading-snug break-words">
                        {t.name}
                      </div>
                      <div className="text-[11px] text-white/40 truncate max-w-[520px]">
                        ID: {t.id}
                      </div>
                    </td>

                    <td className="p-3 font-medium">{t.code}</td>

                    <td className="p-3">
                      <input
                        className="w-20 border border-white/20 bg-black/30 rounded px-2 py-1"
                        type="number"
                        min={1}
                        value={t.seatLimit ?? 1}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setTenants((prev) =>
                            prev.map((x) => (x.id === t.id ? { ...x, seatLimit: v } : x))
                          );
                        }}
                      />
                    </td>

                    <td className="p-3">
                      <input
                        className="w-full border border-white/20 bg-black/30 rounded px-2 py-1"
                        type="datetime-local"
                        value={toLocalInputValue(t.licenseStartsAt)}
                        onChange={(e) => {
                          const iso = e.target.value
                            ? new Date(e.target.value).toISOString()
                            : null;
                          setTenants((prev) =>
                            prev.map((x) =>
                              x.id === t.id ? { ...x, licenseStartsAt: iso } : x
                            )
                          );
                        }}
                      />
                    </td>

                    <td className="p-3">
                      <input
                        className="w-full border border-white/20 bg-black/30 rounded px-2 py-1"
                        type="datetime-local"
                        value={toLocalInputValue(t.licenseEndsAt)}
                        onChange={(e) => {
                          const iso = e.target.value
                            ? new Date(e.target.value).toISOString()
                            : null;
                          setTenants((prev) =>
                            prev.map((x) => (x.id === t.id ? { ...x, licenseEndsAt: iso } : x))
                          );
                        }}
                      />
                    </td>

                    <td className="p-3">
                      {remaining === null ? (
                        <span className="text-white/50">—</span>
                      ) : remaining < 0 ? (
                        <span className="text-red-400">Expired</span>
                      ) : (
                        <span>{remaining} days</span>
                      )}
                    </td>

                    <td className="p-3 text-right whitespace-nowrap pl-25">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => saveTenant(t)}
                          disabled={savingId === t.id}
                          className="px-3 py-1 bg-white/10 border border-white/15 rounded hover:bg-white/15 disabled:opacity-50"
                        >
                          {savingId === t.id ? "Saving..." : "Save"}
                        </button>

                        <button
                          onClick={() => deleteTenant(t)}
                          disabled={savingId === t.id}
                          className="px-3 py-1 border border-red-500/40 text-red-200 rounded hover:bg-red-500/10 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
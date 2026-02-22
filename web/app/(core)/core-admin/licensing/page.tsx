"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Tenant = {
  id: string;
  name: string;
  code: string;
  seatLimit: number;
  licenseStartsAt: string | null;
  licenseEndsAt: string | null;
};

function daysRemaining(isoEnd: string | null) {
  if (!isoEnd) return null;
  const now = new Date();
  const end = new Date(isoEnd);
  const ms = end.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function LicensingDashboardPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

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

  const stats = useMemo(() => {
    const enriched = tenants.map((t) => ({
      ...t,
      remaining: daysRemaining(t.licenseEndsAt),
    }));

    const expired = enriched.filter((t) => t.remaining !== null && t.remaining < 0);
    const exp7 = enriched.filter((t) => t.remaining !== null && t.remaining >= 0 && t.remaining <= 7);
    const exp30 = enriched.filter((t) => t.remaining !== null && t.remaining >= 0 && t.remaining <= 30);
    const noEnd = enriched.filter((t) => !t.licenseEndsAt);

    const soonest = enriched
      .filter((t) => t.remaining !== null)
      .sort((a, b) => (a.remaining! - b.remaining!))
      .slice(0, 10);

    return { enriched, expired, exp7, exp30, noEnd, soonest };
  }, [tenants]);

  return (
    <div className="max-w-[1400px] mx-auto p-6 text-white space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Licensing Dashboard</h1>
          <div className="text-sm text-white/60">
            License status overview across tenants.
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={load}
            className="px-3 py-1 bg-white/10 border border-white/15 rounded hover:bg-white/15"
          >
            Refresh
          </button>
          <Link
            href="/core-admin/tenants"
            className="px-3 py-1 bg-white/10 border border-white/15 rounded hover:bg-white/15"
          >
            Manage Tenants
          </Link>
        </div>
      </div>

      {error && (
        <div className="border border-red-500/30 bg-red-500/10 rounded p-3 text-sm">
          {error}
        </div>
      )}

      {loading && <p>Loading…</p>}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="border border-white/15 rounded p-4 bg-white/5">
            <div className="text-xs text-white/60">Total tenants</div>
            <div className="text-2xl font-bold">{tenants.length}</div>
          </div>

          <div className="border border-white/15 rounded p-4 bg-white/5">
            <div className="text-xs text-white/60">Expired</div>
            <div className="text-2xl font-bold text-red-300">{stats.expired.length}</div>
          </div>

          <div className="border border-white/15 rounded p-4 bg-white/5">
            <div className="text-xs text-white/60">Expiring ≤ 7 days</div>
            <div className="text-2xl font-bold">{stats.exp7.length}</div>
          </div>

          <div className="border border-white/15 rounded p-4 bg-white/5">
            <div className="text-xs text-white/60">No end date</div>
            <div className="text-2xl font-bold">{stats.noEnd.length}</div>
          </div>
        </div>
      )}

      {!loading && stats.soonest.length > 0 && (
        <div className="border border-white/15 rounded overflow-hidden">
          <div className="p-3 bg-white/5 font-semibold">Next expiring</div>
          <table className="w-full text-sm table-fixed">
            <thead className="bg-white/5">
              <tr>
                <th className="p-3 text-left w-[40%]">Tenant</th>
                <th className="p-3 text-left w-[10%]">Code</th>
                <th className="p-3 text-left w-[20%]">End</th>
                <th className="p-3 text-left w-[15%]">Remaining</th>
                <th className="p-3 text-right w-[15%]">Action</th>
              </tr>
            </thead>
            <tbody>
              {stats.soonest.map((t, idx) => (
                <tr key={t.id} className={idx ? "border-t border-white/10" : ""}>
                  <td className="p-3">
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-[11px] text-white/40 truncate">ID: {t.id}</div>
                  </td>
                  <td className="p-3">{t.code}</td>
                  <td className="p-3">{t.licenseEndsAt ?? "—"}</td>
                  <td className="p-3">
                    {t.remaining === null ? "—" : t.remaining < 0 ? "Expired" : `${t.remaining} days`}
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href="/core-admin/tenants"
                      className="px-3 py-1 bg-white/10 border border-white/15 rounded hover:bg-white/15"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
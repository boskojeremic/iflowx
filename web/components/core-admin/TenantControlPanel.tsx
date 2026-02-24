"use client";

import { useEffect, useMemo, useState } from "react";

type Tenant = { id: string; name: string; code: string };
type MemberRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

type Member = {
  id: string; // membership id
  tenantId: string;
  role: MemberRole;
  status: "INVITED" | "ACTIVE" | "DISABLED";
  user: { id: string; email: string; name: string | null; isSuperAdmin: boolean };
};

export default function TenantControlPanel() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState<string>("");

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadTenants() {
    const r = await fetch("/api/admin/tenants", { cache: "no-store" });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d?.ok) throw new Error(d?.error ?? `Failed (HTTP ${r.status})`);

    const list: Tenant[] = d.tenants ?? [];
    setTenants(list);

    if (!tenantId && list[0]?.id) setTenantId(list[0].id);
  }

  async function loadMembers(tid: string) {
    setError("");
    setLoading(true);

    const r = await fetch(`/api/admin/memberships?tenantId=${encodeURIComponent(tid)}`, {
      cache: "no-store",
    });
    const d = await r.json().catch(() => null);

    if (!r.ok || !d?.ok) {
      setMembers([]);
      setError(d?.error ?? `Failed (HTTP ${r.status})`);
      setLoading(false);
      return;
    }

    setMembers(d.members ?? []);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      try {
        await loadTenants();
      } catch (e: any) {
        setError(String(e?.message ?? e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tenantId) loadMembers(tenantId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const admins = useMemo(
    () => members.filter((m) => m.role === "ADMIN" || m.role === "OWNER"),
    [members]
  );

  async function sendAdminInvite() {
    if (!tenantId) return;

    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setError("Enter admin email.");
      return;
    }

    setError("");
    setSaving(true);

    const r = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId,
        email,
        role: "ADMIN" as MemberRole,
      }),
    });

    const d = await r.json().catch(() => null);

    setSaving(false);

    if (!r.ok || !d?.ok) {
      setError(d?.error ?? `Invite failed (HTTP ${r.status})`);
      return;
    }

    setInviteEmail("");
    await loadMembers(tenantId);
  }

  return (
    <div className="w-full text-white space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Tenant Control</h2>
          <div className="text-sm text-white/60">
            Super Admin: assign Tenant Admins (invites only).
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-white/60">Tenant</div>
          <select
            className="border border-white/20 bg-black/30 rounded px-3 py-2"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.code})
              </option>
            ))}
          </select>

          <button
            onClick={() => tenantId && loadMembers(tenantId)}
            className="px-3 py-2 bg-white/10 border border-white/15 rounded hover:bg-white/15"
            disabled={!tenantId || saving}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-red-500/30 bg-red-500/10 rounded p-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="space-y-4">
          <div className="border border-white/15 rounded p-4 bg-white/5">
            <div className="font-semibold mb-2">Invite Tenant Admin</div>

            <div className="flex flex-col md:flex-row gap-2">
              <input
                className="flex-1 border border-white/20 bg-black/30 rounded px-3 py-2"
                placeholder="admin@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />

              <button
                onClick={sendAdminInvite}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? "Sending…" : "Send Admin Invite"}
              </button>
            </div>

            <div className="text-xs text-white/50 mt-2">
              Super Admin invites only Tenant Admins. Tenant Admin will manage users inside tenant.
            </div>
          </div>

          <div className="border border-white/15 rounded overflow-hidden">
            <div className="p-3 bg-white/5 font-semibold">
              Current Tenant Admins ({admins.length})
            </div>

            <table className="w-full text-sm table-fixed">
              <thead className="bg-white/5">
                <tr>
                  <th className="p-3 text-left w-[60%]">User</th>
                  <th className="p-3 text-left w-[20%]">Role</th>
                  <th className="p-3 text-left w-[20%]">Status</th>
                </tr>
              </thead>

              <tbody>
                {admins.map((m, idx) => (
                  <tr key={m.id} className={idx ? "border-t border-white/10" : ""}>
                    <td className="p-3">
                      <div className="font-semibold">{m.user.name ?? m.user.email}</div>
                      <div className="text-[11px] text-white/50">{m.user.email}</div>
                    </td>
                    <td className="p-3">{m.role}</td>
                    <td className="p-3">{m.status}</td>
                  </tr>
                ))}

                {admins.length === 0 && (
                  <tr>
                    <td className="p-3 text-white/60" colSpan={3}>
                      No admins assigned yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
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

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
  createdAt: string;
};

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeTenants(payload: any): Tenant[] {
  // podrži oba oblika: [..] ili {ok:true, tenants:[..]}
  if (Array.isArray(payload)) return payload as Tenant[];
  if (payload && typeof payload === "object" && Array.isArray(payload.tenants)) return payload.tenants as Tenant[];
  return [];
}

export default function TenantControlPanel() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState<string>("");

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const [saving, setSaving] = useState(false);

  async function loadTenants() {
    // ✅ FIX: pravi endpoint
    const r = await fetch("/api/admin/tenants", { cache: "no-store" });
    const d = await r.json().catch(() => null);

    if (!r.ok) throw new Error((d && d.error) ? String(d.error) : `TENANTS_HTTP_${r.status}`);

    // podrži oba shapa
    const list = normalizeTenants(d);

    // ako API vraća {ok:false,...}
    if (d && typeof d === "object" && "ok" in d && d.ok === false) {
      throw new Error(d?.error ?? "TENANTS_API_FAIL");
    }

    setTenants(list);

    // auto-select prvog tenant-a
    if (!tenantId && list[0]?.id) setTenantId(list[0].id);
  }

  async function loadMembers(tid: string) {
    setError("");
    setLoading(true);

    // ✅ FIX: pravi endpoint
    const r = await fetch(`/api/admin/memberships?tenantId=${encodeURIComponent(tid)}`, {
      cache: "no-store",
    });
    const d = await r.json().catch(() => null);

    if (!r.ok || !d?.ok) {
      setMembers([]);
      setError(d?.error ?? `MEMBERSHIPS_HTTP_${r.status}`);
      setLoading(false);
      return;
    }

    setMembers(d.members ?? []);
    setLoading(false);
  }

  async function loadUsers() {
    // ✅ FIX: pravi endpoint (ako ti je core-admin/users ostao, ostavi ga,
    // ali po tvojoj novoj strukturi je /api/core-admin/users)
    const res = await fetch("/api/core-admin/users", { cache: "no-store" });
    const text = await res.text();
    const ct = res.headers.get("content-type") || "";

    if (!res.ok) {
      const j = safeJson(text);
      throw new Error(j?.error ? String(j.error) : `USERS_HTTP_${res.status}`);
    }
    if (!ct.includes("application/json")) {
      throw new Error("USERS_API_NOT_JSON");
    }

    const data = JSON.parse(text);
    const list: UserRow[] = data?.users ?? [];
    setUsers(list);

    if (!selectedUserId && list.length) {
      const firstNonSA = list.find((u) => !u.isSuperAdmin);
      setSelectedUserId((firstNonSA ?? list[0]).id);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await loadTenants();
        await loadUsers();
      } catch (e: any) {
        setError(String(e?.message ?? e));
      } finally {
        setLoading(false);
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

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  async function sendAdminInvite() {
    if (!tenantId) return;

    if (!selectedUserId || !selectedUser?.email) {
      setError("Select a user.");
      return;
    }

    const email = selectedUser.email.trim().toLowerCase();
    if (!email) {
      setError("Selected user has no email.");
      return;
    }

    setError("");
    setSaving(true);

    // ✅ FIX: pravi endpoint
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
      setError(d?.error ?? `INVITE_HTTP_${r.status}`);
      return;
    }

    await loadMembers(tenantId);
  }

  async function hardReloadAll() {
    try {
      setError("");
      setLoading(true);
      await loadTenants();
      if (tenantId) await loadMembers(tenantId);
      await loadUsers();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
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
            className="h-9 border border-white/20 bg-black/30 rounded-md px-3"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            disabled={loading || saving}
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
            onClick={() => tenantId && loadMembers(tenantId)}
            className="h-9 px-3 bg-white/10 border border-white/15 rounded-md hover:bg-white/15 disabled:opacity-50"
            disabled={!tenantId || saving || loading}
          >
            Refresh
          </button>

          <button
            onClick={hardReloadAll}
            className="h-9 px-3 bg-white/10 border border-white/15 rounded-md hover:bg-white/15 disabled:opacity-50"
            disabled={saving || loading}
            title="Reload tenants + members + users"
          >
            Reload
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

            <div className="flex flex-col md:flex-row gap-2 items-stretch">
              <select
                className="h-9 flex-1 border border-white/20 bg-black/30 rounded-md px-3"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={saving}
              >
                {users.length === 0 ? (
                  <option value="">No users</option>
                ) : (
                  users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {(u.name ? `${u.name} — ` : "")}
                      {u.email}
                      {u.isSuperAdmin ? " (SUPER)" : ""}
                    </option>
                  ))
                )}
              </select>

              <button
                onClick={sendAdminInvite}
                disabled={saving || !selectedUserId || !tenantId}
                className="h-9 px-4 bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? "Sending…" : "Send Admin Invite"}
              </button>
            </div>

            {selectedUser ? (
              <div className="text-xs text-white/50 mt-2">
                Selected: <span className="text-white/70">{selectedUser.email}</span>
              </div>
            ) : null}

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
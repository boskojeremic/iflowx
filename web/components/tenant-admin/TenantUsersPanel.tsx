"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import DeleteConfirm from "@/components/DeleteConfirm";

type MemberRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

type Tenant = { id: string; name: string; code: string };

type OperationalFunctionOption = {
  id: string;
  name: string;
  abbreviation: string;
};

type MembershipLite = {
  tenantId: string;
  role: MemberRole;
  status: "INVITED" | "ACTIVE" | "DISABLED";
  operationalFunctionId?: string | null;
  operationalFunctionName?: string | null;
  tenant?: { id: string; name: string; code: string };
};

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
  createdAt: string;
  memberships?: MembershipLite[];
};

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function membershipInTenant(u: UserRow, tenantId: string) {
  const ms = u.memberships ?? [];
  return ms.find((m) => m.tenantId === tenantId) ?? null;
}

function statusInTenant(
  u: UserRow,
  tenantId: string
): "ACTIVE" | "INVITED" | null {
  if (!tenantId) return null;
  const m = membershipInTenant(u, tenantId);
  if (!m) return null;
  if (m.status === "ACTIVE") return "ACTIVE";
  if (m.status === "INVITED") return "INVITED";
  return null;
}

function splitName(fullName: string | null | undefined) {
  const clean = String(fullName ?? "").trim().replace(/\s+/g, " ");
  if (!clean) return { firstName: "", lastName: "" };

  const parts = clean.split(" ");
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.slice(-1).join(""),
  };
}

function joinName(firstName: string, lastName: string) {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim();
}

async function postInvite(
  tenantId: string,
  email: string,
  name?: string | null,
  role: MemberRole = "VIEWER"
) {
  const r = await fetch("/api/admin/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tenantId,
      email,
      name: name?.trim() || null,
      role,
    }),
  });

  const d = await r.json().catch(() => null);
  if (!r.ok || !d?.ok) throw new Error(d?.error ?? `INVITE_HTTP_${r.status}`);
  return d;
}

export default function TenantUsersPanel() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [operationalFunctions, setOperationalFunctions] = useState<
    OperationalFunctionOption[]
  >([]);

  const tenantId = tenant?.id ?? "";

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [memberRole, setMemberRole] = useState<MemberRole>("VIEWER");
  const [operationalFunctionId, setOperationalFunctionId] = useState("");

  const [search, setSearch] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [inviteSent, setInviteSent] = useState<Record<string, boolean>>({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<MemberRole>("VIEWER");
  const [editOperationalFunctionId, setEditOperationalFunctionId] =
    useState("");

  const editingRow = useMemo(
    () => (editingId ? rows.find((r) => r.id === editingId) : null),
    [editingId, rows]
  );

  const tenantUsers = useMemo(() => {
    if (!tenantId) return [];

    const base = rows.filter((u) => {
      if (u.isSuperAdmin) return false;
      const m = membershipInTenant(u, tenantId);
      return !!m && (m.status === "ACTIVE" || m.status === "INVITED");
    });

    const q = search.trim().toLowerCase();
    if (!q) return base;

    return base.filter((u) => {
      const m = membershipInTenant(u, tenantId);
      return [
        u.name ?? "",
        u.email ?? "",
        m?.role ?? "",
        m?.status ?? "",
        m?.operationalFunctionName ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, tenantId, search]);

  const tenantAdmins = useMemo(() => {
    return tenantUsers.filter((u) => {
      const m = membershipInTenant(u, tenantId);
      return m?.role === "OWNER" || m?.role === "ADMIN";
    });
  }, [tenantUsers, tenantId]);

  const regularUsers = useMemo(() => {
    return tenantUsers.filter((u) => {
      const m = membershipInTenant(u, tenantId);
      return m?.role === "EDITOR" || m?.role === "VIEWER";
    });
  }, [tenantUsers, tenantId]);

  function selectedTenantLabel() {
    return tenant ? `${tenant.name} (${tenant.code})` : "—";
  }

  async function loadUsers(silent?: boolean) {
    if (!silent) setErr(null);
    setBusy(true);

    try {
      const res = await fetch(`/api/tenant-admin/users`, {
        cache: "no-store",
      });

      const text = await res.text();
      const ct = res.headers.get("content-type") || "";

      if (!res.ok) {
        const j = safeJson(text);
        setRows([]);
        setTenant(null);
        setOperationalFunctions([]);
        const msg = j?.error ? `${j.error}` : `USERS_API_${res.status}`;
        setErr(msg);
        if (!silent) toast.error(msg);
        return;
      }

      if (!ct.includes("application/json")) {
        setRows([]);
        setTenant(null);
        setOperationalFunctions([]);
        const msg = "USERS_API_NOT_JSON";
        setErr(msg);
        if (!silent) toast.error(msg);
        return;
      }

      const data = JSON.parse(text);
      setRows(data.users ?? []);
      setTenant(data.tenant ?? null);
      setOperationalFunctions(data.operationalFunctions ?? []);
    } finally {
      setBusy(false);
    }
  }

  async function addUser() {
    const e = email.trim().toLowerCase();
    const n = joinName(firstName, lastName) || null;

    if (!firstName.trim()) return toast.error("FIRST_NAME_REQUIRED");
    if (!lastName.trim()) return toast.error("SECOND_NAME_REQUIRED");
    if (!e) return toast.error("EMAIL_REQUIRED");
    if (!tenantId) return toast.error("TENANT_NOT_RESOLVED");

    setErr(null);
    setBusy(true);

    try {
      const res = await fetch(`/api/tenant-admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: e,
          name: n,
          role: memberRole,
          operationalFunctionId: operationalFunctionId || null,
        }),
      });

      const text = await res.text();

      if (!res.ok) {
        const j = safeJson(text);
        const code = j?.code;
        const msg =
          code === "P2002"
            ? "EMAIL_ALREADY_EXISTS"
            : j?.error
              ? `${j.error}`
              : `ADD_USER_${res.status}`;
        setErr(msg);
        toast.error(msg);
        return;
      }

      try {
        await postInvite(tenantId, e, n, memberRole);
        toast.success(`User created + Invite sent (${selectedTenantLabel()})`);
      } catch (invErr: any) {
        const msg = invErr?.message ?? "INVITE_FAILED";
        setErr(msg);
        toast.error(`User created, but invite failed: ${msg}`);
      }

      setEmail("");
      setFirstName("");
      setLastName("");
      setMemberRole("VIEWER");
      setOperationalFunctionId("");

      await loadUsers(true);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(u: UserRow) {
    setErr(null);
    setEditingId(u.id);

    const parts = splitName(u.name);
    setEditFirstName(parts.firstName);
    setEditLastName(parts.lastName);
    setEditEmail(u.email ?? "");
    setEditRole(membershipInTenant(u, tenantId)?.role ?? "VIEWER");
    setEditOperationalFunctionId(
      membershipInTenant(u, tenantId)?.operationalFunctionId ?? ""
    );
  }

  function cancelEdit() {
    setErr(null);
    setEditingId(null);
    setEditFirstName("");
    setEditLastName("");
    setEditEmail("");
    setEditRole("VIEWER");
    setEditOperationalFunctionId("");
  }

  async function saveEdit(id: string) {
    const e = editEmail.trim().toLowerCase();
    const n = joinName(editFirstName, editLastName) || null;

    if (!editFirstName.trim()) {
      setErr("FIRST_NAME_REQUIRED");
      return toast.error("FIRST_NAME_REQUIRED");
    }

    if (!editLastName.trim()) {
      setErr("SECOND_NAME_REQUIRED");
      return toast.error("SECOND_NAME_REQUIRED");
    }

    if (!e) {
      setErr("EMAIL_REQUIRED");
      return toast.error("EMAIL_REQUIRED");
    }

    setErr(null);
    setBusy(true);

    try {
      const res = await fetch(`/api/tenant-admin/users/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: n,
          email: e,
          role: editRole,
          operationalFunctionId: editOperationalFunctionId || null,
        }),
      });

      const text = await res.text();

      if (!res.ok) {
        const j = safeJson(text);
        const msg = j?.error ? `${j.error}` : `EDIT_USER_${res.status}`;
        setErr(msg);
        toast.error(msg);
        return;
      }

      toast.success("User updated");
      cancelEdit();
      await loadUsers(true);
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(id: string) {
    setErr(null);
    setBusy(true);

    try {
      const res = await fetch(`/api/tenant-admin/users/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      const text = await res.text();

      if (!res.ok) {
        const j = safeJson(text);
        const msg = j?.error ? `${j.error}` : `DELETE_USER_${res.status}`;
        setErr(msg);
        toast.error(msg);
        return;
      }

      if (editingId === id) cancelEdit();
      toast.success("User removed from tenant");
      await loadUsers(true);
    } finally {
      setBusy(false);
    }
  }

  async function resendInvite(u: UserRow) {
    if (!tenantId) return toast.error("TENANT_NOT_RESOLVED");

    const m = membershipInTenant(u, tenantId);
    const targetRole = m?.role ?? "VIEWER";
    const targetEmail = u.email.trim().toLowerCase();
    const targetName = u.name ?? null;

    const key = `${u.id}:${tenantId}`;

    setInviteSent((p) => ({ ...p, [key]: true }));
    setBusy(true);
    setErr(null);

    try {
      await postInvite(tenantId, targetEmail, targetName, targetRole);

      setInviteSent((p) => {
        const n = { ...p };
        delete n[key];
        return n;
      });

      toast.success(`Invite sent (${selectedTenantLabel()})`);
      await loadUsers(true);
    } catch (e: any) {
      setInviteSent((p) => {
        const n = { ...p };
        delete n[key];
        return n;
      });

      const msg = e?.message ?? "INVITE_FAILED";
      setErr(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadUsers(true);
  }, []);

  return (
    <div className="space-y-4">
      <div className="text-sm text-white/70">
        Tenant users for the logged-in tenant. Admins are grouped separately above regular users.
      </div>

      {err ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-wider text-white/50">
            Tenant
          </div>
          <div className="h-10 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-white/80 flex items-center">
            {selectedTenantLabel()}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-2">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-white/50">
              First Name
            </div>
            <input
              className="h-10 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm outline-none"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addUser()}
              disabled={busy}
            />
          </div>

          <div className="col-span-2">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-white/50">
              Second Name
            </div>
            <input
              className="h-10 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm outline-none"
              placeholder="Second Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addUser()}
              disabled={busy}
            />
          </div>

          <div className="col-span-3">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-white/50">
              Email
            </div>
            <input
              className="h-10 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm outline-none"
              placeholder="email@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addUser()}
              disabled={busy}
            />
          </div>

          <div className="col-span-2">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-white/50">
              Access Role
            </div>
            <select
              className="h-10 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-white/80 outline-none"
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value as MemberRole)}
              disabled={busy}
            >
              <option value="OWNER">OWNER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="EDITOR">EDITOR</option>
              <option value="VIEWER">VIEWER</option>
            </select>
          </div>

          <div className="col-span-2">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-white/50">
              Operational Function
            </div>
            <select
              className="h-10 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-white/80 outline-none"
              value={operationalFunctionId}
              onChange={(e) => setOperationalFunctionId(e.target.value)}
              disabled={busy}
            >
              <option value="">Select Operational Function</option>
              {operationalFunctions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-1 flex justify-end">
            <button
              onClick={addUser}
              disabled={busy || !tenantId}
              className="h-10 w-full rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-wider text-white/50">
          Tenant Admins ({selectedTenantLabel()})
        </div>

        <div className="px-3 py-3 border-b border-white/10 bg-white/[0.02]">
          <input
            className="h-10 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm outline-none"
            placeholder="Search users by name, email, role, function or status"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={busy}
          />
        </div>

        <div className="grid grid-cols-12 gap-2 bg-white/[0.04] px-3 py-2 text-xs uppercase tracking-wider text-white/50">
          <div className="col-span-3">Name</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Access Role</div>
          <div className="col-span-2">Operational Function</div>
          <div className="col-span-2 text-center">Actions</div>
        </div>

        <div className="max-h-[220px] overflow-y-auto divide-y divide-white/10 pb-2">
          {tenantAdmins.map((u) => {
            const isEditing = editingId === u.id;
            const st = statusInTenant(u, tenantId);
            const m = membershipInTenant(u, tenantId);
            const inviteKey = `${u.id}:${tenantId}`;
            const justSent = !!inviteSent[inviteKey];

            return (
              <div
                key={u.id}
                className="grid grid-cols-12 gap-2 px-3 py-2 text-sm items-center"
              >
                <div className="col-span-3 text-white/80">
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        disabled={busy}
                        autoFocus
                        placeholder="First Name"
                      />
                      <input
                        className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        disabled={busy}
                        placeholder="Second Name"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="truncate">{u.name ?? "-"}</span>
                      <span className="text-xs text-white/40">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="col-span-3 text-white/80">
                  {isEditing ? (
                    <input
                      className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      disabled={busy}
                      placeholder="email@company.com"
                    />
                  ) : (
                    <div className="truncate">{u.email}</div>
                  )}
                </div>

                <div className="col-span-2 text-white/60">
                  {isEditing ? (
                    <select
                      className="h-9 w-full rounded-md border border-white/10 bg-white/[0.04] px-2 text-sm text-white/80 outline-none"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as MemberRole)}
                      disabled={busy}
                    >
                      <option value="OWNER">OWNER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="EDITOR">EDITOR</option>
                      <option value="VIEWER">VIEWER</option>
                    </select>
                  ) : (
                    <div className="truncate">{m?.role ?? "-"}</div>
                  )}
                </div>

                <div className="col-span-2 text-white/60">
                  {isEditing ? (
                    <select
                      className="h-9 w-full rounded-md border border-white/10 bg-white/[0.04] px-2 text-sm text-white/80 outline-none"
                      value={editOperationalFunctionId}
                      onChange={(e) => setEditOperationalFunctionId(e.target.value)}
                      disabled={busy}
                    >
                      <option value="">Select Operational Function</option>
                      {operationalFunctions.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="truncate">{m?.operationalFunctionName ?? "-"}</div>
                  )}
                </div>

                <div className="col-span-2 flex justify-center gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => saveEdit(u.id)}
                        disabled={busy}
                        className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={busy}
                        className="h-9 rounded-md border border-white/15 bg-white/10 px-4 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      {st === "ACTIVE" ? (
                        <div className="h-9 px-3 flex items-center justify-center rounded-md border border-white/10 bg-transparent">
                          <span className="text-[12px] font-semibold tracking-wide text-emerald-300">
                            ACTIVE
                          </span>
                        </div>
                      ) : st === "INVITED" || justSent ? (
                        <div className="h-9 px-3 flex items-center justify-center rounded-md border border-white/10 bg-transparent">
                          <span className="text-[11px] font-semibold leading-3 text-white/80 text-center">
                            INVITE
                            <br />
                            SENT
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => resendInvite(u)}
                          disabled={busy}
                          className="h-9 rounded-md bg-purple-600 px-4 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                        >
                          Invite
                        </button>
                      )}

                      <button
                        onClick={() => startEdit(u)}
                        disabled={busy}
                        className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Edit
                      </button>

                      <DeleteConfirm
                        title="Remove Admin From Tenant?"
                        description={`This will remove "${u.email}" from this tenant.`}
                        onConfirm={() => deleteUser(u.id)}
                        trigger={
                          <button
                            disabled={busy || editingId === u.id}
                            className="h-9 rounded-md bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        }
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {tenantAdmins.length === 0 && (
            <div className="px-3 py-3 text-sm text-white/50">
              No tenant admins found.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-wider text-white/50">
          Tenant Users ({selectedTenantLabel()})
        </div>

        <div className="grid grid-cols-12 gap-2 bg-white/[0.04] px-3 py-2 text-xs uppercase tracking-wider text-white/50">
          <div className="col-span-3">Name</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Access Role</div>
          <div className="col-span-2">Operational Function</div>
          <div className="col-span-2 text-center">Actions</div>
        </div>

        <div className="max-h-[280px] overflow-y-auto divide-y divide-white/10 pb-2">
          {regularUsers.map((u) => {
            const isEditing = editingId === u.id;
            const st = statusInTenant(u, tenantId);
            const m = membershipInTenant(u, tenantId);
            const inviteKey = `${u.id}:${tenantId}`;
            const justSent = !!inviteSent[inviteKey];

            return (
              <div
                key={u.id}
                className="grid grid-cols-12 gap-2 px-3 py-2 text-sm items-center"
              >
                <div className="col-span-3 text-white/80">
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        disabled={busy}
                        autoFocus
                        placeholder="First Name"
                      />
                      <input
                        className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        disabled={busy}
                        placeholder="Second Name"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="truncate">{u.name ?? "-"}</span>
                      <span className="text-xs text-white/40">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="col-span-3 text-white/80">
                  {isEditing ? (
                    <input
                      className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      disabled={busy}
                      placeholder="email@company.com"
                    />
                  ) : (
                    <div className="truncate">{u.email}</div>
                  )}
                </div>

                <div className="col-span-2 text-white/60">
                  {isEditing ? (
                    <select
                      className="h-9 w-full rounded-md border border-white/10 bg-white/[0.04] px-2 text-sm text-white/80 outline-none"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as MemberRole)}
                      disabled={busy}
                    >
                      <option value="OWNER">OWNER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="EDITOR">EDITOR</option>
                      <option value="VIEWER">VIEWER</option>
                    </select>
                  ) : (
                    <div className="truncate">{m?.role ?? "-"}</div>
                  )}
                </div>

                <div className="col-span-2 text-white/60">
                  {isEditing ? (
                    <select
                      className="h-9 w-full rounded-md border border-white/10 bg-white/[0.04] px-2 text-sm text-white/80 outline-none"
                      value={editOperationalFunctionId}
                      onChange={(e) => setEditOperationalFunctionId(e.target.value)}
                      disabled={busy}
                    >
                      <option value="">Select Operational Function</option>
                      {operationalFunctions.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="truncate">{m?.operationalFunctionName ?? "-"}</div>
                  )}
                </div>

                <div className="col-span-2 flex justify-center gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => saveEdit(u.id)}
                        disabled={busy}
                        className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={busy}
                        className="h-9 rounded-md border border-white/15 bg-white/10 px-4 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      {st === "ACTIVE" ? (
                        <div className="h-9 px-3 flex items-center justify-center rounded-md border border-white/10 bg-transparent">
                          <span className="text-[12px] font-semibold tracking-wide text-emerald-300">
                            ACTIVE
                          </span>
                        </div>
                      ) : st === "INVITED" || justSent ? (
                        <div className="h-9 px-3 flex items-center justify-center rounded-md border border-white/10 bg-transparent">
                          <span className="text-[11px] font-semibold leading-3 text-white/80 text-center">
                            INVITE
                            <br />
                            SENT
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => resendInvite(u)}
                          disabled={busy}
                          className="h-9 rounded-md bg-purple-600 px-4 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                        >
                          Invite
                        </button>
                      )}

                      <button
                        onClick={() => startEdit(u)}
                        disabled={busy}
                        className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Edit
                      </button>

                      <DeleteConfirm
                        title="Remove User From Tenant?"
                        description={`This will remove "${u.email}" from this tenant.`}
                        onConfirm={() => deleteUser(u.id)}
                        trigger={
                          <button
                            disabled={busy || editingId === u.id}
                            className="h-9 rounded-md bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        }
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {regularUsers.length === 0 && (
            <div className="px-3 py-3 text-sm text-white/50">
              No regular users found.
            </div>
          )}
        </div>
      </div>

      {editingRow ? (
        <div className="text-xs text-white/40">
          Editing: <span className="text-white/70">{editingRow.email}</span>
        </div>
      ) : null}
    </div>
  );
}
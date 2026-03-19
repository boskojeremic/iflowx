"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import DeleteConfirm from "@/components/DeleteConfirm";
import { useSelectedTenant } from "@/hooks/useSelectedTenant";

type UserType = "TENANT_ADMIN" | "CORE_ADMIN";
type MemberRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

type Tenant = { id: string; name: string; code: string };

type MembershipLite = {
  tenantId: string;
  role: MemberRole;
  status: "INVITED" | "ACTIVE" | "DISABLED";
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

function normalizeTenants(payload: any): Tenant[] {
  if (Array.isArray(payload)) return payload as Tenant[];
  if (payload && typeof payload === "object" && Array.isArray(payload.tenants)) {
    return payload.tenants as Tenant[];
  }
  return [];
}

function deriveType(u: UserRow): UserType {
  return u.isSuperAdmin ? "CORE_ADMIN" : "TENANT_ADMIN";
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

async function postInvite(tenantId: string, email: string, name?: string | null) {
  const r = await fetch("/api/admin/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tenantId,
      email,
      name: name?.trim() || null,
      role: "ADMIN" as MemberRole,
    }),
  });

  const d = await r.json().catch(() => null);
  if (!r.ok || !d?.ok) throw new Error(d?.error ?? `INVITE_HTTP_${r.status}`);
  return d;
}

export default function UsersPanel() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);

const { selectedTenantId, setSelectedTenantId: setTenantId } = useSelectedTenant();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [addType, setAddType] = useState<UserType>("TENANT_ADMIN");

  const [search, setSearch] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [inviteSent, setInviteSent] = useState<Record<string, boolean>>({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editType, setEditType] = useState<UserType>("TENANT_ADMIN");

  const editingRow = useMemo(
    () => (editingId ? rows.find((r) => r.id === editingId) : null),
    [editingId, rows]
  );

  const coreAdmins = useMemo(() => rows.filter((u) => u.isSuperAdmin), [rows]);

  const tenantAdmins = useMemo(() => {
    if (!selectedTenantId) return [];

    const base = rows.filter((u) => {
      if (u.isSuperAdmin) return false;
      const m = membershipInTenant(u, selectedTenantId);
      if (!m) return false;

      return (
        (m.status === "ACTIVE" || m.status === "INVITED") &&
        (m.role === "OWNER" || m.role === "ADMIN")
      );
    });

    const q = search.trim().toLowerCase();
    if (!q) return base;

    return base.filter((u) => {
      const m = membershipInTenant(u, selectedTenantId);
      return [u.name ?? "", u.email ?? "", m?.role ?? "", m?.status ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, selectedTenantId, search]);

  function selectedTenantLabel() {
    const t = tenants.find((x) => x.id === selectedTenantId);
    return t ? `${t.name} (${t.code})` : "—";
  }

  async function loadTenants(silent?: boolean) {
  try {
    const r = await fetch("/api/admin/tenants", { cache: "no-store" });
    const d = await r.json().catch(() => null);

    if (!r.ok) {
      const msg = d?.error ? String(d.error) : `TENANTS_HTTP_${r.status}`;
      if (!silent) toast.error(msg);
      return;
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
  } catch {
    // ignore
  }
}

  async function loadUsers(silent?: boolean) {
    if (!silent) setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/core-admin/users`, { cache: "no-store" });
      const text = await res.text();
      const ct = res.headers.get("content-type") || "";

      if (!res.ok) {
        const j = safeJson(text);
        setRows([]);
        const msg = j?.error ? `${j.error}` : `USERS_API_${res.status}`;
        setErr(msg);
        if (!silent) toast.error(msg);
        return;
      }

      if (!ct.includes("application/json")) {
        setRows([]);
        const msg = "USERS_API_NOT_JSON";
        setErr(msg);
        if (!silent) toast.error(msg);
        return;
      }

      const data = JSON.parse(text);
      setRows(data.users ?? []);
    } finally {
      setBusy(false);
    }
  }

  async function ensureType(userId: string, type: UserType, tenantId: string | null) {
    const res = await fetch(`/api/core-admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        tenantId: type === "TENANT_ADMIN" ? tenantId : null,
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      const j = safeJson(text);
      throw new Error(j?.error ? `${j.error}` : `TYPE_PATCH_${res.status}`);
    }
  }

  async function addUser() {
    const e = email.trim().toLowerCase();
    const n = joinName(firstName, lastName) || null;

    if (!firstName.trim()) return toast.error("FIRST_NAME_REQUIRED");
    if (!lastName.trim()) return toast.error("SECOND_NAME_REQUIRED");
    if (!e) return toast.error("EMAIL_REQUIRED");

    if (addType === "TENANT_ADMIN" && !selectedTenantId) {
      setErr("TENANT_ID_REQUIRED");
      return toast.error("TENANT_ID_REQUIRED");
    }

    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/core-admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: e,
          name: n,
          type: addType,
          tenantId: addType === "TENANT_ADMIN" ? selectedTenantId : null,
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

      const created = safeJson(text);
      const createdUser: UserRow | null = created?.user ?? null;

      setEmail("");
      setFirstName("");
      setLastName("");

      if (createdUser?.id) {
        try {
          await ensureType(
            createdUser.id,
            addType,
            addType === "TENANT_ADMIN" ? selectedTenantId : null
          );
        } catch (typeErr: any) {
          const msg = typeErr?.message ?? "TYPE_SET_FAILED";
          setErr(msg);
          toast.error(msg);
          await loadUsers(true);
          return;
        }
      }

      if (addType === "TENANT_ADMIN" && selectedTenantId) {
        try {
          await postInvite(selectedTenantId, e, n);
          toast.success(`User created + Invite sent (${selectedTenantLabel()})`);
        } catch (invErr: any) {
          const msg = invErr?.message ?? "INVITE_FAILED";
          setErr(msg);
          toast.error(`User created, but invite failed: ${msg}`);
        }
      } else {
        toast.success("Core Admin created");
      }

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
    setEditType(deriveType(u));
  }

  function cancelEdit() {
    setErr(null);
    setEditingId(null);
    setEditFirstName("");
    setEditLastName("");
    setEditEmail("");
    setEditType("TENANT_ADMIN");
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

    const currentRow = rows.find((r) => r.id === id) || null;
    const originalType: UserType = currentRow ? deriveType(currentRow) : "TENANT_ADMIN";
    const typeChanged = editType !== originalType;

    if (typeChanged && editType === "TENANT_ADMIN" && !selectedTenantId) {
      setErr("TENANT_ID_REQUIRED");
      return toast.error("TENANT_ID_REQUIRED");
    }

    const payload: any = {
      name: n,
      email: e,
    };

    if (typeChanged) {
      payload.type = editType;
      payload.tenantId = editType === "TENANT_ADMIN" ? selectedTenantId : null;
    }

    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/core-admin/users/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      if (!res.ok) {
        const j = safeJson(text);
        const msg = j?.error ? `${j.error}` : `EDIT_USER_${res.status}`;
        setErr(msg);
        toast.error(msg);
        return;
      }

      if (typeChanged && originalType === "CORE_ADMIN" && editType === "TENANT_ADMIN") {
        try {
          await postInvite(selectedTenantId, e, n);
          toast.success(`Saved + Invite sent (${selectedTenantLabel()})`);
        } catch (invErr: any) {
          const msg = invErr?.message ?? "INVITE_FAILED";
          setErr(msg);
          toast.error(`Saved, but invite failed: ${msg}`);
        }
      } else {
        toast.success("User updated");
      }

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
      const res = await fetch(`/api/core-admin/users/${encodeURIComponent(id)}`, {
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
      toast.success("User deleted");
      await loadUsers(true);
    } finally {
      setBusy(false);
    }
  }

  async function sendInvite(u: UserRow) {
    if (!selectedTenantId) return toast.error("TENANT_ID_REQUIRED");

    const type = editingId === u.id ? editType : deriveType(u);
    if (type === "CORE_ADMIN") {
      toast.error("CORE_ADMIN_INVITE_NOT_SUPPORTED");
      return;
    }

    const targetEmail = (editingId === u.id ? editEmail : u.email).trim().toLowerCase();
    const targetName =
      editingId === u.id
        ? joinName(editFirstName, editLastName) || null
        : u.name ?? null;

    if (!targetEmail) return toast.error("EMAIL_REQUIRED");

    const key = `${u.id}:${selectedTenantId}`;

    setInviteSent((p) => ({ ...p, [key]: true }));

    setBusy(true);
    setErr(null);
    try {
      await postInvite(selectedTenantId, targetEmail, targetName);

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
    (async () => {
      await loadTenants(true);
      await loadUsers(true);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="text-sm text-white/70">
        Tenant-filtered users. Invite always targets the selected tenant.
      </div>

      {err ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-wider text-white/50">
            Tenant (filter + invite target)
          </div>
          <select
            className="h-10 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-white/80 outline-none"
            value={selectedTenantId}
onChange={(e) => setTenantId(e.target.value)}
            disabled={busy || tenants.length === 0}
          >
            {tenants.length === 0 ? (
              <option value="">{busy ? "Loading..." : "No tenants"}</option>
            ) : (
              tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))
            )}
          </select>
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

          <div className="col-span-4">
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
              Type
            </div>
            <div className="flex h-10 overflow-hidden rounded-md border border-white/10 bg-white/[0.04]">
              <button
                type="button"
                onClick={() => setAddType("TENANT_ADMIN")}
                disabled={busy}
                className={`flex-1 px-2 text-[11px] font-semibold tracking-wide ${
                  addType === "TENANT_ADMIN"
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:bg-white/[0.06]"
                }`}
              >
                TENANT
              </button>

              <button
                type="button"
                onClick={() => setAddType("CORE_ADMIN")}
                disabled={busy}
                className={`flex-1 px-2 text-[11px] font-semibold tracking-wide ${
                  addType === "CORE_ADMIN"
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:bg-white/[0.06]"
                }`}
              >
                CORE
              </button>
            </div>
          </div>

          <div className="col-span-2 flex justify-end">
            <button
              onClick={addUser}
              disabled={busy || (addType === "TENANT_ADMIN" && !selectedTenantId)}
              className="h-10 w-full rounded-md bg-emerald-600 px-6 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-wider text-white/50">
          Core Admins
        </div>

        <div className="grid grid-cols-12 gap-2 bg-white/[0.04] px-3 py-2 text-xs uppercase tracking-wider text-white/50">
          <div className="col-span-4">Name</div>
          <div className="col-span-4">Email</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        <div className="max-h-[220px] overflow-y-auto divide-y divide-white/10">
          {coreAdmins.map((u) => {
            const isEditing = editingId === u.id;
            return (
              <div key={u.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm items-center">
                <div className="col-span-4 text-white/80">
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

                <div className="col-span-4 text-white/80">
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
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as UserType)}
                      disabled={busy}
                    >
                      <option value="TENANT_ADMIN" disabled={!selectedTenantId}>
                        TENANT
                      </option>
                      <option value="CORE_ADMIN">CORE</option>
                    </select>
                  ) : (
                    <div className="truncate">CORE</div>
                  )}
                </div>

                <div className="col-span-2 flex justify-end gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => saveEdit(u.id)}
                        disabled={busy || (editType === "TENANT_ADMIN" && !selectedTenantId)}
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
                      <button
                        onClick={() => startEdit(u)}
                        disabled={busy}
                        className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Edit
                      </button>

                      <DeleteConfirm
                        title="Delete Core Admin?"
                        description={`This will permanently delete the CORE ADMIN "${u.email}" and all related data.`}
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

          {coreAdmins.length === 0 && (
            <div className="px-3 py-3 text-sm text-white/50">No core admins.</div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-wider text-white/50">
          Tenant Admins ({selectedTenantLabel()})
        </div>

        <div className="px-3 py-3 border-b border-white/10 bg-white/[0.02]">
          <input
            className="h-10 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm outline-none"
            placeholder="Search tenant admins by name, email, role or status"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={busy}
          />
        </div>

        <div className="grid grid-cols-12 gap-2 bg-white/[0.04] px-3 py-2 text-xs uppercase tracking-wider text-white/50">
          <div className="col-span-4">Name</div>
          <div className="col-span-4">Email</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        <div className="max-h-[420px] overflow-y-auto divide-y divide-white/10">
          {tenantAdmins.map((u) => {
            const isEditing = editingId === u.id;
            const st = statusInTenant(u, selectedTenantId);
            const m = membershipInTenant(u, selectedTenantId);
            const inviteKey = `${u.id}:${selectedTenantId}`;
            const justSent = !!inviteSent[inviteKey];

            return (
              <div key={u.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm items-center">
                <div className="col-span-4 text-white/80">
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

                <div className="col-span-4 text-white/80">
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
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as UserType)}
                      disabled={busy}
                    >
                      <option value="TENANT_ADMIN">TENANT</option>
                      <option value="CORE_ADMIN">CORE</option>
                    </select>
                  ) : (
                    <div className="truncate">{m?.role ?? "-"}</div>
                  )}
                </div>

                <div className="col-span-2 flex justify-end gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => saveEdit(u.id)}
                        disabled={busy || (editType === "TENANT_ADMIN" && !selectedTenantId)}
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
                          onClick={() => sendInvite(u)}
                          disabled={busy || !selectedTenantId}
                          className="h-9 rounded-md bg-purple-600 px-4 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                          title={!selectedTenantId ? "Select tenant first" : `Send invite to ${selectedTenantLabel()}`}
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
                        title="Delete User?"
                        description={`This will permanently delete "${u.email}" and all related data.`}
                        onConfirm={() => deleteUser(u.id)}
                        trigger={
                          <button
                            disabled={busy || editingId === u.id}
                            className="h-9 rounded-md bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            title={editingId === u.id ? "Cancel edit first" : "Delete user"}
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

          {selectedTenantId && tenantAdmins.length === 0 && !err && (
            <div className="px-3 py-3 text-sm text-white/50">
              No tenant admins found for selected tenant.
            </div>
          )}

          {!selectedTenantId && (
            <div className="px-3 py-3 text-sm text-white/50">
              Select a tenant to view tenant users.
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
"use client";

import { useEffect, useMemo, useState } from "react";

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

export default function UsersPanel() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const editingRow = useMemo(
    () => (editingId ? rows.find((r) => r.id === editingId) : null),
    [editingId, rows]
  );

  async function load() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/core-admin/users`, { cache: "no-store" });
      const text = await res.text();

      const ct = res.headers.get("content-type") || "";
      if (!res.ok) {
        const j = safeJson(text);
        setRows([]);
        setErr(j?.error ? `${j.error}` : `USERS_API_${res.status}`);
        console.error(text);
        return;
      }
      if (!ct.includes("application/json")) {
        setRows([]);
        setErr("USERS_API_NOT_JSON");
        console.error(text);
        return;
      }

      const data = JSON.parse(text);
      setRows(data.users ?? []);
    } finally {
      setBusy(false);
    }
  }

  async function addUser() {
    const e = email.trim().toLowerCase();
    if (!e) return;

    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/core-admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, name: name.trim() || null }),
      });

      const text = await res.text();
      if (!res.ok) {
        const j = safeJson(text);
        setErr(j?.error ? `${j.error}` : `ADD_USER_${res.status}`);
        console.error(text);
        return;
      }

      setEmail("");
      setName("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  function startEdit(u: UserRow) {
    setErr(null);
    setEditingId(u.id);
    setEditName(u.name ?? "");
    setEditEmail(u.email ?? "");
  }

  function cancelEdit() {
    setErr(null);
    setEditingId(null);
    setEditName("");
    setEditEmail("");
  }

  async function saveEdit(id: string) {
    const e = editEmail.trim().toLowerCase();
    if (!e) {
      setErr("EMAIL_REQUIRED");
      return;
    }

    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/core-admin/users/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim() || null,
          email: e,
        }),
      });

      const text = await res.text();
      if (!res.ok) {
        const j = safeJson(text);
        setErr(j?.error ? `${j.error}` : `EDIT_USER_${res.status}`);
        console.error(text);
        return;
      }

      setEditingId(null);
      setEditName("");
      setEditEmail("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(id: string) {
    const row = rows.find(r => r.id === id);
if (row?.isSuperAdmin) {
  if (!confirm("This is a SUPER ADMIN. Are you sure you want to delete?")) return;
} else {
  if (!confirm("Delete this user?")) return;
}
    if (!confirm("Delete this user?")) return;

    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/core-admin/users/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const text = await res.text();

      if (!res.ok) {
        const j = safeJson(text);
        setErr(j?.error ? `${j.error}` : `DELETE_USER_${res.status}`);
        console.error(text);
        return;
      }

      if (editingId === id) cancelEdit();
      await load();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="text-sm text-white/70">
        Create users in the DB. Core Admin will assign Tenant Admin per tenant in Tenant Control.
      </div>

      {err ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <input
          className="h-9 w-full md:w-[360px] rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm outline-none"
          placeholder="email@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addUser();
          }}
          disabled={busy}
        />
        <input
          className="h-9 w-full md:w-[280px] rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm outline-none"
          placeholder="Full name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addUser();
          }}
          disabled={busy}
        />

        <button
          onClick={addUser}
          disabled={busy}
          className="h-9 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Add
        </button>

        <button
          onClick={load}
          disabled={busy}
          className="h-9 rounded-md bg-white/[0.06] px-4 text-sm hover:bg-white/10 border border-white/10 disabled:opacity-50"
        >
          Refresh
        </button>

        {busy ? <div className="text-xs text-white/50 md:ml-2">Working…</div> : null}
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 bg-white/[0.04] px-3 py-2 text-xs uppercase tracking-wider text-white/50">
          <div className="col-span-4">Name</div>
          <div className="col-span-5">Email</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        <div className="divide-y divide-white/10">
          {rows.map((u) => {
            const isEditing = editingId === u.id;

            return (
              <div key={u.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm items-center">
                <div className="col-span-4 text-white/80">
                  {isEditing ? (
                    <input
                      className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(u.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      placeholder="Full name"
                      disabled={busy}
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>{u.name ?? "-"}</span>
                      <span className="text-xs text-white/40">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="col-span-5 text-white/80">
                  {isEditing ? (
                    <input
                      className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(u.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      placeholder="email@company.com"
                      disabled={busy}
                    />
                  ) : (
                    <div className="truncate">{u.email}</div>
                  )}
                </div>

                <div className="col-span-1 text-white/60">{u.isSuperAdmin ? "SUPER" : "USER"}</div>

                <div className="col-span-2 flex justify-end gap-2">
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
                      <button
                        onClick={() => startEdit(u)}
                        disabled={busy}
                        className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteUser(u.id)}
                        disabled={busy || editingId === u.id}
                        className="h-9 rounded-md bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        title={editingId === u.id ? "Cancel edit first" : "Delete user"}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {rows.length === 0 && !err && (
            <div className="px-3 py-3 text-sm text-white/50">No users yet.</div>
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
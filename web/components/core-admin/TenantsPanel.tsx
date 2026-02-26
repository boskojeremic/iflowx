"use client";

import { useEffect, useState } from "react";
import DeleteConfirm from "@/components/DeleteConfirm";
import { toast } from "sonner";
import { AdminPrimaryButton, AdminRowButton } from "@/components/core-admin/AdminButtons";

type Tenant = {
  id: string;
  name: string;
  code: string;
};

export default function TenantsPanel() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isEditMode = !!editingId;
  const upper = (v: string) => String(v ?? "").toUpperCase();

  async function load() {
    const r = await fetch("/api/admin/tenants", { cache: "no-store" });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d?.ok) {
      toast.error("Load failed", { description: d?.error ?? `HTTP ${r.status}` });
      setTenants([]);
      return;
    }
    setTenants(d.tenants ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(t: Tenant) {
    setEditingId(t.id);
    setName(upper(t.name));
    setCode(upper(t.code));
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
    setCode("");
  }

  async function handleAdd() {
    if (!name.trim() || !code.trim()) {
      toast.error("Missing fields", { description: "Tenant name and code are required." });
      return;
    }

    setBusy(true);
    try {
      const r = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: upper(name).trim(),
          code: upper(code).trim(),
        }),
      });

      const d = await r.json().catch(() => null);

      if (!r.ok || !d?.ok) {
        toast.error("Create failed", { description: d?.error ?? `HTTP ${r.status}` });
        return;
      }

      toast.success("Tenant created", { description: `"${upper(name).trim()}" created.` });
      cancelEdit();
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate() {
    const id = editingId;
    if (!id) return;

    if (!name.trim() || !code.trim()) {
      toast.error("Missing fields", { description: "Tenant name and code are required." });
      return;
    }

    setBusy(true);
    try {
      const r = await fetch("/api/admin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: id,
          name: upper(name).trim(),
          code: upper(code).trim(),
        }),
      });

      const d = await r.json().catch(() => null);

      if (!r.ok || !d?.ok) {
        toast.error("Update failed", { description: d?.error ?? `HTTP ${r.status}` });
        return;
      }

      toast.success("Tenant updated", { description: `"${upper(name).trim()}" updated.` });
      cancelEdit();
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string, tenantName: string) {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/tenants?tenantId=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const d = await r.json().catch(() => null);

      if (!r.ok || !d?.ok) {
        toast.error("Delete failed", { description: d?.error ?? `HTTP ${r.status}` });
        return;
      }

      toast.success("Tenant deleted", { description: `"${upper(tenantName)}" deleted.` });
      if (editingId === id) cancelEdit();
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* FORM */}
      <div className="flex gap-2 items-center flex-wrap">
        <input
          className="px-3 py-2 bg-black/40 border border-white/20 rounded-md w-[280px]"
          placeholder="Tenant name"
          value={name}
          onChange={(e) => setName(upper(e.target.value))}
          disabled={busy}
        />

        <input
          className="px-3 py-2 bg-black/40 border border-white/20 rounded-md w-[140px]"
          placeholder="CODE"
          value={code}
          onChange={(e) => setCode(upper(e.target.value))}
          disabled={busy}
        />

        <AdminPrimaryButton
          onClick={() => (isEditMode ? handleUpdate() : handleAdd())}
          disabled={busy}
          variant={isEditMode ? "blue" : "green"}
        >
          {isEditMode ? "Save" : "Add"}
        </AdminPrimaryButton>

        {isEditMode && (
          <AdminPrimaryButton onClick={cancelEdit} disabled={busy} variant="ghost">
            Cancel
          </AdminPrimaryButton>
        )}
      </div>

      {/* LIST */}
      <div className="space-y-2">
        {tenants.map((t) => (
          <div
            key={t.id}
            className="flex justify-between items-center p-3 rounded border border-white/10 bg-white/5"
          >
            <div className="font-medium">
              {t.name} ({t.code})
            </div>

            <div className="flex gap-2">
              <AdminRowButton onClick={() => startEdit(t)} disabled={busy} variant="blue">
                Edit
              </AdminRowButton>

              <DeleteConfirm
                title="Delete Tenant?"
                description={`This will permanently delete "${t.name}" and all related data.`}
                onConfirm={() => handleDelete(t.id, t.name)}
                trigger={
                  <AdminRowButton disabled={busy} variant="red">
                    Delete
                  </AdminRowButton>
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import DeleteConfirm from "@/components/DeleteConfirm";
import { toast } from "sonner";
import {
  AdminPrimaryButton,
  AdminRowButton,
} from "@/components/core-admin/AdminButtons";

type Industry = {
  id: string;
  name: string;
  code: string;
  sortOrder: number;
};

export default function IndustryPanel() {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sortOrder, setSortOrder] = useState<string>("100");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isEditMode = !!editingId;

  const upper = (v: unknown) => String(v ?? "").toUpperCase();

  async function load() {
    const res = await fetch("/api/industries", { cache: "no-store" });
    const data = await res.json();
    setIndustries(data.industries || []);
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(ind: Industry) {
    setEditingId(ind.id);
    setName(upper(ind.name));
    setCode(upper(ind.code));
    setSortOrder(String(ind.sortOrder ?? 100));
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
    setCode("");
    setSortOrder("100");
  }

  async function handleAdd() {
    if (!name.trim() || !code.trim()) {
      toast.error("Missing fields", {
        description: "Industry name and code are required.",
      });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/industries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: upper(name).trim(),
          code: upper(code).trim(),
          sortOrder: Number(sortOrder) || 0,
        }),
      });

      if (res.ok) {
        toast.success("Industry created", {
          description: `"${upper(name).trim()}" has been created.`,
        });
        cancelEdit();
        await load();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error("Create failed", {
          description: err?.error || "Could not create industry.",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate() {
    const id = editingId;

    if (!id) {
      toast.error("Update failed", { description: "Missing id." });
      return;
    }

    if (!name.trim() || !code.trim()) {
      toast.error("Missing fields", {
        description: "Industry name and code are required.",
      });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/industries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: upper(name).trim(),
          code: upper(code).trim(),
          sortOrder: Number(sortOrder) || 0,
        }),
      });

      if (res.ok) {
        toast.success("Industry updated", {
          description: `"${upper(name).trim()}" has been updated.`,
        });
        cancelEdit();
        await load();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error("Update failed", {
          description: err?.error || "Could not update industry.",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string, indName: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/industries/${id}`, { method: "DELETE" });

      if (res.ok) {
        toast.error("Industry permanently deleted", {
          description: `"${upper(indName)}" was deleted.`,
        });
        if (editingId === id) cancelEdit();
        await load();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error("Delete failed", {
          description: err?.error || "Could not delete industry.",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* FORM */}
      <div className="flex gap-2 items-center flex-wrap">
        <input
          className="px-3 py-2 bg-black/40 border border-white/20 rounded-md w-[260px]"
          placeholder="Industry name"
          value={name}
          onChange={(e) => setName(upper(e.target.value))}
          disabled={busy}
        />

        <input
          className="px-3 py-2 bg-black/40 border border-white/20 rounded-md w-[140px]"
          placeholder="Code"
          value={code}
          onChange={(e) => setCode(upper(e.target.value))}
          disabled={busy}
        />

        <input
          className="px-3 py-2 bg-black/40 border border-white/20 rounded-md w-[90px]"
          placeholder="Sort"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
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
          <AdminPrimaryButton
            onClick={cancelEdit}
            disabled={busy}
            variant="ghost"
          >
            Cancel
          </AdminPrimaryButton>
        )}
      </div>

      {/* LIST */}
      <div className="space-y-2">
        {industries.map((ind) => (
          <div
            key={ind.id}
            className="flex justify-between items-center p-3 rounded border border-white/10 bg-white/5"
          >
            <div className="font-medium">
              {ind.name} ({ind.code})
              <div className="text-xs opacity-70 mt-1">
                sort {ind.sortOrder ?? 0}
              </div>
            </div>

            <div className="flex gap-2">
              <AdminRowButton
                onClick={() => startEdit(ind)}
                disabled={busy}
                variant="blue"
              >
                Edit
              </AdminRowButton>

              <DeleteConfirm
                title="Delete Industry?"
                description={`This will permanently delete "${ind.name}" and all related data.`}
                onConfirm={() => handleDelete(ind.id, ind.name)}
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
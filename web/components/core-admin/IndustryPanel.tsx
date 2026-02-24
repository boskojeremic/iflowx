"use client";

import { useEffect, useState } from "react";
import DeleteConfirm from "@/components/DeleteConfirm";
import { toast } from "sonner";

type Industry = {
  id: string;
  name: string;
  code: string;
};

export default function IndustryPanel() {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    setName(ind.name);
    setCode(ind.code);
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
    setCode("");
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
        body: JSON.stringify({ name: name.trim(), code: code.trim() }),
      });

      if (res.ok) {
        toast.success("Industry created", {
          description: `"${name.trim()}" has been successfully created.`,
        });
        setName("");
        setCode("");
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
    // KLJUČ: “zaključaj” id u lokalnu promenljivu da ne ode na null usred poziva
    const id = editingId;

    if (!id) {
      toast.error("Update failed", { description: "Missing id (no row selected)." });
      return;
    }
    if (!name.trim() || !code.trim()) {
      toast("Missing fields", {
        description: "Industry name and code are required.",
      });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/industries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), code: code.trim() }),
      });

      if (res.ok) {
        toast.success("Industry updated", {
          description: `"${name.trim()}" has been updated.`,
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
          description: `"${indName}" and all related data were permanently deleted.`,
        });
        // ako brišeš red koji je trenutno u edit modu
        if (editingId === id) cancelEdit();
        await load();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error("Delete failed", {
          description:
            err?.error ||
            "Database rejected delete or relation constraint failed.",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  const isEditMode = !!editingId;

  return (
    <div className="space-y-4">
      {/* ADD / EDIT FORM (GORE) */}
      <div className="flex gap-2 items-center">
        <input
          className="px-3 py-2 bg-black/40 border border-white/20 rounded-md w-[260px]"
          placeholder="Industry name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
        />
        <input
          className="px-3 py-2 bg-black/40 border border-white/20 rounded-md w-[140px]"
          placeholder="Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={busy}
        />

        <button
          onClick={() => (isEditMode ? handleUpdate() : handleAdd())}
          disabled={busy}
          className={[
            "px-4 py-2 rounded-md text-white cursor-pointer",
            isEditMode
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-green-600 hover:bg-green-700",
            busy ? "opacity-60 cursor-not-allowed" : "",
          ].join(" ")}
        >
          {isEditMode ? "Save" : "Add"}
        </button>

        {isEditMode && (
          <button
            onClick={cancelEdit}
            disabled={busy}
            className={[
              "px-4 py-2 rounded-md cursor-pointer",
              "bg-white/10 hover:bg-white/15 border border-white/15 text-white",
              busy ? "opacity-60 cursor-not-allowed" : "",
            ].join(" ")}
          >
            Cancel
          </button>
        )}
      </div>

      {/* LISTA SVIH REDOVA */}
      <div className="space-y-2">
        {industries.map((ind) => (
          <div
            key={ind.id}
            className="flex justify-between items-center p-3 rounded border border-white/10 bg-white/5"
          >
            <div className="font-medium">
              {ind.name} ({ind.code})
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => startEdit(ind)}
                disabled={busy}
                className={[
                  "px-3 py-1 rounded text-white text-sm cursor-pointer",
                  "bg-blue-600 hover:bg-blue-700",
                  busy ? "opacity-60 cursor-not-allowed" : "",
                ].join(" ")}
              >
                Edit
              </button>

              <DeleteConfirm
                title="Delete Industry?"
                description={`This will permanently delete "${ind.name}" and all related Platforms, Modules and Tenant mappings.`}
                onConfirm={() => handleDelete(ind.id, ind.name)}
                trigger={
                  <button
                    disabled={busy}
                    className={[
                      "px-3 py-1 rounded text-white text-sm cursor-pointer",
                      "bg-red-600 hover:bg-red-700",
                      busy ? "opacity-60 cursor-not-allowed" : "",
                    ].join(" ")}
                  >
                    Delete
                  </button>
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
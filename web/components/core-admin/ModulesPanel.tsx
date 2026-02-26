"use client";

import { useEffect, useMemo, useState } from "react";
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
};

type ModuleRow = {
  id: string;
  industryId: string;
  name: string;
  code: string;
  routePath: string | null;
  description: string | null;
  sortOrder: number;
  isAddon: boolean;
  isActive: boolean;
};

function toSlug(s: string) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export default function ModulesPanel() {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [industryId, setIndustryId] = useState<string>("");

  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sortOrder, setSortOrder] = useState<string>("100");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isEditMode = !!editingId;

  // ✅ SAFE UPPER (nikad null/undefined)
  const upper = (v: unknown) => String(v ?? "").toUpperCase();

  const selectedIndustry = useMemo(
    () => industries.find((x) => x.id === industryId) || null,
    [industries, industryId]
  );

  // Auto route = /{industryCodeSlug}/{moduleCodeSlug}
  const autoRoute = useMemo(() => {
    if (!selectedIndustry) return "";
    const ind = toSlug(selectedIndustry.code);
    const mod = toSlug(code);
    if (!ind || !mod) return "";
    return `/${ind}/${mod}`;
  }, [selectedIndustry, code]);

  async function loadIndustries() {
    const res = await fetch("/api/industries", { cache: "no-store" });
    const data = await res.json();
    const list: Industry[] = data.industries || [];
    setIndustries(list);

    if (!industryId && list.length) {
      setIndustryId(list[0].id);
    }
  }

  async function loadModules(selectedIndustryId: string) {
    if (!selectedIndustryId) {
      setModules([]);
      return;
    }
    const res = await fetch(
      `/api/modules?industryId=${encodeURIComponent(selectedIndustryId)}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    setModules(data.modules || []);
  }

  useEffect(() => {
    loadIndustries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (industryId) loadModules(industryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [industryId]);

  function startEdit(m: ModuleRow) {
    setEditingId(m.id);
    setName(upper(m.name));
    setCode(upper(m.code));
    setSortOrder(String(m.sortOrder ?? 100));
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
    setCode("");
    setSortOrder("100");
  }

  async function handleAdd() {
    if (!industryId) {
      toast.error("Missing fields", { description: "Please select Industry." });
      return;
    }
    if (!name.trim() || !code.trim()) {
      toast.error("Missing fields", {
        description: "Module name and code are required.",
      });
      return;
    }
    if (!autoRoute) {
      toast.error("Missing route", {
        description: "Auto route could not be generated (check code).",
      });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industryId,
          name: upper(name).trim(),
          code: upper(code).trim(),
          routePath: autoRoute,
          sortOrder: Number(sortOrder) || 0,
          isActive: true,
          isAddon: true,
        }),
      });

      if (res.ok) {
        toast.success("Module created", {
          description: `"${upper(name).trim()}" has been successfully created.`,
        });
        cancelEdit();
        await loadModules(industryId);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error("Create failed", {
          description: err?.error || "Could not create module.",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate() {
    const id = editingId;

    if (!id) {
      toast.error("Update failed", {
        description: "Missing id (no row selected).",
      });
      return;
    }
    if (!industryId) {
      toast.error("Missing fields", { description: "Please select Industry." });
      return;
    }
    if (!name.trim() || !code.trim()) {
      toast.error("Missing fields", {
        description: "Module name and code are required.",
      });
      return;
    }
    if (!autoRoute) {
      toast.error("Missing route", {
        description: "Auto route could not be generated (check code).",
      });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/modules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industryId,
          name: upper(name).trim(),
          code: upper(code).trim(),
          routePath: autoRoute,
          sortOrder: Number(sortOrder) || 0,
        }),
      });

      if (res.ok) {
        toast.success("Module updated", {
          description: `"${upper(name).trim()}" has been updated.`,
        });
        cancelEdit();
        await loadModules(industryId);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error("Update failed", {
          description: err?.error || "Could not update module.",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string, moduleName: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/modules/${id}`, { method: "DELETE" });

      if (res.ok) {
        toast.error("Module permanently deleted", {
          description: `"${upper(moduleName)}" was permanently deleted.`,
        });
        if (editingId === id) cancelEdit();
        await loadModules(industryId);
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

  return (
    <div className="space-y-4">
      {/* FILTER + ADD/EDIT FORM */}
      <div className="w-full overflow-hidden">
        <div className="grid w-full grid-cols-12 gap-2 items-center">
          {/* Industry */}
          <select
            className="col-span-12 md:col-span-4 min-w-0 px-3 py-2 bg-black/40 border border-white/20 rounded-md"
            value={industryId}
            onChange={(e) => {
              setIndustryId(e.target.value);
              cancelEdit();
            }}
            disabled={busy}
          >
            {industries.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.code})
              </option>
            ))}
          </select>

          {/* Module name */}
          <input
            className="col-span-12 md:col-span-3 min-w-0 px-3 py-2 bg-black/40 border border-white/20 rounded-md"
            placeholder="Module name"
            value={name}
            onChange={(e) => setName(upper(e.target.value))}
            disabled={busy}
          />

          {/* Code */}
          <input
            className="col-span-6 md:col-span-2 min-w-0 px-3 py-2 bg-black/40 border border-white/20 rounded-md"
            placeholder="Code"
            value={code}
            onChange={(e) => setCode(upper(e.target.value))}
            disabled={busy}
          />

          {/* Sort */}
          <input
            className="col-span-6 md:col-span-1 min-w-0 px-3 py-2 bg-black/40 border border-white/20 rounded-md"
            placeholder="Sort"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            disabled={busy}
          />

          {/* Add/Save FIXED SIZE */}
          <div className="col-span-12 md:col-span-2 flex md:justify-end">
            <AdminPrimaryButton
              onClick={() => (isEditMode ? handleUpdate() : handleAdd())}
              disabled={busy}
              variant={isEditMode ? "blue" : "green"}
            >
              {isEditMode ? "Save" : "Add"}
            </AdminPrimaryButton>
          </div>

          {/* Auto Route Preview */}
          <div className="col-span-12 text-xs opacity-70 px-1">
            Auto route:{" "}
            <span className="opacity-100 font-medium">
              {autoRoute ? autoRoute : "— (select Industry + enter Code) —"}
            </span>
          </div>

          {/* Cancel FIXED SIZE */}
          {isEditMode && (
            <div className="col-span-12 flex justify-start">
              <AdminPrimaryButton
                onClick={cancelEdit}
                disabled={busy}
                variant="ghost"
              >
                Cancel
              </AdminPrimaryButton>
            </div>
          )}
        </div>
      </div>

      {/* LISTA MODULA */}
      <div className="space-y-2">
        {modules.length === 0 && (
          <div className="p-3 rounded border border-white/10 bg-white/5 text-sm opacity-70">
            No modules for selected Industry.
          </div>
        )}

        {modules.map((m) => (
          <div
            key={m.id}
            className="flex justify-between items-center p-3 rounded border border-white/10 bg-white/5"
          >
            <div className="font-medium">
              {m.name} ({m.code})
              <div className="text-xs opacity-70 mt-1">
                {m.routePath ? m.routePath : "— no route —"} • sort{" "}
                {m.sortOrder ?? 0}
              </div>
            </div>

            <div className="flex gap-2">
              <AdminRowButton
                onClick={() => startEdit(m)}
                disabled={busy}
                variant="blue"
              >
                Edit
              </AdminRowButton>

              <DeleteConfirm
                title="Delete Module?"
                description={`This will permanently delete "${m.name}" and all related Tenant module mappings.`}
                onConfirm={() => handleDelete(m.id, m.name)}
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
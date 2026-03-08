"use client";

import { useState } from "react";
import { toast } from "sonner";
import DeleteConfirm from "@/components/DeleteConfirm";
import FormFrame from "@/components/ui/FormFrame";
import TableFrame from "@/components/ui/TableFrame";

type AssetTypeCategory =
  | "STRUCTURAL"
  | "EQUIPMENT"
  | "UTILITY"
  | "INSTRUMENT";

type AssetTypeRow = {
  id: string;
  code: string;
  name: string;
  category: AssetTypeCategory;
  sortOrder: number;
  isActive: boolean;
};

const upper = (v: unknown) => String(v ?? "").toUpperCase();

const categories: AssetTypeCategory[] = [
  "STRUCTURAL",
  "EQUIPMENT",
  "UTILITY",
  "INSTRUMENT",
];

export default function AssetTypesClient({
  initialRows,
}: {
  initialRows: AssetTypeRow[];
}) {
  const [rows, setRows] = useState<AssetTypeRow[]>(initialRows);
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<AssetTypeCategory>("EQUIPMENT");
  const [sortOrder, setSortOrder] = useState("100");

  const isEditMode = !!editingId;

  function resetForm() {
    setEditingId(null);
    setCode("");
    setName("");
    setCategory("EQUIPMENT");
    setSortOrder("100");
  }

  function startEdit(row: AssetTypeRow) {
    setEditingId(row.id);
    setCode(upper(row.code));
    setName(upper(row.name));
    setCategory(row.category);
    setSortOrder(String(row.sortOrder ?? 100));
  }

  async function addAssetType() {
    if (!code.trim() || !name.trim()) {
      toast.error("Missing fields", {
        description: "Code and Name are required.",
      });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/master-data/asset-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: upper(code).trim(),
          name: upper(name).trim(),
          category,
          sortOrder: Number(sortOrder) || 0,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.row) {
        toast.error("Create failed", {
          description: data?.error || "Could not create asset type.",
        });
        return;
      }

      const savedName = upper(name).trim();

      setRows((prev) =>
        [...prev, data.row].sort((a, b) =>
          a.sortOrder === b.sortOrder
            ? a.name.localeCompare(b.name)
            : a.sortOrder - b.sortOrder
        )
      );

      resetForm();

      toast.success("Asset Type created", {
        description: `"${savedName}" has been created.`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function updateAssetType() {
    if (!editingId) {
      toast.error("Update failed", {
        description: "Missing asset type id.",
      });
      return;
    }

    if (!code.trim() || !name.trim()) {
      toast.error("Missing fields", {
        description: "Code and Name are required.",
      });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(
        `/api/master-data/asset-types/${encodeURIComponent(editingId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: upper(code).trim(),
            name: upper(name).trim(),
            category,
            sortOrder: Number(sortOrder) || 0,
          }),
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.row) {
        toast.error("Update failed", {
          description: data?.error || "Could not update asset type.",
        });
        return;
      }

      const savedName = upper(name).trim();

      setRows((prev) =>
        prev
          .map((r) => (r.id === editingId ? data.row : r))
          .sort((a, b) =>
            a.sortOrder === b.sortOrder
              ? a.name.localeCompare(b.name)
              : a.sortOrder - b.sortOrder
          )
      );

      resetForm();

      toast.success("Asset Type updated", {
        description: `"${savedName}" has been updated.`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function deleteAssetType(id: string, rowName: string) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/master-data/asset-types/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        toast.error("Delete failed", {
          description: data?.error || "Could not delete asset type.",
        });
        return;
      }

      setRows((prev) => prev.filter((r) => r.id !== id));

      if (editingId === id) resetForm();

      toast.success("Asset Type deleted", {
        description: `"${upper(rowName)}" has been deleted.`,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Asset Types</h1>

        <p className="text-sm text-white/60">
          Define Standard Asset Type Catalog For Tenant Setup
        </p>
      </div>

      <FormFrame title={isEditMode ? "Edit Asset Type" : "Add Asset Type"}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-2">
            <input
              value={code}
              onChange={(e) => setCode(upper(e.target.value))}
              placeholder="Code"
              disabled={busy}
              className="h-10 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm outline-none"
            />
          </div>

          <div className="md:col-span-4">
            <input
              value={name}
              onChange={(e) => setName(upper(e.target.value))}
              placeholder="Asset Type Name"
              disabled={busy}
              className="h-10 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as AssetTypeCategory)}
              disabled={busy}
              className="h-10 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-1">
            <input
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="Sort"
              disabled={busy}
              className="h-10 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <button
              onClick={() => (isEditMode ? updateAssetType() : addAssetType())}
              disabled={busy}
              className="h-10 w-full rounded-md bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isEditMode ? "Save" : "Add"}
            </button>
          </div>
        </div>

        {isEditMode && (
          <div className="flex justify-end">
            <button
              onClick={resetForm}
              disabled={busy}
              className="h-10 rounded-md border border-white/15 bg-white/10 px-4 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}
      </FormFrame>

      <TableFrame title="Asset Type List">
        <div className="grid min-w-[1000px] grid-cols-12 gap-2 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-wider text-white/50">
          <div className="col-span-2">Code</div>
          <div className="col-span-4">Name</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-2">Sort</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        <div className="divide-y divide-white/10">
          {rows.map((r) => (
            <div
              key={r.id}
              className="grid min-w-[1000px] grid-cols-12 gap-2 px-4 py-3 text-sm items-center"
            >
              <div className="col-span-2">{r.code}</div>
              <div className="col-span-4">{r.name}</div>
              <div className="col-span-2">{r.category.replaceAll("_", " ")}</div>
              <div className="col-span-2">{r.sortOrder}</div>

              <div className="col-span-2 flex justify-end gap-2">
                <button
                  onClick={() => startEdit(r)}
                  disabled={busy}
                  className="h-9 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Edit
                </button>

                <DeleteConfirm
                  title="Delete Asset Type?"
                  description={`This will permanently delete "${r.name}".`}
                  onConfirm={() => deleteAssetType(r.id, r.name)}
                  trigger={
                    <button
                      disabled={busy}
                      className="h-9 rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  }
                />
              </div>
            </div>
          ))}

          {rows.length === 0 && (
            <div className="px-4 py-4 text-sm text-white/50">
              No Asset Types Defined.
            </div>
          )}
        </div>
      </TableFrame>
    </div>
  );
}
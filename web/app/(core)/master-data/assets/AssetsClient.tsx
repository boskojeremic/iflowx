"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import DeleteConfirm from "@/components/DeleteConfirm";
import FormFrame from "@/components/ui/FormFrame";
import TableFrame from "@/components/ui/TableFrame";
import ClientPageShell from "@/components/ui/ClientPageShell";
import ScrollTableArea from "@/components/ui/ScrollTableArea";

type AssetRole = "PROCESS" | "EMITTER" | "METER" | "UTILITY";

type FacilityLite = {
  id: string;
  code: string;
  name: string;
  Site: {
    id: string;
    code: string;
    name: string;
  };
};

type AssetTypeLite = {
  id: string;
  code: string;
  name: string;
  category: string;
};

type AssetRow = {
  id: string;
  code: string;
  name: string;
  location: string | null;
  assetRole: AssetRole;
  facilityId: string;
  assetTypeId: string;
  parentAssetId: string | null;
  Facility: {
    id: string;
    code: string;
    name: string;
    Site: {
      id: string;
      code: string;
      name: string;
    };
  };
  AssetType: {
    id: string;
    code: string;
    name: string;
    category: string;
  };
  parentAsset: {
    id: string;
    code: string;
    name: string;
  } | null;
};

const roles: AssetRole[] = ["PROCESS", "EMITTER", "METER", "UTILITY"];
const upper = (v: unknown) => String(v ?? "").toUpperCase();

export default function AssetsClient({
  tenantId,
  tenantName,
  tenantCode,
  facilities,
  assetTypes,
  initialRows,
}: {
  tenantId: string;
  tenantName: string;
  tenantCode: string;
  facilities: FacilityLite[];
  assetTypes: AssetTypeLite[];
  initialRows: AssetRow[];
}) {
  const [rows, setRows] = useState<AssetRow[]>(initialRows);
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [facilityId, setFacilityId] = useState<string>(facilities[0]?.id ?? "");
  const [assetTypeId, setAssetTypeId] = useState<string>(assetTypes[0]?.id ?? "");
  const [parentAssetId, setParentAssetId] = useState<string>("");
  const [assetRole, setAssetRole] = useState<AssetRole>("PROCESS");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  const isEditMode = !!editingId;

  const parentAssetOptions = useMemo(() => {
    if (!facilityId) return [];
    return rows.filter((r) => r.facilityId === facilityId && r.id !== editingId);
  }, [rows, facilityId, editingId]);

  function resetForm() {
    setEditingId(null);
    setFacilityId(facilities[0]?.id ?? "");
    setAssetTypeId(assetTypes[0]?.id ?? "");
    setParentAssetId("");
    setAssetRole("PROCESS");
    setCode("");
    setName("");
    setLocation("");
  }

  function startEdit(row: AssetRow) {
    setEditingId(row.id);
    setFacilityId(row.facilityId);
    setAssetTypeId(row.assetTypeId);
    setParentAssetId(row.parentAssetId ?? "");
    setAssetRole(row.assetRole);
    setCode(upper(row.code));
    setName(upper(row.name));
    setLocation(upper(row.location ?? ""));
  }

  async function addAsset() {
    if (!facilityId || !assetTypeId || !code.trim() || !name.trim()) {
      toast.error("Missing fields", {
        description: "Facility, Asset Type, Code, and Name are required.",
      });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/master-data/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityId,
          assetTypeId,
          parentAssetId: parentAssetId || null,
          assetRole,
          code: upper(code).trim(),
          name: upper(name).trim(),
          location: location.trim() ? upper(location).trim() : null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.row) {
        toast.error("Create failed", {
          description: data?.error || "Could not create asset.",
        });
        return;
      }

      setRows((prev) =>
        [...prev, data.row].sort((a, b) => a.name.localeCompare(b.name))
      );

      const savedName = upper(name).trim();
      resetForm();

      toast.success("Asset created", {
        description: `"${savedName}" has been created.`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function updateAsset() {
    if (!editingId) {
      toast.error("Update failed", {
        description: "Missing asset id.",
      });
      return;
    }

    if (!facilityId || !assetTypeId || !code.trim() || !name.trim()) {
      toast.error("Missing fields", {
        description: "Facility, Asset Type, Code, and Name are required.",
      });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(
        `/api/master-data/assets/${encodeURIComponent(editingId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            facilityId,
            assetTypeId,
            parentAssetId: parentAssetId || null,
            assetRole,
            code: upper(code).trim(),
            name: upper(name).trim(),
            location: location.trim() ? upper(location).trim() : null,
          }),
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.row) {
        toast.error("Update failed", {
          description: data?.error || "Could not update asset.",
        });
        return;
      }

      setRows((prev) =>
        prev
          .map((r) => (r.id === editingId ? data.row : r))
          .sort((a, b) => a.name.localeCompare(b.name))
      );

      const savedName = upper(name).trim();
      resetForm();

      toast.success("Asset updated", {
        description: `"${savedName}" has been updated.`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function deleteAsset(id: string, rowName: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/master-data/assets/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        toast.error("Delete failed", {
          description: data?.error || "Could not delete asset.",
        });
        return;
      }

      setRows((prev) => prev.filter((r) => r.id !== id));

      if (editingId === id) resetForm();

      toast.success("Asset deleted", {
        description: `"${upper(rowName)}" has been deleted.`,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ClientPageShell
      title="Assets"
      subtitle="Define Assets Within Facilities, Assign Asset Types, Roles, And Hierarchy"
      form={
        <FormFrame title={isEditMode ? "Edit Asset" : "Add Asset"}>
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-wider text-white/40">
              {tenantCode} · {tenantName}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-4">
                <select
                  value={facilityId}
                  onChange={(e) => setFacilityId(e.target.value)}
                  disabled={busy || facilities.length === 0}
                  className="h-10 w-full rounded-md border border-white/10 bg-[#151a18] px-3 text-sm text-white outline-none"
                >
                  {facilities.length === 0 ? (
                    <option value="">NO FACILITIES AVAILABLE</option>
                  ) : (
                    facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.code}) · {f.Site.code}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  value={assetTypeId}
                  onChange={(e) => setAssetTypeId(e.target.value)}
                  disabled={busy || assetTypes.length === 0}
                  className="h-10 w-full rounded-md border border-white/10 bg-[#151a18] px-3 text-sm text-white outline-none"
                >
                  {assetTypes.length === 0 ? (
                    <option value="">NO ASSET TYPES</option>
                  ) : (
                    assetTypes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.code}) · {a.category}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  value={assetRole}
                  onChange={(e) => setAssetRole(e.target.value as AssetRole)}
                  disabled={busy}
                  className="h-10 w-full rounded-md border border-white/10 bg-[#151a18] px-3 text-sm text-white outline-none"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  value={parentAssetId}
                  onChange={(e) => setParentAssetId(e.target.value)}
                  disabled={busy}
                  className="h-10 w-full rounded-md border border-white/10 bg-[#151a18] px-3 text-sm text-white outline-none"
                >
                  <option value="">NO PARENT ASSET</option>
                  {parentAssetOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-3">
                <input
                  value={code}
                  onChange={(e) => setCode(upper(e.target.value))}
                  placeholder="Code"
                  disabled={busy}
                  className="h-10 w-full rounded-md border border-white/10 bg-[#151a18] px-3 text-sm text-white outline-none"
                />
              </div>

              <div className="md:col-span-5">
                <input
                  value={name}
                  onChange={(e) => setName(upper(e.target.value))}
                  placeholder="Asset Name"
                  disabled={busy}
                  className="h-10 w-full rounded-md border border-white/10 bg-[#151a18] px-3 text-sm text-white outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <input
                  value={location}
                  onChange={(e) => setLocation(upper(e.target.value))}
                  placeholder="Location"
                  disabled={busy}
                  className="h-10 w-full rounded-md border border-white/10 bg-[#151a18] px-3 text-sm text-white outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  onClick={() => (isEditMode ? updateAsset() : addAsset())}
                  disabled={busy || facilities.length === 0 || assetTypes.length === 0}
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
                  className="h-10 rounded-md border border-white/15 bg-[#151a18] px-4 text-sm font-medium text-white hover:bg-[#1b211f] disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </FormFrame>
      }
      table={
        <TableFrame title="Asset List">
          <ScrollTableArea>
            <div className="min-w-[1200px]">
              <div className="sticky top-0 z-10 grid grid-cols-12 gap-2 border-b border-white/10 bg-[#101512] px-4 py-2 text-xs uppercase tracking-wider text-white/50">
                <div className="col-span-2">Code</div>
                <div className="col-span-2">Name</div>
                <div className="col-span-2">Facility</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-1">Role</div>
                <div className="col-span-2">Parent</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              <div className="divide-y divide-white/10 bg-[#0b0f0d]">
                {rows.map((r) => (
                  <div
                    key={r.id}
                    className="grid grid-cols-12 items-center gap-2 px-4 py-3 text-sm"
                  >
                    <div className="col-span-2">{r.code}</div>
                    <div className="col-span-2">{r.name}</div>
                    <div className="col-span-2">
                      {r.Facility.name} ({r.Facility.code})
                    </div>
                    <div className="col-span-2">
                      {r.AssetType.name} ({r.AssetType.code})
                    </div>
                    <div className="col-span-1">{r.assetRole}</div>
                    <div className="col-span-2">
                      {r.parentAsset
                        ? `${r.parentAsset.name} (${r.parentAsset.code})`
                        : "-"}
                    </div>

                    <div className="col-span-1 flex justify-end gap-2">
                      <button
                        onClick={() => startEdit(r)}
                        disabled={busy}
                        className="h-9 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Edit
                      </button>

                      <DeleteConfirm
                        title="Delete Asset?"
                        description={`This will permanently delete "${r.name}".`}
                        onConfirm={() => deleteAsset(r.id, r.name)}
                        trigger={
                          <button
                            disabled={busy}
                            className="h-9 rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Del
                          </button>
                        }
                      />
                    </div>
                  </div>
                ))}

                {rows.length === 0 && (
                  <div className="px-4 py-4 text-sm text-white/50">
                    No Assets Defined For This Tenant.
                  </div>
                )}
              </div>
            </div>
          </ScrollTableArea>
        </TableFrame>
      }
    />
  );
}
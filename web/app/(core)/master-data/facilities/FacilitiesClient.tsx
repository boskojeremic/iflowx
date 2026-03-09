"use client";

import { useState } from "react";
import { toast } from "sonner";
import DeleteConfirm from "@/components/DeleteConfirm";
import FormFrame from "@/components/ui/FormFrame";
import TableFrame from "@/components/ui/TableFrame";
import ClientPageShell from "@/components/ui/ClientPageShell";
import ScrollTableArea from "@/components/ui/ScrollTableArea";

type SiteLite = {
  id: string;
  code: string;
  name: string;
};

type FacilityRow = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  siteId: string;
  Site: {
    id: string;
    code: string;
    name: string;
  };
};

const upper = (v: unknown) => String(v ?? "").toUpperCase();

export default function FacilitiesClient({
  tenantId,
  tenantName,
  tenantCode,
  sites,
  initialRows,
}: {
  tenantId: string;
  tenantName: string;
  tenantCode: string;
  sites: SiteLite[];
  initialRows: FacilityRow[];
}) {
  const [rows, setRows] = useState<FacilityRow[]>(initialRows);
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [siteId, setSiteId] = useState<string>(sites[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const isEditMode = !!editingId;

  function resetForm() {
    setEditingId(null);
    setSiteId(sites[0]?.id ?? "");
    setCode("");
    setName("");
  }

  function startEdit(row: FacilityRow) {
    setEditingId(row.id);
    setSiteId(row.siteId);
    setCode(upper(row.code));
    setName(upper(row.name));
  }

  async function addFacility() {
    if (!siteId || !code.trim() || !name.trim()) {
      toast.error("Missing fields", {
        description: "Site, Code, and Facility Name are required.",
      });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/master-data/facilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          code: upper(code).trim(),
          name: upper(name).trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.row) {
        toast.error("Create failed", {
          description: data?.error || "Could not create facility.",
        });
        return;
      }

      setRows((prev) =>
        [...prev, data.row].sort((a, b) => a.name.localeCompare(b.name))
      );

      const savedName = upper(name).trim();
      resetForm();

      toast.success("Facility created", {
        description: `"${savedName}" has been created.`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function updateFacility() {
    if (!editingId) {
      toast.error("Update failed", {
        description: "Missing facility id.",
      });
      return;
    }

    if (!siteId || !code.trim() || !name.trim()) {
      toast.error("Missing fields", {
        description: "Site, Code, and Facility Name are required.",
      });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(
        `/api/master-data/facilities/${encodeURIComponent(editingId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteId,
            code: upper(code).trim(),
            name: upper(name).trim(),
          }),
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.row) {
        toast.error("Update failed", {
          description: data?.error || "Could not update facility.",
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

      toast.success("Facility updated", {
        description: `"${savedName}" has been updated.`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function deleteFacility(id: string, rowName: string) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/master-data/facilities/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        toast.error("Delete failed", {
          description: data?.error || "Could not delete facility.",
        });
        return;
      }

      setRows((prev) => prev.filter((r) => r.id !== id));

      if (editingId === id) resetForm();

      toast.success("Facility deleted", {
        description: `"${upper(rowName)}" has been deleted.`,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ClientPageShell
      title="Facilities"
      subtitle="Define Facilities Within Selected Tenant Sites"
      form={
        <FormFrame title={isEditMode ? "Edit Facility" : "Add Facility"}>
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-wider text-white/40">
              {tenantCode} · {tenantName}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-4">
                <select
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  disabled={busy || sites.length === 0}
                  className="h-10 w-full rounded-md border border-white/10 bg-[#151a18] px-3 text-sm text-white outline-none"
                >
                  {sites.length === 0 ? (
                    <option value="">NO SITES AVAILABLE</option>
                  ) : (
                    sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="md:col-span-3">
                <input
                  value={code}
                  onChange={(e) => setCode(upper(e.target.value))}
                  placeholder="Code"
                  disabled={busy}
                  className="h-10 w-full rounded-md border border-white/10 bg-[#151a18] px-3 text-sm text-white outline-none"
                />
              </div>

              <div className="md:col-span-3">
                <input
                  value={name}
                  onChange={(e) => setName(upper(e.target.value))}
                  placeholder="Facility Name"
                  disabled={busy}
                  className="h-10 w-full rounded-md border border-white/10 bg-[#151a18] px-3 text-sm text-white outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  onClick={() => (isEditMode ? updateFacility() : addFacility())}
                  disabled={busy || sites.length === 0}
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
        <TableFrame title="Facility List">
          <ScrollTableArea>
            <div className="min-w-[1000px]">
              <div className="sticky top-0 z-10 grid grid-cols-12 gap-2 border-b border-white/10 bg-[#101512] px-4 py-2 text-xs uppercase tracking-wider text-white/50">
                <div className="col-span-2">Code</div>
                <div className="col-span-3">Facility Name</div>
                <div className="col-span-4">Site</div>
                <div className="col-span-3 text-right">Actions</div>
              </div>

              <div className="divide-y divide-white/10 bg-[#0b0f0d]">
                {rows.map((r) => (
                  <div
                    key={r.id}
                    className="grid grid-cols-12 items-center gap-2 px-4 py-3 text-sm"
                  >
                    <div className="col-span-2">{r.code}</div>
                    <div className="col-span-3">{r.name}</div>
                    <div className="col-span-4">
                      {r.Site.name} ({r.Site.code})
                    </div>

                    <div className="col-span-3 flex justify-end gap-2">
                      <button
                        onClick={() => startEdit(r)}
                        disabled={busy}
                        className="h-9 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Edit
                      </button>

                      <DeleteConfirm
                        title="Delete Facility?"
                        description={`This will permanently delete "${r.name}".`}
                        onConfirm={() => deleteFacility(r.id, r.name)}
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
                    No Facilities Defined For This Tenant.
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
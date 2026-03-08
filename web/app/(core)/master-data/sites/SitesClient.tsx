"use client";

import { useState } from "react";
import { toast } from "sonner";
import DeleteConfirm from "@/components/DeleteConfirm";
import FormFrame from "@/components/ui/FormFrame";
import TableFrame from "@/components/ui/TableFrame";

type SiteRow = {
  id: string;
  code: string;
  name: string;
  country: string;
  city: string | null;
  location: string | null;
  isActive: boolean;
};

const upper = (v: unknown) => String(v ?? "").toUpperCase();

export default function SitesClient({
  tenantId,
  tenantName,
  tenantCode,
  initialRows,
}: {
  tenantId: string;
  tenantName: string;
  tenantCode: string;
  initialRows: SiteRow[];
}) {
  const [rows, setRows] = useState<SiteRow[]>(initialRows);
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [location, setLocation] = useState("");

  const isEditMode = !!editingId;

  function resetForm() {
    setEditingId(null);
    setCode("");
    setName("");
    setCountry("");
    setCity("");
    setLocation("");
  }

  function startEdit(row: SiteRow) {
    setEditingId(row.id);
    setCode(upper(row.code));
    setName(upper(row.name));
    setCountry(upper(row.country));
    setCity(upper(row.city ?? ""));
    setLocation(upper(row.location ?? ""));
  }

  async function addSite() {
    if (!code.trim() || !name.trim() || !country.trim()) {
      toast.error("Missing fields", {
        description: "Code, Site Name, and Country are required.",
      });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/master-data/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: upper(code).trim(),
          name: upper(name).trim(),
          country: upper(country).trim(),
          city: city.trim() ? upper(city).trim() : null,
          location: location.trim() ? upper(location).trim() : null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.row) {
        toast.error("Create failed", {
          description: data?.error || "Could not create site.",
        });
        return;
      }

      const savedName = upper(name).trim();

      setRows((prev) =>
        [...prev, data.row].sort((a, b) => a.name.localeCompare(b.name))
      );

      resetForm();

      toast.success("Site created", {
        description: `"${savedName}" has been created.`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function updateSite() {
    if (!editingId) {
      toast.error("Update failed", {
        description: "Missing site id.",
      });
      return;
    }

    if (!code.trim() || !name.trim() || !country.trim()) {
      toast.error("Missing fields", {
        description: "Code, Site Name, and Country are required.",
      });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(
        `/api/master-data/sites/${encodeURIComponent(editingId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: upper(code).trim(),
            name: upper(name).trim(),
            country: upper(country).trim(),
            city: city.trim() ? upper(city).trim() : null,
            location: location.trim() ? upper(location).trim() : null,
          }),
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.row) {
        toast.error("Update failed", {
          description: data?.error || "Could not update site.",
        });
        return;
      }

      const savedName = upper(name).trim();

      setRows((prev) =>
        prev
          .map((r) => (r.id === editingId ? data.row : r))
          .sort((a, b) => a.name.localeCompare(b.name))
      );

      resetForm();

      toast.success("Site updated", {
        description: `"${savedName}" has been updated.`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function deleteSite(id: string, rowName: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/master-data/sites/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        toast.error("Delete failed", {
          description: data?.error || "Could not delete site.",
        });
        return;
      }

      setRows((prev) => prev.filter((r) => r.id !== id));

      if (editingId === id) {
        resetForm();
      }

      toast.success("Site deleted", {
        description: `"${upper(rowName)}" has been deleted.`,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-wider text-white/40">
          {tenantCode} · {tenantName}
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Sites</h1>

        <p className="text-sm text-white/60">
          Define Tenant Sites, Fields, Plants, And Operating Areas
        </p>
      </div>

      <FormFrame title={isEditMode ? "Edit Site" : "Add Site"}>
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
              placeholder="Site Name"
              disabled={busy}
              className="h-10 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <input
              value={country}
              onChange={(e) => setCountry(upper(e.target.value))}
              placeholder="Country"
              disabled={busy}
              className="h-10 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <input
              value={city}
              onChange={(e) => setCity(upper(e.target.value))}
              placeholder="City"
              disabled={busy}
              className="h-10 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <button
              onClick={() => (isEditMode ? updateSite() : addSite())}
              disabled={busy}
              className="h-10 w-full rounded-md bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isEditMode ? "Save" : "Add"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-10">
            <input
              value={location}
              onChange={(e) => setLocation(upper(e.target.value))}
              placeholder="Location / Description"
              disabled={busy}
              className="h-10 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm outline-none"
            />
          </div>

          <div className="md:col-span-2">
            {isEditMode && (
              <button
                onClick={resetForm}
                disabled={busy}
                className="h-10 w-full rounded-md border border-white/15 bg-white/10 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </FormFrame>

      <TableFrame title="Site List">
  <div className="grid min-w-[1100px] grid-cols-12 gap-2 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-wider text-white/50">
    <div className="col-span-2">Code</div>
    <div className="col-span-3">Site Name</div>
    <div className="col-span-2">Country</div>
    <div className="col-span-2">City</div>
    <div className="col-span-2">Location</div>
    <div className="col-span-1 text-right">Actions</div>
  </div>

  <div className="divide-y divide-white/10">
    {rows.map((r) => (
      <div
        key={r.id}
        className="grid min-w-[1100px] grid-cols-12 gap-2 px-4 py-3 text-sm items-center"
      >
        <div className="col-span-2">{r.code}</div>
        <div className="col-span-3">{r.name}</div>
        <div className="col-span-2">{r.country}</div>
        <div className="col-span-2">{r.city ?? "-"}</div>
        <div className="col-span-2">{r.location ?? "-"}</div>

        <div className="col-span-1 flex justify-end gap-2">
          ...
        </div>
      </div>
    ))}

    {rows.length === 0 && (
      <div className="px-4 py-4 text-sm text-white/50">
        No Sites Defined For This Tenant.
      </div>
    )}
  </div>
</TableFrame>
    </div>
  );
}
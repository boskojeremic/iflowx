"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import DeleteConfirm from "@/components/DeleteConfirm";
import {
  AdminPrimaryButton,
  AdminRowButton,
} from "@/components/core-admin/AdminButtons";

type Industry = {
  id: string;
  name: string;
  code: string;
  sortOrder?: number;
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

type ReportGroupRow = {
  id: string;
  moduleId: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

const upper = (v: unknown) => String(v ?? "").toUpperCase();

export default function ReportGroupsPanel() {
  const [busy, setBusy] = useState(false);

  const [industries, setIndustries] = useState<Industry[]>([]);
  const [industryId, setIndustryId] = useState("");

  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [moduleId, setModuleId] = useState("");

  const [rows, setRows] = useState<ReportGroupRow[]>([]);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("100");
  const [editingId, setEditingId] = useState<string | null>(null);

  const isEditMode = !!editingId;

  async function loadIndustries() {
    const res = await fetch("/api/master-data/industries", {
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);

    const list: Industry[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.industries)
        ? data.industries
        : [];

    setIndustries(list);

    setIndustryId((prev) => {
      if (prev && list.some((i) => i.id === prev)) return prev;
      return list[0]?.id || "";
    });
  }

  async function loadModules(selectedIndustryId: string) {
    if (!selectedIndustryId) {
      setModules([]);
      setModuleId("");
      return;
    }

    const res = await fetch(
      `/api/master-data/modules?industryId=${encodeURIComponent(selectedIndustryId)}`,
      { cache: "no-store" }
    );
    const data = await res.json().catch(() => null);

    const list: ModuleRow[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.modules)
        ? data.modules
        : [];

    setModules(list);

    setModuleId((prev) => {
      if (prev && list.some((m) => m.id === prev)) return prev;
      return list[0]?.id || "";
    });
  }

  async function loadReportGroups(selectedModuleId: string) {
    if (!selectedModuleId) {
      setRows([]);
      return;
    }

    const res = await fetch(
      `/api/master-data/report-groups?moduleId=${encodeURIComponent(selectedModuleId)}`,
      { cache: "no-store" }
    );
    const data = await res.json().catch(() => null);

    const list: ReportGroupRow[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.reportGroups)
        ? data.reportGroups
        : [];

    setRows(list);
  }

  useEffect(() => {
    loadIndustries();
  }, []);

  useEffect(() => {
    if (!industryId) {
      setModules([]);
      setModuleId("");
      setRows([]);
      return;
    }

    setEditingId(null);
    setCode("");
    setName("");
    setSortOrder("100");

    loadModules(industryId);
  }, [industryId]);

  useEffect(() => {
    if (!moduleId) {
      setRows([]);
      return;
    }

    setEditingId(null);
    setCode("");
    setName("");
    setSortOrder("100");

    loadReportGroups(moduleId);
  }, [moduleId]);

  function startEdit(r: ReportGroupRow) {
    setEditingId(r.id);
    setCode(upper(r.code));
    setName(upper(r.name));
    setSortOrder(String(r.sortOrder ?? 100));
  }

  function cancelEdit() {
    setEditingId(null);
    setCode("");
    setName("");
    setSortOrder("100");
  }

  async function handleAdd() {
    if (!industryId) return toast.error("Please select Industry.");
    if (!moduleId) return toast.error("Please select Module.");
    if (!code.trim() || !name.trim()) {
      return toast.error("Code and Name are required.");
    }

    setBusy(true);
    try {
      const res = await fetch("/api/master-data/report-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          code: upper(code).trim(),
          name: upper(name).trim(),
          sortOrder: Number(sortOrder) || 100,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || "Could not create Report Group.");
        return;
      }

      cancelEdit();
      await loadReportGroups(moduleId);
      toast.success("Report Group created");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate() {
    if (!editingId) return toast.error("No row selected.");
    if (!code.trim() || !name.trim()) {
      return toast.error("Code and Name are required.");
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/master-data/report-groups/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: upper(code).trim(),
          name: upper(name).trim(),
          sortOrder: Number(sortOrder) || 100,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || "Could not update Report Group.");
        return;
      }

      cancelEdit();
      await loadReportGroups(moduleId);
      toast.success("Report Group updated");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/master-data/report-groups/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || "Could not delete Report Group.");
        return;
      }

      if (editingId === id) cancelEdit();
      await loadReportGroups(moduleId);
      toast.success("Report Group deleted");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="w-full overflow-hidden">
        <div className="grid w-full grid-cols-12 gap-2 items-center">
          <select
            className="col-span-12 md:col-span-4 min-w-0 rounded-md border border-white/20 bg-black/40 px-3 py-2"
            value={industryId}
            onChange={(e) => setIndustryId(e.target.value)}
            disabled={busy}
          >
            {industries.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.code})
              </option>
            ))}
          </select>

          <select
            className="col-span-12 md:col-span-4 min-w-0 rounded-md border border-white/20 bg-black/40 px-3 py-2"
            value={moduleId}
            onChange={(e) => setModuleId(e.target.value)}
            disabled={busy || !industryId}
          >
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.code})
              </option>
            ))}
          </select>

          <input
            className="col-span-6 md:col-span-2 min-w-0 rounded-md border border-white/20 bg-black/40 px-3 py-2"
            placeholder="CODE"
            value={code}
            onChange={(e) => setCode(upper(e.target.value))}
            disabled={busy}
          />

          <input
            className="col-span-6 md:col-span-1 min-w-0 rounded-md border border-white/20 bg-black/40 px-3 py-2"
            placeholder="100"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            disabled={busy}
          />

          <div className="col-span-12 flex md:col-span-1 md:justify-end">
            <AdminPrimaryButton
              onClick={() => (isEditMode ? handleUpdate() : handleAdd())}
              disabled={busy}
              variant={isEditMode ? "blue" : "green"}
            >
              {isEditMode ? "Save" : "Add"}
            </AdminPrimaryButton>
          </div>

          <input
            className="col-span-12 md:col-span-7 min-w-0 rounded-md border border-white/20 bg-black/40 px-3 py-2"
            placeholder="NAME"
            value={name}
            onChange={(e) => setName(upper(e.target.value))}
            disabled={busy}
          />

          {isEditMode && (
            <div className="col-span-12 flex justify-start md:col-span-2">
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

      <div className="space-y-2">
        {rows.length === 0 && (
          <div className="rounded border border-white/10 bg-white/5 p-3 text-sm opacity-70">
            No Report Groups for selected Module.
          </div>
        )}

        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded border border-white/10 bg-white/5 p-3"
          >
            <div className="font-medium">
              {r.name} ({r.code})
              <div className="mt-1 text-xs opacity-70">
                sort {r.sortOrder ?? 0} • {r.isActive ? "ACTIVE" : "INACTIVE"}
              </div>
            </div>

            <div className="flex gap-2">
              <AdminRowButton
                onClick={() => startEdit(r)}
                disabled={busy}
                variant="blue"
              >
                Edit
              </AdminRowButton>

              <DeleteConfirm
                title="Delete Report Group?"
                description={`This will permanently delete "${r.name}" and related Reports.`}
                onConfirm={() => handleDelete(r.id)}
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
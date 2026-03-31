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

type ReportRow = {
  id: string;
  reportGroupId: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

const upper = (v: unknown) => String(v ?? "").toUpperCase();

export default function ReportsPanel() {
  const [busy, setBusy] = useState(false);

  const [industries, setIndustries] = useState<Industry[]>([]);
  const [industryId, setIndustryId] = useState("");

  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [moduleId, setModuleId] = useState("");

  const [groups, setGroups] = useState<ReportGroupRow[]>([]);
  const [groupId, setGroupId] = useState("");

  const [rows, setRows] = useState<ReportRow[]>([]);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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
      setGroups([]);
      setGroupId("");
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

    setGroups(list);

    setGroupId((prev) => {
      if (prev && list.some((g) => g.id === prev)) return prev;
      return list[0]?.id || "";
    });
  }

  async function loadReports(selectedGroupId: string) {
    if (!selectedGroupId) {
      setRows([]);
      return;
    }

    const res = await fetch(
      `/api/master-data/reports?reportGroupId=${encodeURIComponent(selectedGroupId)}`,
      { cache: "no-store" }
    );
    const data = await res.json().catch(() => null);

    const list: ReportRow[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.reports)
        ? data.reports
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
      setGroups([]);
      setGroupId("");
      setRows([]);
      return;
    }

    setEditingId(null);
    setCode("");
    setName("");
    setDescription("");
    setSortOrder("100");

    loadModules(industryId);
  }, [industryId]);

  useEffect(() => {
    if (!moduleId) {
      setGroups([]);
      setGroupId("");
      setRows([]);
      return;
    }

    setEditingId(null);
    setCode("");
    setName("");
    setDescription("");
    setSortOrder("100");

    loadReportGroups(moduleId);
  }, [moduleId]);

  useEffect(() => {
    if (!groupId) {
      setRows([]);
      return;
    }

    setEditingId(null);
    setCode("");
    setName("");
    setDescription("");
    setSortOrder("100");

    loadReports(groupId);
  }, [groupId]);

  function startEdit(r: ReportRow) {
    setEditingId(r.id);
    setCode(upper(r.code));
    setName(upper(r.name));
    setDescription(upper(r.description ?? ""));
    setSortOrder(String(r.sortOrder ?? 100));
  }

  function cancelEdit() {
    setEditingId(null);
    setCode("");
    setName("");
    setDescription("");
    setSortOrder("100");
  }

  async function handleAdd() {
    if (!industryId) return toast.error("Please select Industry.");
    if (!moduleId) return toast.error("Please select Module.");
    if (!groupId) return toast.error("Please select Report Group.");
    if (!code.trim() || !name.trim()) {
      return toast.error("Code and Name are required.");
    }

    setBusy(true);
    try {
      const res = await fetch("/api/master-data/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportGroupId: groupId,
          code: upper(code).trim(),
          name: upper(name).trim(),
          description: description.trim() ? upper(description).trim() : null,
          sortOrder: Number(sortOrder) || 100,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || "Could not create Report.");
        return;
      }

      cancelEdit();
      await loadReports(groupId);
      toast.success("Report created");
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
      const res = await fetch(`/api/master-data/reports/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: upper(code).trim(),
          name: upper(name).trim(),
          description: description.trim() ? upper(description).trim() : null,
          sortOrder: Number(sortOrder) || 100,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || "Could not update Report.");
        return;
      }

      cancelEdit();
      await loadReports(groupId);
      toast.success("Report updated");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/master-data/reports/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || "Could not delete Report.");
        return;
      }

      if (editingId === id) cancelEdit();
      await loadReports(groupId);
      toast.success("Report deleted");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-12 gap-2 items-center">
        <select
          className="col-span-12 md:col-span-4 min-w-0 px-3 py-2 bg-black/40 border border-white/20 rounded-md"
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
          className="col-span-12 md:col-span-4 min-w-0 px-3 py-2 bg-black/40 border border-white/20 rounded-md"
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

        <select
          className="col-span-12 md:col-span-4 min-w-0 px-3 py-2 bg-black/40 border border-white/20 rounded-md"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          disabled={busy || !moduleId}
        >
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} ({g.code})
            </option>
          ))}
        </select>

        <input
          className="col-span-6 md:col-span-2 min-w-0 px-3 py-2 bg-black/40 border border-white/20 rounded-md"
          placeholder="CODE"
          value={code}
          onChange={(e) => setCode(upper(e.target.value))}
          disabled={busy}
        />

        <input
          className="col-span-6 md:col-span-1 min-w-0 px-3 py-2 bg-black/40 border border-white/20 rounded-md"
          placeholder="SORT"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          disabled={busy}
        />

        <input
          className="col-span-12 md:col-span-6 min-w-0 px-3 py-2 bg-black/40 border border-white/20 rounded-md"
          placeholder="NAME"
          value={name}
          onChange={(e) => setName(upper(e.target.value))}
          disabled={busy}
        />

        <div className="col-span-12 md:col-span-3 flex gap-2 md:justify-end">
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

        <input
          className="col-span-12 min-w-0 px-3 py-2 bg-black/40 border border-white/20 rounded-md"
          placeholder="DESCRIPTION"
          value={description}
          onChange={(e) => setDescription(upper(e.target.value))}
          disabled={busy}
        />
      </div>

      <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-emerald-800 scrollbar-track-transparent">
        {rows.length === 0 && (
          <div className="p-3 rounded border border-white/10 bg-white/5 text-sm opacity-70">
            No Reports for selected Report Group.
          </div>
        )}

        {rows.map((r) => (
          <div
            key={r.id}
            className="flex justify-between items-center p-3 rounded border border-white/10 bg-white/5"
          >
            <div className="font-medium">
              {r.name} ({r.code})
              <div className="text-xs opacity-70 mt-1">
                {r.description ? r.description : "— no description —"} • sort {r.sortOrder ?? 0} •{" "}
                {r.isActive ? "ACTIVE" : "INACTIVE"}
              </div>
            </div>

            <div className="flex gap-2">
              <AdminRowButton onClick={() => startEdit(r)} disabled={busy} variant="blue">
                Edit
              </AdminRowButton>

              <DeleteConfirm
                title="Delete Report?"
                description={`This will permanently delete "${r.name}".`}
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
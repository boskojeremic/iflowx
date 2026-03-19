"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  functions: {
    id: string;
    name: string;
    abbreviation: string;
    _count: {
      memberships: number;
    };
  }[];
};

export default function OperationalFunctionPanel({ functions }: Props) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAbbreviation, setEditAbbreviation] = useState("");

  async function handleAdd() {
    try {
      setSaving(true);

      const res = await fetch("/api/tenant-admin/operational-functions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          abbreviation,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || "Failed to add operational function");
        return;
      }

      setName("");
      setAbbreviation("");

      toast.success("Operational function added");

      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to add operational function");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(id: string, currentName: string, currentAbbreviation: string) {
    setEditingId(id);
    setEditName(currentName);
    setEditAbbreviation(currentAbbreviation);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditAbbreviation("");
  }

  async function saveEdit(id: string) {
    try {
      setBusyId(id);

      const res = await fetch(`/api/tenant-admin/operational-functions/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editName,
          abbreviation: editAbbreviation,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || "Failed to update");
        return;
      }

      toast.success("Operational function updated");

      cancelEdit();
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string, usersCount: number) {
    try {
      if (usersCount > 0) {
        toast.error("Cannot delete function assigned to users");
        return;
      }

      setBusyId(id);

      const res = await fetch(`/api/tenant-admin/operational-functions/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || "Failed to delete");
        return;
      }

      toast.success("Operational function deleted");

      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-white/70">
        Tenant operational functions for the logged-in tenant.
      </p>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="grid grid-cols-12 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="col-span-5 rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none"
            placeholder="Operational Function"
          />

          <input
            value={abbreviation}
            onChange={(e) => setAbbreviation(e.target.value)}
            className="col-span-3 rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none"
            placeholder="Abbreviation"
          />

          <button
            onClick={handleAdd}
            disabled={saving}
            className="col-span-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add"}
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-transparent">
          <div className="max-h-[470px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[#202a27]">
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-white/70">
                  <th className="px-3 py-3">Operational Function</th>
                  <th className="px-3 py-3">Abbreviation</th>
                  <th className="px-3 py-3">Users</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {functions.map((f) => {
                  const isEditing = editingId === f.id;

                  return (
                    <tr
                      key={f.id}
                      className="border-b border-white/5 text-white hover:bg-white/[0.03]"
                    >
                      <td className="px-3 py-3">
                        {isEditing ? (
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1 text-sm text-white outline-none"
                          />
                        ) : (
                          f.name
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {isEditing ? (
                          <input
                            value={editAbbreviation}
                            onChange={(e) => setEditAbbreviation(e.target.value)}
                            className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1 text-sm text-white outline-none"
                          />
                        ) : (
                          f.abbreviation
                        )}
                      </td>

                      <td className="px-3 py-3">{f._count.memberships}</td>

                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEdit(f.id)}
                                disabled={busyId === f.id}
className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"                              >
                                Save
                              </button>

                              <button
                                onClick={cancelEdit}
                                disabled={busyId === f.id}
className="h-9 rounded-md border border-white/15 bg-white/10 px-4 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-50"                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() =>
                                  startEdit(f.id, f.name, f.abbreviation)
                                }
                                disabled={busyId === f.id}
className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"                              >
                                Edit
                              </button>

                              <button
                                onClick={() =>
                                  handleDelete(f.id, f._count.memberships)
                                }
                                disabled={busyId === f.id}
className="h-9 rounded-md bg-red-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {functions.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-8 text-center text-sm text-white/50"
                    >
                      No operational functions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
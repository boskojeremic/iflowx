"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Row = {
  detailId: string;
  tagNo: string;
  description: string;
  value: string;
  unit: string;
  editable: boolean;
};

type Props = {
  rows: Row[];
};

export default function EditableMeasurementTable({ rows }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [savingId, setSavingId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [draftValue, setDraftValue] = useState("");

  async function handleSave(detailId: string) {
    try {
      setSavingId(detailId);

      const res = await fetch("/api/esg/ghg_inv/update-manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          detailId,
          value: draftValue,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to update value.");
      }

      setEditingId("");
      setDraftValue("");

      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("_ts", Date.now().toString());

      router.replace(`/esg/ghg_inv?${params.toString()}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to update value.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="bg-slate-950 text-white">
            <th className="px-3 py-3 text-left">Tag No.</th>
            <th className="px-3 py-3 text-left">Description</th>
            <th className="px-3 py-3 text-right">Value</th>
            <th className="px-3 py-3 text-left">Unit</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r) => {
              const isEditing = editingId === r.detailId;

              return (
                <tr
                  key={r.detailId}
                  className="border-b border-white/10 bg-white/5"
                >
                  <td className="px-3 py-3">{r.tagNo}</td>
                  <td className="px-3 py-3">{r.description}</td>
                  <td className="px-3 py-3 text-right">
                    {r.editable ? (
                      isEditing ? (
                        <input
                          autoFocus
                          value={draftValue}
                          onChange={(e) => setDraftValue(e.target.value)}
                          onBlur={() => handleSave(r.detailId)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSave(r.detailId);
                            }
                            if (e.key === "Escape") {
                              setEditingId("");
                              setDraftValue("");
                            }
                          }}
                          className="w-full rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-right outline-none"
                          disabled={savingId === r.detailId}
                        />
                      ) : (
                        <div
                          onDoubleClick={() => {
                            setEditingId(r.detailId);
                            setDraftValue(r.value || "0");
                          }}
                          className="cursor-text rounded-md border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-right hover:bg-amber-500/10"
                          title="Double click to edit"
                        >
                          {r.value || "0"}
                        </div>
                      )
                    ) : (
                      r.value
                    )}
                  </td>
                  <td className="px-3 py-3">{r.unit}</td>
                </tr>
              );
            })
          ) : (
            <tr className="border-b border-white/10 bg-white/5">
              <td colSpan={4} className="px-3 py-6 text-center text-white/40">
                No data for selected report/date.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
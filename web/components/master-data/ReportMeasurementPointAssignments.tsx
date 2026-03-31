"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type AvailableItem = {
  id: string;
  tagNo: string;
  desc: string;
  facility: string;
  asset: string;
  unit: string;
  source?: string;
};

type AssignedItem = {
  linkId: string;
  measurementPointId: string;
  sortOrder: number;
  tagNo: string;
  desc: string;
  facility: string;
  asset: string;
  unit: string;
  source?: string;
};

export default function ReportMeasurementPointAssignments(props: {
  tenantId: string;
  reportId: string;
  reportName: string;
  available: AvailableItem[];
  assigned: AssignedItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [left, setLeft] = useState<AvailableItem[]>(Array.isArray(props.available) ? props.available : []);
  const [right, setRight] = useState<AssignedItem[]>(Array.isArray(props.assigned) ? props.assigned : []);
  const [selectedLeft, setSelectedLeft] = useState<string[]>([]);
  const [selectedRight, setSelectedRight] = useState<string[]>([]);

  useEffect(() => {
    setLeft(Array.isArray(props.available) ? props.available : []);
    setSelectedLeft([]);
  }, [props.available]);

  useEffect(() => {
    setRight(Array.isArray(props.assigned) ? props.assigned : []);
    setSelectedRight([]);
  }, [props.assigned]);

  const leftSorted = useMemo(() => {
    const safe = Array.isArray(left) ? left : [];
    return [...safe].sort((a, b) => a.tagNo.localeCompare(b.tagNo));
  }, [left]);

  const rightSorted = useMemo(() => {
    const safe = Array.isArray(right) ? right : [];
    return [...safe].sort((a, b) => a.sortOrder - b.sortOrder || a.tagNo.localeCompare(b.tagNo));
  }, [right]);

  const normalizedInitialAssigned = useMemo(() => {
    const safeAssigned = Array.isArray(props.assigned) ? props.assigned : [];
    return [...safeAssigned]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.tagNo.localeCompare(b.tagNo))
      .map((x, idx) => ({
        measurementPointId: x.measurementPointId,
        sortOrder: (idx + 1) * 10,
      }));
  }, [props.assigned]);

  const normalizedCurrentAssigned = useMemo(() => {
    return rightSorted.map((x, idx) => ({
      measurementPointId: x.measurementPointId,
      sortOrder: (idx + 1) * 10,
    }));
  }, [rightSorted]);

  const hasChanges =
    JSON.stringify(normalizedInitialAssigned) !== JSON.stringify(normalizedCurrentAssigned);

  function toggleLeft(id: string) {
    setSelectedLeft((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleRight(id: string) {
    setSelectedRight((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function assignSelected() {
    if (!selectedLeft.length) return;

    const safeLeft = Array.isArray(left) ? left : [];
    const safeRight = Array.isArray(right) ? right : [];

    const picked = safeLeft.filter((x) => selectedLeft.includes(x.id));
    const remaining = safeLeft.filter((x) => !selectedLeft.includes(x.id));

    const startSort =
      safeRight.length > 0 ? Math.max(...safeRight.map((x) => x.sortOrder)) + 10 : 10;

    const newAssigned: AssignedItem[] = picked.map((x, idx) => ({
      linkId: `new:${x.id}`,
      measurementPointId: x.id,
      sortOrder: startSort + idx * 10,
      tagNo: x.tagNo,
      desc: x.desc,
      facility: x.facility,
      asset: x.asset,
      unit: x.unit,
      source: x.source ?? "—",
    }));

    setLeft(remaining);
    setRight([...safeRight, ...newAssigned]);
    setSelectedLeft([]);

    toast.success(
      selectedLeft.length === 1
        ? "Measurement point successfully added to report."
        : "Measurement points successfully added to report."
    );
  }

  function assignAll() {
    const safeLeft = Array.isArray(left) ? left : [];
    const safeRight = Array.isArray(right) ? right : [];

    if (!safeLeft.length) return;

    const count = safeLeft.length;
    const startSort =
      safeRight.length > 0 ? Math.max(...safeRight.map((x) => x.sortOrder)) + 10 : 10;

    const newAssigned: AssignedItem[] = safeLeft.map((x, idx) => ({
      linkId: `new:${x.id}`,
      measurementPointId: x.id,
      sortOrder: startSort + idx * 10,
      tagNo: x.tagNo,
      desc: x.desc,
      facility: x.facility,
      asset: x.asset,
      unit: x.unit,
      source: x.source ?? "—",
    }));

    setRight([...safeRight, ...newAssigned]);
    setLeft([]);
    setSelectedLeft([]);

    toast.success(
      count === 1
        ? "Measurement point successfully added to report."
        : "All listed measurement points successfully added to report."
    );
  }

  function removeSelected() {
    if (!selectedRight.length) return;

    const safeRight = Array.isArray(right) ? right : [];
    const safeLeft = Array.isArray(left) ? left : [];

    const picked = safeRight.filter((x) => selectedRight.includes(x.measurementPointId));
    const remaining = safeRight.filter((x) => !selectedRight.includes(x.measurementPointId));

    const backToLeft: AvailableItem[] = picked.map((x) => ({
      id: x.measurementPointId,
      tagNo: x.tagNo,
      desc: x.desc,
      facility: x.facility,
      asset: x.asset,
      unit: x.unit,
      source: x.source ?? "—",
    }));

    setRight(remaining);
    setLeft([...safeLeft, ...backToLeft].sort((a, b) => a.tagNo.localeCompare(b.tagNo)));
    setSelectedRight([]);

    toast.success(
      selectedRight.length === 1
        ? "Measurement point successfully removed from report."
        : "Measurement points successfully removed from report."
    );
  }

  function removeAll() {
    const safeRight = Array.isArray(right) ? right : [];
    const safeLeft = Array.isArray(left) ? left : [];

    if (!safeRight.length) return;

    const count = safeRight.length;

    const backToLeft: AvailableItem[] = safeRight.map((x) => ({
      id: x.measurementPointId,
      tagNo: x.tagNo,
      desc: x.desc,
      facility: x.facility,
      asset: x.asset,
      unit: x.unit,
      source: x.source ?? "—",
    }));

    setRight([]);
    setLeft([...safeLeft, ...backToLeft].sort((a, b) => a.tagNo.localeCompare(b.tagNo)));
    setSelectedRight([]);

    toast.success(
      count === 1
        ? "Measurement point successfully removed from report."
        : "All assigned measurement points successfully removed from report."
    );
  }

  function moveSelected(direction: "up" | "down") {
    if (selectedRight.length !== 1) return;

    const selectedId = selectedRight[0];
    const arr = [...rightSorted];
    const index = arr.findIndex((x) => x.measurementPointId === selectedId);
    if (index < 0) return;

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= arr.length) return;

    [arr[index], arr[swapIndex]] = [arr[swapIndex], arr[index]];

    const resequenced = arr.map((item, idx) => ({
      ...item,
      sortOrder: (idx + 1) * 10,
    }));

    setRight(resequenced);
  }

  function saveAll() {
    startTransition(async () => {
      const payload = {
        tenantId: props.tenantId,
        reportId: props.reportId,
        assignments: rightSorted.map((x, idx) => ({
          measurementPointId: x.measurementPointId,
          sortOrder: (idx + 1) * 10,
        })),
      };

      const res = await fetch("/api/master-data/report-measurement-points/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text();
        toast.error("Save failed.");
        console.error(t);
        return;
      }

      toast.success(
        rightSorted.length === 1
          ? "1 measurement point successfully assigned to report."
          : `${rightSorted.length} measurement points successfully assigned to report.`
      );

      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Report Assignment Designer</div>
          <div className="mt-1 text-sm text-white/60">{props.reportName}</div>
        </div>

        <button
          type="button"
          onClick={saveAll}
          disabled={isPending || !hasChanges}
          className="rounded-xl border border-blue-500/30 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]">
        <div className="min-w-0 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="mb-3 text-sm font-medium text-white/80">
            Available Measurement Points ({Array.isArray(left) ? left.length : 0})
          </div>

          <div className="max-h-[650px] overflow-auto rounded-lg border border-white/10">
            <table className="min-w-full table-fixed text-sm">
              <thead className="sticky top-0 bg-[#08110f] text-left text-white/70">
                <tr>
                  <th className="w-10 px-3 py-2"></th>
                  <th className="w-[110px] px-3 py-2">Tag</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="w-[90px] px-3 py-2">Facility</th>
                  <th className="w-[70px] px-3 py-2">Asset</th>
                  <th className="w-[70px] px-3 py-2">Unit</th>
                  <th className="w-[90px] px-3 py-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {!Array.isArray(left) || left.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-white/50">
                      No available points
                    </td>
                  </tr>
                ) : (
                  leftSorted.map((row) => (
                    <tr key={row.id} className="border-t border-white/5">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedLeft.includes(row.id)}
                          onChange={() => toggleLeft(row.id)}
                        />
                      </td>
                      <td className="px-3 py-2 font-medium break-words">{row.tagNo}</td>
                      <td className="px-3 py-2 break-words">{row.desc || "—"}</td>
                      <td className="px-3 py-2 break-words">{row.facility}</td>
                      <td className="px-3 py-2 break-words">{row.asset}</td>
                      <td className="px-3 py-2 break-words">{row.unit}</td>
                      <td className="px-3 py-2 break-words">{row.source ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-3">
          <button
            type="button"
            onClick={assignSelected}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm hover:bg-white/[0.06]"
          >
            &gt;
          </button>
          <button
            type="button"
            onClick={assignAll}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm hover:bg-white/[0.06]"
          >
            &gt;&gt;
          </button>
          <button
            type="button"
            onClick={removeSelected}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm hover:bg-white/[0.06]"
          >
            &lt;
          </button>
          <button
            type="button"
            onClick={removeAll}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm hover:bg-white/[0.06]"
          >
            &lt;&lt;
          </button>
        </div>

        <div className="min-w-0 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="mb-3 text-sm font-medium text-white/80">
            Assigned To Report ({rightSorted.length})
          </div>

          <div className="max-h-[650px] overflow-auto rounded-lg border border-white/10">
            <table className="min-w-full table-fixed text-sm">
              <thead className="sticky top-0 bg-[#08110f] text-left text-white/70">
                <tr>
                  <th className="w-10 px-3 py-2"></th>
                  <th className="w-[60px] px-3 py-2">Sort</th>
                  <th className="w-[110px] px-3 py-2">Tag</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="w-[90px] px-3 py-2">Facility</th>
                  <th className="w-[70px] px-3 py-2">Asset</th>
                  <th className="w-[70px] px-3 py-2">Unit</th>
                  <th className="w-[90px] px-3 py-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {rightSorted.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-white/50">
                      No assigned points
                    </td>
                  </tr>
                ) : (
                  rightSorted.map((row, idx) => (
                    <tr key={row.measurementPointId} className="border-t border-white/5">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedRight.includes(row.measurementPointId)}
                          onChange={() => toggleRight(row.measurementPointId)}
                        />
                      </td>
                      <td className="px-3 py-2">{(idx + 1) * 10}</td>
                      <td className="px-3 py-2 font-medium break-words">{row.tagNo}</td>
                      <td className="px-3 py-2 break-words">{row.desc || "—"}</td>
                      <td className="px-3 py-2 break-words">{row.facility}</td>
                      <td className="px-3 py-2 break-words">{row.asset}</td>
                      <td className="px-3 py-2 break-words">{row.unit}</td>
                      <td className="px-3 py-2 break-words">{row.source ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => moveSelected("up")}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm hover:bg-white/[0.06]"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => moveSelected("down")}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm hover:bg-white/[0.06]"
          >
            ↓
          </button>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useRouter, useSearchParams } from "next/navigation";

type RevisionOption = {
  id: string;
  revisionNo: number;
  documentNumber: string;
};

type Props = {
  revisions: RevisionOption[];
  value: string;
  mainTab: string;
  rightTab: string;
  selectedReportCode: string;
  selectedDate: string;
};

export default function RevisionFilterSelect({
  revisions,
  value,
  mainTab,
  rightTab,
  selectedReportCode,
  selectedDate,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(nextRevision: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");

    params.set("tab", mainTab);
    params.set("rightTab", rightTab);
    params.set("report", selectedReportCode);
    params.set("date", selectedDate);

    if (nextRevision) {
      params.set("rev", nextRevision);
    } else {
      params.delete("rev");
    }

    router.replace(`/ogi/fop?${params.toString()}`);
    router.refresh();
  }

  return (
    <div>
      <div className="text-sm font-medium">Revision</div>

      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={!revisions.length}
        className="mt-2 h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none transition hover:bg-black/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {!revisions.length ? (
          <option value="">No revisions</option>
        ) : (
          revisions.map((r) => (
            <option key={r.id} value={String(r.revisionNo)}>
              Rev {r.revisionNo} — {r.documentNumber || "—"}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
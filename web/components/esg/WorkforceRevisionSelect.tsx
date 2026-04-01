"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  revisions: Array<{
    id: string;
    revisionNo: number;
    documentNumber: string;
  }>;
  value: string;
  selectedDate: string;
};

export default function WorkforceRevisionSelect({
  revisions,
  value,
  selectedDate,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(nextRev: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("tab", "data-entry");
    params.set("date", selectedDate);

    if (nextRev) {
      params.set("rev", nextRev);
    } else {
      params.delete("rev");
    }

    router.push(`/gen/esg/workforce?${params.toString()}`);
  }

  return (
    <div className="w-full">
      <div className="mb-1 text-xs uppercase tracking-wide text-white/45">
        Revision
      </div>

      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
      >
        {revisions.length === 0 ? (
          <option value="">No revisions</option>
        ) : (
          revisions.map((r) => (
            <option key={r.id} value={String(r.revisionNo)}>
              {`Revision ${r.revisionNo}${
                r.documentNumber ? ` / ${r.documentNumber}` : ""
              }`}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
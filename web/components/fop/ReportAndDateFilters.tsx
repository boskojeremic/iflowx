"use client";

import { useRouter, useSearchParams } from "next/navigation";

type ReportOption = {
  id: string;
  code: string;
  name: string;
};

type Props = {
  reports: ReportOption[];
  selectedReportCode: string;
  selectedDate: string;
  mainTab: string;
  rightTab: string;
};

export default function ReportAndDateFilters({
  reports,
  selectedReportCode,
  selectedDate,
  mainTab,
  rightTab,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const maxDate = yesterday.toISOString().split("T")[0];

  function applyChange(next: {
    report?: string;
    date?: string;
  }) {
    const nextReportCode = next.report ?? selectedReportCode;
    const nextDate = next.date ?? selectedDate;

    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("tab", mainTab);
    params.set("rightTab", rightTab);
    params.set("report", nextReportCode);
    params.set("date", nextDate);
    params.delete("rev");

    router.replace(`/ogi/fop?${params.toString()}`);
    router.refresh();
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <div className="text-sm font-medium">Report</div>
        <select
          value={selectedReportCode}
          onChange={(e) => applyChange({ report: e.target.value })}
          className="mt-2 h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none transition hover:bg-black/40"
        >
          {reports.map((r) => (
            <option key={r.id} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="text-sm font-medium">Date</div>
        <input
          type="date"
          value={selectedDate}
          max={maxDate}
          onChange={(e) => applyChange({ date: e.target.value })}
          className="mt-2 h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none transition hover:bg-black/40"
        />
      </div>
    </div>
  );
}
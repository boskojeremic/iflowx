"use client";

import { useRouter, useSearchParams } from "next/navigation";

type ReportOption = {
  id: string;
  code: string;
  name: string;
};

type Props = {
  reports: ReportOption[];
  value: string;
  mainTab: string;
  rightTab: string;
  selectedDate: string;
};

export default function ReportFilterSelect({
  reports,
  value,
  mainTab,
  rightTab,
  selectedDate,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(nextReportCode: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");

    params.set("tab", mainTab);
    params.set("rightTab", rightTab);
    params.set("date", selectedDate);
    params.set("report", nextReportCode);

    router.replace(`/ogi/fop?${params.toString()}`);
  }

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
    >
      {reports.map((r) => (
        <option key={r.id} value={r.code}>
          {r.name}
        </option>
      ))}
    </select>
  );
}
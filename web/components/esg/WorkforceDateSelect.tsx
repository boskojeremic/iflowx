"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  value: string;
};

export default function WorkforceDateSelect({ value }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [date, setDate] = useState(value);

  useEffect(() => {
    setDate(value);
  }, [value]);

  function handleChange(nextDate: string) {
    setDate(nextDate);

    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("tab", "data-entry");
    params.set("date", nextDate);

    params.delete("rev");
    params.delete("_ts");
    params.delete("hq");
    params.delete("hdate");

    router.push(`/gen/esg/workforce?${params.toString()}`);
  }

  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wide text-white/45">
        Date
      </div>

      <input
        type="date"
        value={date}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
      />
    </div>
  );
}
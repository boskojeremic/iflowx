"use client";

import { useEffect, useState } from "react";

type Props = {
  from: Date | null;
  to: Date | null;
  onChange: (next: { from: Date | null; to: Date | null }) => void;
  className?: string;
};

function toInputValue(d: Date | null) {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

function fromInputValue(v: string) {
  if (!v) return null;
  return new Date(v + "T00:00:00");
}

export default function DateRangePicker({
  from,
  to,
  onChange,
  className,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div
      className={`flex items-end gap-4 p-4 rounded-xl border border-white/10 bg-black/40 ${className}`}
    >
      {/* FROM */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">From</label>
        <input
          type="date"
          value={toInputValue(from)}
          onChange={(e) =>
            onChange({
              from: fromInputValue(e.target.value),
              to,
            })
          }
          className="border border-white/15 bg-black/30 text-white p-2 rounded-md"
        />
      </div>

      {/* TO */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">To</label>
        <input
          type="date"
          value={toInputValue(to)}
          onChange={(e) =>
            onChange({
              from,
              to: fromInputValue(e.target.value),
            })
          }
          className="border border-white/15 bg-black/30 text-white p-2 rounded-md"
        />
      </div>

      {/* TODAY */}
      <button
        type="button"
        onClick={() => {
          const today = new Date();
          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
          onChange({ from: firstDay, to: today });
        }}
        className="px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm"
      >
        This Month
      </button>

      {/* RESET */}
      <button
        type="button"
        onClick={() => onChange({ from: null, to: null })}
        className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 text-white text-sm"
      >
        Clear
      </button>
    </div>
  );
}

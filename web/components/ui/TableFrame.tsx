import * as React from "react";

export default function TableFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <div className="bg-white/[0.03] px-4 py-3 text-xs uppercase tracking-wider text-white/50">
        {title}
      </div>

      <div className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}
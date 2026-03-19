"use client";

import { useEffect, useState } from "react";

type ReportViewProps = {
  pdfSrc: string;
  title?: string;
  reportDate?: string;
};

export default function ReportView({
  pdfSrc,
  title = "Daily Operations Report",
  reportDate = "15/03/2026",
}: ReportViewProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-900 text-white p-4 shadow">
          <div className="text-lg font-bold">{title}</div>
          <div className="text-sm text-slate-300">{reportDate}</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3 shadow-sm">
            <div className="text-xs text-white/50">Total BOE</div>
            <div className="text-lg font-bold">13,179</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3 shadow-sm">
            <div className="text-xs text-white/50">Oil</div>
            <div className="text-lg font-bold">333 t</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3 shadow-sm">
            <div className="text-xs text-white/50">Condensate</div>
            <div className="text-lg font-bold">473 t</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3 shadow-sm">
            <div className="text-xs text-white/50">Dry Gas</div>
            <div className="text-lg font-bold">772,669</div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 shadow-sm overflow-hidden">
          <div className="bg-white/5 px-3 py-2 font-semibold">
            Production Summary
          </div>

          <div className="p-3 text-sm space-y-2">
            <div className="flex justify-between border-b border-white/10 pb-1">
              <span>BOE</span>
              <span className="font-semibold">13,179</span>
            </div>

            <div className="flex justify-between border-b border-white/10 pb-1">
              <span>Oil</span>
              <span className="font-semibold">333 t</span>
            </div>

            <div className="flex justify-between border-b border-white/10 pb-1">
              <span>Condensate</span>
              <span className="font-semibold">473 t</span>
            </div>

            <div className="flex justify-between">
              <span>Dry Gas</span>
              <span className="font-semibold">772,669 kSm3</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 shadow-sm p-4">
          <div className="font-semibold mb-2">Operational Highlights</div>
          <ul className="text-sm space-y-2 list-disc pl-5 text-white/80">
            <li>Production remained above monthly target</li>
            <li>Condensate stream stable</li>
            <li>No critical alarms detected</li>
            <li>Tank levels remained within operating limits</li>
          </ul>
        </div>

        <a
          href={pdfSrc}
          target="_blank"
          rel="noreferrer"
          className="block text-center rounded-xl bg-slate-900 text-white py-3 font-semibold hover:bg-slate-800 transition"
        >
          Open Full PDF
        </a>
      </div>
    );
  }

  return (
    <iframe
      title={title}
      src={pdfSrc}
      className="w-full h-[calc(100vh-220px)] rounded-xl border border-white/10 bg-white"
    />
  );
}
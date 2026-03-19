import { FopReportMeta } from "@/lib/fop-report-meta";

type PlaceholderRow = {
  c1?: string;
  c2?: string;
  c3?: string;
  c4?: string;
  c5?: string;
  c6?: string;
};

type Props = {
  report: FopReportMeta;
  reportDate: string;
};

function formatDisplayDate(value: string) {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB");
}

function buildPlaceholderRows(): PlaceholderRow[] {
  return [
    { c1: "", c2: "", c3: "", c4: "", c5: "", c6: "" },
    { c1: "", c2: "", c3: "", c4: "", c5: "", c6: "" },
    { c1: "", c2: "", c3: "", c4: "", c5: "", c6: "" },
  ];
}

export default function FopReportTemplate({
  report,
  reportDate,
}: Props) {
  const displayDate = formatDisplayDate(reportDate);

  return (
    <div
      id="pdf-report"
      className="mx-auto w-full max-w-[1180px] bg-white px-6 py-5 text-slate-900"
    >
      <div className="rounded-[14px] bg-[#08164d] px-6 py-5 text-white">
        <div className="grid grid-cols-[1fr_auto] items-start gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-white/85">
              FIELD OPERATIONS
            </div>
            <div className="mt-1 text-[11px] uppercase text-white/75">
              CHINAREVSKOYE OIL FIELD
            </div>
          </div>

          <div className="text-right text-[11px] text-white/85">
            <div>{displayDate}</div>
            <div>Status: Submitted</div>
          </div>
        </div>

        <div className="mt-3 text-center text-[28px] font-bold leading-tight">
          {report.title}
        </div>
      </div>

      <div className="grid grid-cols-[2.1fr_1fr_2.2fr_0.8fr] border-x border-b border-slate-300 bg-slate-100 text-[11px] text-slate-700">
        <div className="border-r border-slate-300 px-3 py-2">
          Doc No: {report.docNo}
        </div>
        <div className="border-r border-slate-300 px-3 py-2">Revision: 0</div>
        <div className="border-r border-slate-300 px-3 py-2">
          Prepared by: Operations Reporting System
        </div>
        <div className="px-3 py-2 text-right">Page: 1</div>
      </div>

      <div className="mt-4 grid grid-cols-4 overflow-hidden rounded-[4px]">
        {report.kpis.map((kpi) => (
          <div
            key={kpi.key}
            className={`${kpi.bgClass} min-h-[90px] px-4 py-3 text-white`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wide">
              {kpi.label}
            </div>
            <div className="mt-5 text-[26px] font-bold leading-none">
              {kpi.placeholder}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 border border-slate-300">
        <div className="border-b border-slate-300 bg-slate-100 px-4 py-3 text-[13px] font-bold text-slate-800">
          {report.summaryTitle}
        </div>
        <div className="px-4 py-3 text-[12px] text-slate-600">
          {report.summaryText}
        </div>
      </div>

      {report.sections.map((section) => (
        <div key={section.key} className="mt-4 border border-slate-300">
          <div className="border-b border-slate-300 bg-slate-100 px-4 py-3 text-[13px] font-bold text-slate-800">
            {section.title}
          </div>
          <div className="border-b border-slate-300 px-4 py-2 text-[11px] text-slate-500">
            {section.description}
          </div>

          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-200 text-slate-800">
                <th className="border-r border-slate-300 px-3 py-2 text-left">
                  Tag No.
                </th>
                <th className="border-r border-slate-300 px-3 py-2 text-left">
                  Description
                </th>
                <th className="border-r border-slate-300 px-3 py-2 text-left">
                  Value
                </th>
                <th className="border-r border-slate-300 px-3 py-2 text-left">
                  Unit
                </th>
                <th className="border-r border-slate-300 px-3 py-2 text-left">
                  Source
                </th>
                <th className="px-3 py-2 text-left">Comment</th>
              </tr>
            </thead>
            <tbody>
              {buildPlaceholderRows().map((row, idx) => (
                <tr key={idx} className="border-t border-slate-300">
                  <td className="border-r border-slate-300 px-3 py-3">{row.c1}</td>
                  <td className="border-r border-slate-300 px-3 py-3">{row.c2}</td>
                  <td className="border-r border-slate-300 px-3 py-3">{row.c3}</td>
                  <td className="border-r border-slate-300 px-3 py-3">{row.c4}</td>
                  <td className="border-r border-slate-300 px-3 py-3">{row.c5}</td>
                  <td className="px-3 py-3">{row.c6}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="mt-4 border border-slate-300">
        <div className="border-b border-slate-300 bg-slate-100 px-4 py-3 text-[13px] font-bold text-slate-800">
          {report.chartTitle}
        </div>

        <div className="bg-slate-50 px-4 py-4">
          <svg viewBox="0 0 1000 250" className="h-[220px] w-full">
            <rect x="0" y="0" width="1000" height="250" fill="#f8fafc" />
            <line
              x1="80"
              y1="200"
              x2="940"
              y2="200"
              stroke="#94a3b8"
              strokeWidth="2"
            />
            <line
              x1="80"
              y1="40"
              x2="80"
              y2="200"
              stroke="#94a3b8"
              strokeWidth="2"
            />

            <line
              x1="80"
              y1="80"
              x2="940"
              y2="80"
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <line
              x1="80"
              y1="120"
              x2="940"
              y2="120"
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <line
              x1="80"
              y1="160"
              x2="940"
              y2="160"
              stroke="#e2e8f0"
              strokeWidth="1"
            />

            <rect
              x="130"
              y="150"
              width="48"
              height="50"
              fill="#bfdbfe"
              stroke="#60a5fa"
            />
            <rect
              x="230"
              y="138"
              width="48"
              height="62"
              fill="#bfdbfe"
              stroke="#60a5fa"
            />
            <rect
              x="330"
              y="142"
              width="48"
              height="58"
              fill="#bfdbfe"
              stroke="#60a5fa"
            />
            <rect
              x="430"
              y="128"
              width="48"
              height="72"
              fill="#bfdbfe"
              stroke="#60a5fa"
            />
            <rect
              x="530"
              y="132"
              width="48"
              height="68"
              fill="#bfdbfe"
              stroke="#60a5fa"
            />
            <rect
              x="630"
              y="122"
              width="48"
              height="78"
              fill="#bfdbfe"
              stroke="#60a5fa"
            />
            <rect
              x="730"
              y="116"
              width="48"
              height="84"
              fill="#bfdbfe"
              stroke="#60a5fa"
            />

            <polyline
              fill="none"
              stroke="#ef4444"
              strokeWidth="4"
              points="154,146 254,132 354,134 454,121 554,123 654,114 754,108"
            />

            <text x="820" y="92" fontSize="14" fill="#1e3a8a">
              Bars: Daily Value
            </text>
            <text x="820" y="114" fontSize="14" fill="#b91c1c">
              Line: Trend
            </text>

            <text x="140" y="220" fontSize="11" fill="#475569">
              D1
            </text>
            <text x="240" y="220" fontSize="11" fill="#475569">
              D2
            </text>
            <text x="340" y="220" fontSize="11" fill="#475569">
              D3
            </text>
            <text x="440" y="220" fontSize="11" fill="#475569">
              D4
            </text>
            <text x="540" y="220" fontSize="11" fill="#475569">
              D5
            </text>
            <text x="640" y="220" fontSize="11" fill="#475569">
              D6
            </text>
            <text x="740" y="220" fontSize="11" fill="#475569">
              D7
            </text>
          </svg>
        </div>
      </div>

      <div className="mt-4 border border-[#d6c77a] bg-[#efe2a0] px-4 py-4 text-[12px] text-slate-700">
        <div className="font-bold text-slate-800">{report.notesTitle}</div>
        <div className="mt-2">{report.notesText}</div>
      </div>

      <div className="mt-3 text-right text-[10px] text-slate-500">
        Report Date: {displayDate}
      </div>
    </div>
  );
}
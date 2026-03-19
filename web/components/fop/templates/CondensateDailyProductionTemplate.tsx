type Props = {
  reportDate?: string;
};

export default function CondensateDailyProductionTemplate({
  reportDate = "16-03-2026",
}: Props) {
  return (
    <div
      id="pdf-report"
      className="mx-auto w-full max-w-[1100px] bg-white p-5 text-slate-900"
    >
      <div className="rounded-[18px] bg-[#08164d] px-8 pt-5 pb-5 text-white">
        <div className="text-center text-[30px] font-bold leading-none">
          CONDENSATE DAILY PRODUCTION
        </div>

        <div className="mt-4 flex justify-between text-[14px] font-medium">
          <div>CHINAREVSKOYE OIL FIELD</div>
          <div>Template Preview</div>
        </div>

        <div className="mt-4 text-center text-[14px] font-medium">
          Status: Draft Layout
        </div>
      </div>

      <div className="grid grid-cols-[2.2fr_1.2fr_2.8fr_0.8fr] border-x border-b border-slate-300 bg-slate-100 text-[12px] text-slate-700">
        <div className="border-r border-slate-300 px-4 py-2">
          Doc No: NOG-OPS-FOD-CND-TPL-001
        </div>
        <div className="border-r border-slate-300 px-4 py-2">
          Revision: 0
        </div>
        <div className="border-r border-slate-300 px-4 py-2">
          Prepared by: Operations Reporting System
        </div>
        <div className="px-4 py-2 text-right">Page: 1</div>
      </div>

      <div className="mt-5 grid grid-cols-4 overflow-hidden rounded-t-[6px]">
        <div className="min-h-[90px] bg-[#3d5ad6] px-5 py-3 text-white">
          <div className="text-[12px] font-bold uppercase">PRIMARY KPI</div>
          <div className="mt-4 text-[24px] font-bold leading-none">—</div>
        </div>
        <div className="min-h-[90px] bg-[#1aa06a] px-5 py-3 text-white">
          <div className="text-[12px] font-bold uppercase">SECONDARY KPI</div>
          <div className="mt-4 text-[24px] font-bold leading-none">—</div>
        </div>
        <div className="min-h-[90px] bg-[#d97706] px-5 py-3 text-white">
          <div className="text-[12px] font-bold uppercase">REFERENCE KPI</div>
          <div className="mt-4 text-[24px] font-bold leading-none">—</div>
        </div>
        <div className="min-h-[90px] bg-[#c0067a] px-5 py-3 text-white">
          <div className="text-[12px] font-bold uppercase">OUTPUT KPI</div>
          <div className="mt-4 text-[24px] font-bold leading-none">—</div>
        </div>
      </div>

      <div className="mt-5 border border-slate-300">
        <div className="border-b border-slate-300 bg-slate-100 px-4 py-3 text-[14px] font-bold text-slate-800">
          INPUT / OUTPUT SUMMARY
        </div>
        <div className="px-4 py-3 text-[13px] text-slate-600">
          CONDENSATE DAILY PRODUCTION preview template with empty operational
          tables and chart placeholders.
        </div>
      </div>

      <div className="mt-5 overflow-hidden border border-slate-300">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-slate-300 text-slate-800">
              <th className="border-r border-slate-400 px-4 py-3 text-left">
                Tag No.
              </th>
              <th className="border-r border-slate-400 px-4 py-3 text-left">
                Description
              </th>
              <th className="border-r border-slate-400 px-4 py-3 text-left">
                Value
              </th>
              <th className="border-r border-slate-400 px-4 py-3 text-left">
                Unit
              </th>
              <th className="border-r border-slate-400 px-4 py-3 text-left">
                Source
              </th>
              <th className="px-4 py-3 text-left">Comment</th>
            </tr>
          </thead>
          <tbody>
            <tr className="h-[46px] border-t border-slate-300">
              <td className="border-r border-slate-300 px-4" />
              <td className="border-r border-slate-300 px-4" />
              <td className="border-r border-slate-300 px-4" />
              <td className="border-r border-slate-300 px-4" />
              <td className="border-r border-slate-300 px-4" />
              <td className="px-4" />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6 border border-slate-300">
        <div className="border-b border-slate-300 bg-slate-100 px-4 py-3 text-[14px] font-bold text-slate-800">
          DAILY TREND / PROFILE
        </div>

        <div className="bg-slate-50 px-4 py-4">
          <svg viewBox="0 0 1000 260" className="h-[220px] w-full">
            <rect x="0" y="0" width="1000" height="260" fill="#f8fafc" />
            <line x1="70" y1="210" x2="950" y2="210" stroke="#94a3b8" strokeWidth="2" />
            <line x1="70" y1="30" x2="70" y2="210" stroke="#94a3b8" strokeWidth="2" />

            <line x1="70" y1="60" x2="950" y2="60" stroke="#e2e8f0" strokeWidth="1" />
            <line x1="70" y1="100" x2="950" y2="100" stroke="#e2e8f0" strokeWidth="1" />
            <line x1="70" y1="140" x2="950" y2="140" stroke="#e2e8f0" strokeWidth="1" />
            <line x1="70" y1="180" x2="950" y2="180" stroke="#e2e8f0" strokeWidth="1" />

            <rect x="120" y="145" width="50" height="65" fill="#bfdbfe" stroke="#60a5fa" />
            <rect x="220" y="125" width="50" height="85" fill="#bfdbfe" stroke="#60a5fa" />
            <rect x="320" y="115" width="50" height="95" fill="#bfdbfe" stroke="#60a5fa" />
            <rect x="420" y="100" width="50" height="110" fill="#bfdbfe" stroke="#60a5fa" />
            <rect x="520" y="110" width="50" height="100" fill="#bfdbfe" stroke="#60a5fa" />
            <rect x="620" y="90" width="50" height="120" fill="#bfdbfe" stroke="#60a5fa" />
            <rect x="720" y="80" width="50" height="130" fill="#bfdbfe" stroke="#60a5fa" />

            <polyline
              fill="none"
              stroke="#ef4444"
              strokeWidth="4"
              points="145,135 245,118 345,122 445,95 545,100 645,82 745,70"
            />

            <circle cx="145" cy="135" r="5" fill="#ef4444" />
            <circle cx="245" cy="118" r="5" fill="#ef4444" />
            <circle cx="345" cy="122" r="5" fill="#ef4444" />
            <circle cx="445" cy="95" r="5" fill="#ef4444" />
            <circle cx="545" cy="100" r="5" fill="#ef4444" />
            <circle cx="645" cy="82" r="5" fill="#ef4444" />
            <circle cx="745" cy="70" r="5" fill="#ef4444" />

            <text x="120" y="235" fontSize="14" fill="#475569">D1</text>
            <text x="220" y="235" fontSize="14" fill="#475569">D2</text>
            <text x="320" y="235" fontSize="14" fill="#475569">D3</text>
            <text x="420" y="235" fontSize="14" fill="#475569">D4</text>
            <text x="520" y="235" fontSize="14" fill="#475569">D5</text>
            <text x="620" y="235" fontSize="14" fill="#475569">D6</text>
            <text x="720" y="235" fontSize="14" fill="#475569">D7</text>

            <text x="820" y="70" fontSize="16" fill="#1e3a8a">Bars: Daily Value</text>
            <text x="820" y="95" fontSize="16" fill="#b91c1c">Line: Trend</text>
          </svg>
        </div>
      </div>

      <div className="mt-6 border border-[#d6c77a] bg-[#f5e7a7] px-4 py-4 text-[13px] text-slate-700">
        <div className="font-bold text-slate-800">Notes / Commentary</div>
        <div className="mt-2">
          Reserved area for automatic narrative summary, validator comments, or
          operating highlights.
        </div>
      </div>

      <div className="mt-6 text-right text-[12px] text-slate-500">
        Report Date: {reportDate}
      </div>
    </div>
  );
}
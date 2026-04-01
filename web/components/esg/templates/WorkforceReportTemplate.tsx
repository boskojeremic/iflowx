type WorkforceSection = {
  sectionCode: string;
  rows: Array<{
    code: string;
    label: string;
    unit: string | null;
    value: string;
  }>;
};

type Props = {
  report: {
    code: string;
    title: string;
    description: string;
  };
  reportDate: string;
  revisionNo: number;
  documentNumber: string;
  status?: string;
  sections: WorkforceSection[];
};

function formatDisplayDate(value: string) {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB");
}

function formatValue(value: string | null | undefined) {
  if (value === null || value === undefined || value === "") return "0";
  return String(value);
}

function resolveUnit(sectionCode: string, label: string, unit: string | null) {
  if (unit && String(unit).trim() !== "") return unit;

  const section = (sectionCode || "").toUpperCase();
  const l = (label || "").toLowerCase();

  if (section === "HEADCOUNT" || section === "AGE" || section === "GENDER") {
    return "man";
  }

  if (section === "TRAINING") {
    if (l.includes("hour")) return "hours";
    if (l.includes("record")) return "records";
    if (l.includes("training")) return "man";
    return "records";
  }

  if (section === "HSE" || section === "WORKFORCE") {
    if (l.includes("lost day")) return "days";
    if (l.includes("incident")) return "incidents";
    if (l.includes("near miss")) return "incidents";
    if (l.includes("injury")) return "incidents";
    if (l.includes("medical")) return "incidents";
    if (l.includes("first aid")) return "incidents";
    if (l.includes("lost time")) return "incidents";
    return "incidents";
  }

  return "—";
}

function SectionTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    code: string;
    label: string;
    unit: string | null;
    value: string;
  }>;
}) {
  return (
    <div className="mt-4 border border-slate-300">
      <div className="border-b border-slate-300 bg-slate-100 px-4 py-3 text-[13px] font-bold text-slate-800">
        {title}
      </div>

      <table className="w-full table-fixed border-collapse text-[11px]">
        <colgroup>
          <col style={{ width: "58%" }} />
          <col style={{ width: "22%" }} />
          <col style={{ width: "20%" }} />
        </colgroup>

        <thead>
          <tr className="bg-slate-200 text-slate-800">
            <th className="border-r border-slate-300 px-3 py-2 text-left font-semibold">
              Description
            </th>
            <th className="border-r border-slate-300 px-3 py-2 text-left font-semibold">
              Value
            </th>
            <th className="px-3 py-2 text-left font-semibold">Unit</th>
          </tr>
        </thead>

        <tbody>
          {rows.length ? (
            rows.map((row, idx) => (
              <tr
                key={`${title}-${row.code}-${idx}`}
                className="border-t border-slate-300 align-top"
              >
                <td className="border-r border-slate-300 px-3 py-2 align-top">
                  {row.label}
                </td>
                <td className="border-r border-slate-300 px-3 py-2 align-top">
                  {formatValue(row.value)}
                </td>
                <td className="px-3 py-2 align-top">
                  {resolveUnit(title, row.label, row.unit)}
                </td>
              </tr>
            ))
          ) : (
            <tr className="border-t border-slate-300">
              <td
                colSpan={3}
                className="px-3 py-6 text-center text-slate-400"
              >
                No rows for this section.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function WorkforceReportTemplate({
  report,
  reportDate,
  revisionNo,
  documentNumber,
  status = "Draft",
  sections,
}: Props) {
  const displayDate = formatDisplayDate(reportDate);

  return (
    <div
      id="pdf-report"
      className="mx-auto w-full max-w-[1180px] bg-white px-6 py-5 text-slate-900"
    >
      <div className="rounded-[14px] bg-[#16357a] px-6 py-5 text-white">
        <div className="grid grid-cols-[1fr_auto] items-start gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-white/85">
              ESG REPORTING
            </div>
            <div className="mt-2 text-[17px] font-bold leading-tight sm:text-[20px]">
              {report.title}
            </div>
            <div className="mt-1 text-[11px] uppercase text-white/80">
              EMPLOYEE STRUCTURE AND EMPLOYMENT DATA
            </div>
          </div>

          <div className="text-right text-[11px] leading-5 text-white/90">
            <div>Date: {displayDate}</div>
            <div>Status: {status}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1.3fr_0.9fr_1.4fr_0.7fr] border-x border-b border-slate-300 bg-slate-100 text-[11px] text-slate-700">
        <div className="border-r border-slate-300 px-3 py-2">
          <div className="text-slate-500">Doc No.</div>
          <div className="font-medium break-words">{documentNumber}</div>
        </div>

        <div className="border-r border-slate-300 px-3 py-2">
          <div className="text-slate-500">Revision</div>
          <div className="font-medium">{revisionNo}</div>
        </div>

        <div className="border-r border-slate-300 px-3 py-2">
          <div className="text-slate-500">Prepared by</div>
          <div className="font-medium">Operations Reporting System</div>
        </div>

        <div className="px-3 py-2">
          <div className="text-slate-500">Page</div>
          <div className="font-medium">1</div>
        </div>
      </div>

      {sections.map((section) => (
        <SectionTable
          key={section.sectionCode}
          title={section.sectionCode.replaceAll("_", " ")}
          rows={section.rows}
        />
      ))}

      <div className="mt-3 text-right text-[10px] text-slate-500">
        Report Date: {displayDate}
      </div>
    </div>
  );
}
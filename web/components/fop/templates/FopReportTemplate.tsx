import { FopReportMeta } from "@/lib/fop-report-meta";
import { FopPreviewData } from "@/lib/fop/get-fop-report-data";

type Props = {
  report: FopReportMeta;
  reportDate: string;
  data: FopPreviewData;
};

function formatDisplayDate(value: string) {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB");
}

function formatValue(value: string | number | null) {
  if (value === null || value === undefined || value === "") return "0.00";

  const num =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));

  if (Number.isNaN(num)) return String(value);

  if (num === 0) return "0.00";

  const abs = Math.abs(num);

  if (abs < 0.01) {
    return num.toExponential(2).replace("e", "E");
  }

  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function SectionTable({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: Array<{
    tag: string;
    description: string;
    value: string | number | null;
    unit: string;
    source: string;
    comment: string;
  }>;
}) {
  return (
    <div className="mt-4 border border-slate-300 break-inside-avoid">
      <div className="border-b border-slate-300 bg-slate-100 px-4 py-3 text-[13px] font-bold text-slate-800">
        {title}
      </div>
      <div className="border-b border-slate-300 px-4 py-2 text-[11px] text-slate-500">
        {subtitle}
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
          {rows.length ? (
            rows.map((row, idx) => (
              <tr
                key={`${title}-${row.tag}-${idx}`}
                className="border-t border-slate-300"
              >
                <td className="border-r border-slate-300 px-3 py-3 align-top">
                  {row.tag}
                </td>
                <td className="border-r border-slate-300 px-3 py-3 align-top">
                  {row.description}
                </td>
                <td className="border-r border-slate-300 px-3 py-3 align-top">
                  {formatValue(row.value)}
                </td>
                <td className="border-r border-slate-300 px-3 py-3 align-top">
                  {row.unit}
                </td>
                <td className="border-r border-slate-300 px-3 py-3 align-top">
                  {row.source}
                </td>
                <td className="px-3 py-3 align-top">{row.comment}</td>
              </tr>
            ))
          ) : (
            <tr className="border-t border-slate-300">
              <td
                colSpan={6}
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

export default function FopReportTemplate({
  report,
  reportDate,
  data,
}: Props) {
  const displayDate = formatDisplayDate(reportDate);
  const reportTitle = data.header.reportTitle || report.title;

  return (
    <div
  id="pdf-report"
  style={{
    width: "100%",
    margin: 0,
    padding: 0,
    background: "#ffffff",
    boxSizing: "border-box",
    minHeight: "100vh",
  }}
  className="text-slate-900"
>
      <div
        style={{
          width: "100%",
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "12mm 10mm 14mm 10mm",
          background: "#ffffff",
          boxSizing: "border-box",
        }}
      >
        <div className="rounded-[14px] bg-[#08164d] px-6 py-5 text-white">
          <div className="grid grid-cols-[1fr_auto] items-start gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-white/85">
                FIELD OPERATIONS
              </div>
              <div className="mt-1 text-[11px] uppercase text-white/75">
                {data.header.siteName || ""}
              </div>
            </div>

            <div className="text-right text-[11px] text-white/85">
              <div>{displayDate}</div>
              <div className="mt-1 font-semibold">Status: {data.header.status}</div>
            </div>
          </div>

          <div className="mt-3 text-center text-[28px] font-bold leading-tight">
            {reportTitle}
          </div>
        </div>

        <div className="grid grid-cols-[2.1fr_1fr_2.2fr] border-x border-b border-slate-300 bg-slate-100 text-[11px] text-slate-700">
          <div className="border-r border-slate-300 px-3 py-2">
            Doc No: {data.header.documentNumber}
          </div>
          <div className="border-r border-slate-300 px-3 py-2">
            Revision: {data.header.revision}
          </div>
          <div className="px-3 py-2">
            Prepared by: {data.header.preparedBy || "Operations Reporting System"}
          </div>
        </div>

        <SectionTable
          title="MANUAL DATA ENTRY"
          subtitle="Manual values for the selected report date."
          rows={data.sections.manual}
        />

        <SectionTable
          title="SCADA READING"
          subtitle="SCADA values loaded automatically for the selected report date."
          rows={data.sections.scada}
        />

        <SectionTable
          title="CALCULATED"
          subtitle="Calculated values generated by the calculation engine."
          rows={data.sections.calculated}
        />

        <div className="mt-3 text-right text-[10px] text-slate-500">
          Report Date: {displayDate}
        </div>
      </div>
    </div>
  );
}
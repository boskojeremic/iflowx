"use client";

type Props = {
  pdfSrc: string;
  title?: string;
  reportDate?: string;
};

function withPdfParams(src: string) {
  if (!src) return src;

  const hasHash = src.includes("#");
  const joiner = hasHash ? "&" : "#";

  return `${src}${joiner}zoom=page-width&view=FitH&navpanes=0&toolbar=1`;
}

export default function ReportView({
  pdfSrc,
  title,
  reportDate,
}: Props) {
  const viewerSrc = withPdfParams(pdfSrc);

  return (
    <div className="w-full">
      {(title || reportDate) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm font-medium text-white/90">
            {title ?? "Report Preview"}
          </div>

          {reportDate ? (
            <div className="text-xs text-white/50">{reportDate}</div>
          ) : null}
        </div>
      )}

      <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-black/20">
        <iframe
          key={viewerSrc}
          src={viewerSrc}
          title={title ?? "PDF Preview"}
          className="block h-[900px] w-full bg-white"
        />
      </div>
    </div>
  );
}
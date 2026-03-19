"use client";

import { useState } from "react";

export default function TestPdfPage() {
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");

  async function generate() {
    try {
      setLoading(true);
      setPdfUrl("");

      const res = await fetch("/api/fop/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportCode: "CND",
          reportDate: "16-03-2026",
        }),
      });

      const data = await res.json();
      console.log(data);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to generate PDF.");
      }

      setPdfUrl(data.pdfUrl);
      window.open(data.pdfUrl, "_blank");
    } catch (error) {
      console.error(error);
      alert("Failed to generate PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 p-8 text-white">
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="text-xl font-semibold">FOP PDF Test</div>
        <div className="mt-2 text-sm text-white/60">
          Generate CONDENSATE DAILY PRODUCTION PDF from React preview.
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={generate}
            disabled={loading}
            className="rounded-md border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-300 transition hover:bg-blue-500/15 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate PDF"}
          </button>

          {pdfUrl ? (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-400 underline"
            >
              Open generated PDF
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
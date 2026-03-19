"use client";

import { useState } from "react";

export default function GenerateCndPdfButton() {
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");

  async function handleClick() {
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
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed");
      }

      setPdfUrl(data.pdfUrl);
    } catch (e) {
      console.error(e);
      alert("Failed to generate PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-md border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-300 hover:bg-blue-500/15 disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate CND PDF"}
      </button>

      {pdfUrl ? (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="block text-sm text-blue-400 underline"
        >
          Open generated PDF
        </a>
      ) : null}
    </div>
  );
}
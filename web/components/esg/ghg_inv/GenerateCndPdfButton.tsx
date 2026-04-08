"use client";

import { useState } from "react";

type Props = {
  reportCode: string;
  reportDate: string;
  documentNumber: string;
  revisionNo: number;
};

export default function GeneratePdfButton({
  reportCode,
  reportDate,
  documentNumber,
  revisionNo,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    try {
      setLoading(true);

      const res = await fetch("/api/esg/ghg_inv/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportCode,
          reportDate,
          documentNumber,
          revisionNo,
        }),
      });

      if (!res.ok) {
        let message = "Failed to generate PDF.";
        try {
          const data = await res.json();
          message = data?.error || message;
        } catch {}
        throw new Error(message);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to generate PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-md border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-300 hover:bg-blue-500/15 disabled:opacity-50"
    >
      {loading ? "Generating..." : "Generate PDF"}
    </button>
  );
}
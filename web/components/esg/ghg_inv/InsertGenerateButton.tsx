"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Props = {
  tenantId: string;
  reportId: string;
  reportCode: string;
  reportDate: string;
  disabled?: boolean;
};

export default function InsertGenerateButton({
  tenantId,
  reportId,
  reportCode,
  reportDate,
  disabled = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  async function handleInsert() {
    try {
      setLoading(true);

      const res = await fetch("/api/esg/ghg_inv/insert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantId,
          reportId,
          reportCode,
          reportDate,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to insert snapshot.");
      }

      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("tab", "data-entry");
      params.set("rightTab", "report");
      params.set("report", reportCode);
      params.set("date", reportDate);
      params.set("rev", String(data.revision ?? 0));
      params.set("_ts", Date.now().toString());

      router.replace(`/gen/esg/ghg_inv?${params.toString()}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Insert failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleInsert}
      disabled={loading || disabled}
      className="rounded-md border border-white/10 bg-white/[0.04] px-4 py-2 text-sm transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {disabled ? "Already inserted" : loading ? "Preparing..." : "Insert"}
    </button>
  );
}
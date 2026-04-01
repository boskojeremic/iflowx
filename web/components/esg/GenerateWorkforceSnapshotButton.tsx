"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Props = {
  tenantId: string;
  reportCode: string;
  reportDate: string;
  disabled?: boolean;
};

export default function GenerateWorkforceSnapshotButton({
  tenantId,
  reportCode,
  reportDate,
  disabled = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    if (disabled || loading) return;

    try {
      setLoading(true);

      const res = await fetch("/api/esg/workforce/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantId,
          reportCode,
          reportDate,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to generate workforce snapshot.");
      }

      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("tab", "data-entry");
      params.set("date", reportDate);

      if (data?.revisionNo !== undefined && data?.revisionNo !== null) {
        params.set("rev", String(data.revisionNo));
      }

      params.set("_ts", String(Date.now()));

      router.push(`/gen/esg/workforce?${params.toString()}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to generate workforce snapshot.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={disabled || loading}
      className="rounded-md border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-300 transition hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? "Generating..." : "Generate"}
    </button>
  );
}
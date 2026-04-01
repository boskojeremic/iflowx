"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Props = {
  tenantId: string;
  reportCode: string;
  reportDate: string;
  disabled?: boolean;
};

export default function NewWorkforceRevisionButton({
  tenantId,
  reportCode,
  reportDate,
  disabled = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  async function handleNewRevision() {
    if (disabled || loading) return;

    try {
      setLoading(true);

      const res = await fetch("/api/esg/workforce/new-revision", {
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
        throw new Error(data?.error || "Failed to create new revision.");
      }

      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("tab", "data-entry");
      params.set("date", reportDate);
      params.set("rev", String(data?.revisionNo ?? 0));
      params.set("_ts", String(Date.now()));

      router.push(`/gen/esg/workforce?${params.toString()}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to create new revision.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleNewRevision}
      disabled={disabled || loading}
      className="rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-300 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? "Creating..." : "New Revision"}
    </button>
  );
}
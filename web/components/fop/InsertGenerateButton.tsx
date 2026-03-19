"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Props = {
  reportCode: string;
  reportDate: string;
};

export default function InsertGenerateButton({
  reportCode,
  reportDate,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleInsert() {
    try {
      setLoading(true);
      setSuccess(false);

      const res = await fetch("/api/fop/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportCode,
          reportDate,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to generate report.");
      }

      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("_ts", Date.now().toString());

      setSuccess(true);

      router.replace(`/ogi/fop?${params.toString()}`);
      router.refresh();

      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleInsert}
        disabled={loading}
        className="rounded-md border border-white/10 bg-white/[0.04] px-4 py-2 text-sm hover:bg-white/10 transition disabled:opacity-60"
      >
        {loading ? "Generating..." : "Insert"}
      </button>

      {loading && (
        <div className="text-xs text-blue-300">
          System is generating report...
        </div>
      )}

      {success && (
        <div className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 text-xs text-emerald-300">
          Report successfully generated.
        </div>
      )}
    </div>
  );
}
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

export default function NewRevisionButton({
  tenantId,
  reportId,
  reportCode,
  reportDate,
  disabled = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    try {
      setLoading(true);

      const res = await fetch("/api/fop/new-revision", {
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
        throw new Error(data?.error || "Failed to create revision.");
      }

      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("rev", String(data.revision));
      params.set("_ts", Date.now().toString());

      router.replace(`/ogi/fop?${params.toString()}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "New revision failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || disabled}
      className="rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-300 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Creating..." : "New Revision"}
    </button>
  );
}
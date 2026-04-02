"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  id: string;
  fullName: string;
  isActive: boolean;
};

export default function EmployeeDeleteButton({
  id,
  fullName,
  isActive,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAction(mode: "inactive" | "delete") {
    try {
      setLoading(true);

      const res = await fetch("/api/hr/employee/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          mode,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Action failed.");
      }

      if (mode === "inactive") {
        toast.success("Employee set to inactive.");
      } else {
        toast.success("Employee deleted successfully.");
      }

      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to process request."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-red-500/15 px-2 py-1 text-[11px] text-red-300 transition hover:bg-red-500/25"
      >
        Delete
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/60">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#071018] p-5 text-white shadow-2xl">
              <div className="text-lg font-semibold">
                {isActive ? "Active Employee" : "Delete Employee"}
              </div>

              <div className="mt-2 text-sm text-white/70">
                <span className="font-medium text-white">{fullName}</span>
                {isActive
                  ? " is currently active. Do you want to set this employee to inactive instead of deleting permanently?"
                  : " is already inactive. Do you want to delete this employee permanently?"}
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  className="rounded-md border border-white/10 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
                >
                  Cancel
                </button>

                {isActive ? (
                  <button
                    type="button"
                    onClick={() => handleAction("inactive")}
                    disabled={loading}
                    className="rounded-md bg-amber-500/20 px-4 py-2 text-sm text-amber-300 hover:bg-amber-500/30 disabled:opacity-50"
                  >
                    {loading ? "Processing..." : "Set Inactive"}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => handleAction("delete")}
                  disabled={loading}
                  className="rounded-md bg-red-500/20 px-4 py-2 text-sm text-red-300 hover:bg-red-500/30 disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Delete Permanently"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
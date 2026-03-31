"use client";

import { useState } from "react";

type Props = {
  token: string;
  isPending: boolean;
};

export default function FopApprovalActions({ token, isPending }: Props) {
  const [showReject, setShowReject] = useState(false);

  if (!isPending) {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-3">
      <div className="flex gap-3">
        <form action="/api/fop/approve" method="POST">
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-5 py-2 text-sm text-emerald-300 transition hover:bg-emerald-500/15"
          >
            Approve
          </button>
        </form>

        <button
          type="button"
          onClick={() => setShowReject((v) => !v)}
          className="rounded-md border border-red-500/20 bg-red-500/10 px-5 py-2 text-sm text-red-300 transition hover:bg-red-500/15"
        >
          Reject
        </button>
      </div>

      {showReject && (
        <form
          action="/api/fop/reject"
          method="POST"
          className="w-full max-w-xl rounded-xl border border-white/10 bg-black/30 p-4"
        >
          <input type="hidden" name="token" value={token} />
          <div className="text-sm font-medium text-white">Reason for rejection</div>
          <textarea
            name="comment"
            required
            rows={5}
            className="mt-3 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
            placeholder="Enter comments for the sender..."
          />
          <div className="mt-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowReject(false)}
              className="rounded-md border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/15"
            >
              Confirm Reject
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
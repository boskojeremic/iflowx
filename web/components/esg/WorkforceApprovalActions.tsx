"use client";

import { useState } from "react";

type Props = {
  token: string;
  isPending: boolean;
};

export default function WorkforceApprovalActions({
  token,
  isPending,
}: Props) {
  const [showReject, setShowReject] = useState(false);
  const [rejectComment, setRejectComment] = useState("");

  if (!isPending) return null;

  return (
    <div className="flex w-full justify-end gap-2">
      <form action="/api/esg/workforce/approve" method="POST">
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300 transition hover:bg-emerald-500/15"
        >
          Approve
        </button>
      </form>

      {!showReject ? (
        <button
          type="button"
          onClick={() => setShowReject(true)}
          className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/15"
        >
          Reject
        </button>
      ) : (
        <form
          action="/api/esg/workforce/reject"
          method="POST"
          className="flex min-w-[380px] flex-col gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3"
        >
          <input type="hidden" name="token" value={token} />

          <label className="text-sm font-medium text-red-200">
            Reason for rejection
          </label>

          <textarea
            name="rejectComment"
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35"
            placeholder="Enter reason for rejection..."
            required
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowReject(false);
                setRejectComment("");
              }}
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
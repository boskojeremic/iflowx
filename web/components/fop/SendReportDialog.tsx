"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

type Props = {
  reportCode: string;
  reportTitle: string;
  reportDate: string;
  pdfUrl: string;
  documentNumber: string;
  revisionNo: number;
};

function formatDisplayDate(value: string) {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB");
}

export default function SendReportDialog({
  reportCode,
  reportTitle,
  reportDate,
  pdfUrl,
  documentNumber,
  revisionNo,
}: Props) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const displayDate = useMemo(() => formatDisplayDate(reportDate), [reportDate]);

  function buildDefaultSubject() {
    return `${reportTitle} - ${displayDate}`;
  }

  function buildDefaultBody() {
    return [
      "Dear All,",
      "",
      `Please find attached the ${reportTitle.toLowerCase()} for ${displayDate}.`,
      "",
      "Kindly review the attached report.",
      "",
      "Best regards,",
    ].join("\n");
  }

  function handleOpen() {
    setSubject(buildDefaultSubject());
    setBody(buildDefaultBody());
    setOpen(true);
  }

  async function handleSend() {
    const id = toast.loading("Sending report...");

    try {
      setSending(true);

      const res = await fetch("/api/fop/send-report-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to,
          cc,
          subject,
          body,
          reportCode,
          reportDate,
          reportTitle,
          documentNumber,
          pdfUrl,
          revisionNo,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to send email.");
      }

      toast.success("Report sent successfully.", { id });
      setOpen(false);
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error ? error.message : "Failed to send email.",
        { id }
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 transition hover:bg-emerald-500/15"
      >
        Send as Attachment
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60">
          <div className="flex min-h-full items-start justify-center p-6 pt-10">
            <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#071018] text-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="text-lg font-semibold">Send Report</div>

                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-white/10 px-3 py-1.5 text-sm hover:bg-white/10"
                >
                  Close
                </button>
              </div>

              <div className="max-h-[75vh] overflow-y-auto px-5 py-4">
                <div className="grid gap-4">
                  <div>
                    <div className="mb-1 text-sm text-white/70">To</div>
                    <input
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      placeholder="name@company.com; second@company.com"
                      className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <div className="mb-1 text-sm text-white/70">CC</div>
                    <input
                      value={cc}
                      onChange={(e) => setCc(e.target.value)}
                      placeholder="optional"
                      className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <div className="mb-1 text-sm text-white/70">Subject</div>
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <div className="mb-1 text-sm text-white/70">Message</div>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={10}
                      className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
                    />
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/70">
                    Attachment: {documentNumber}.pdf
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSend}
                  disabled={sending || !to.trim()}
                  className="rounded-md border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-300 hover:bg-blue-500/15 disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send Email"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
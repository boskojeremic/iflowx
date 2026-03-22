"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

type Tenant = {
  id: string;
  name: string;
  code: string;
};

type ModuleOption = {
  id: string;
  code: string;
  name: string;
  industryId: string;
  industryName: string;
};

type ReportGroupOption = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
};

type OperationalFunctionOption = {
  id: string;
  name: string;
  abbreviation: string;
};

type ReportRow = {
  id: string;
  code: string;
  name: string;
  responsibleFunctionId: string | null;
  approverFunctionId: string | null;
};

type ReportRowState = {
  responsibleFunctionId: string;
  approverFunctionId: string;
};

type LicenseSummary = {
  seatLimit: number;
  usedSeats: number;
  availableSeats: number;
  validUntil: string | null;
};

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default function ReportAssignmentsPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlModuleId = searchParams?.get("moduleId") ?? "";
  const urlReportGroupId = searchParams?.get("reportGroupId") ?? "";

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [reportGroups, setReportGroups] = useState<ReportGroupOption[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [operationalFunctions, setOperationalFunctions] = useState<
    OperationalFunctionOption[]
  >([]);

  const [selectedModuleId, setSelectedModuleId] = useState(urlModuleId);
  const [selectedReportGroupId, setSelectedReportGroupId] =
    useState(urlReportGroupId);

  const [licenseSummary, setLicenseSummary] = useState<LicenseSummary>({
    seatLimit: 0,
    usedSeats: 0,
    availableSeats: 0,
    validUntil: null,
  });

  const [rowState, setRowState] = useState<Record<string, ReportRowState>>({});
  const [busy, setBusy] = useState(false);
  const [busyReportId, setBusyReportId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const tenantLabel = useMemo(() => {
    if (!tenant) return "—";
    return `${tenant.name} (${tenant.code})`;
  }, [tenant]);

  const validUntilLabel = licenseSummary.validUntil
    ? new Date(licenseSummary.validUntil).toLocaleDateString()
    : "No Expiry";

  function setQueryValues(moduleId: string, reportGroupId: string) {
    const qs = new URLSearchParams(searchParams?.toString() ?? "");

    if (moduleId) qs.set("moduleId", moduleId);
    else qs.delete("moduleId");

    if (reportGroupId) qs.set("reportGroupId", reportGroupId);
    else qs.delete("reportGroupId");

    if (!qs.get("tab")) qs.set("tab", "report-assignments");

    router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
  }

  function buildQuery(moduleId?: string, reportGroupId?: string) {
    const qs = new URLSearchParams();
    if (moduleId) qs.set("moduleId", moduleId);
    if (reportGroupId) qs.set("reportGroupId", reportGroupId);
    const s = qs.toString();
    return `/api/tenant-admin/report-function-assignments${s ? `?${s}` : ""}`;
  }

  async function loadData(
    opts?: {
      moduleId?: string;
      reportGroupId?: string;
      silent?: boolean;
      preserveModule?: boolean;
      preserveGroup?: boolean;
    }
  ) {
    const moduleId = opts?.moduleId ?? selectedModuleId;
    const reportGroupId = opts?.reportGroupId ?? selectedReportGroupId;
    const silent = !!opts?.silent;

    if (!silent) setErr(null);
    setBusy(true);

    try {
      const res = await fetch(buildQuery(moduleId, reportGroupId), {
        cache: "no-store",
      });

      const text = await res.text();
      const ct = res.headers.get("content-type") || "";

      if (!res.ok) {
        const j = safeJson(text);
        const msg = j?.error ? `${j.error}` : `REPORT_ASSIGNMENTS_${res.status}`;
        setErr(msg);
        toast.error(msg);
        return;
      }

      if (!ct.includes("application/json")) {
        setErr("REPORT_ASSIGNMENTS_NOT_JSON");
        toast.error("REPORT_ASSIGNMENTS_NOT_JSON");
        return;
      }

      const data = JSON.parse(text);

      setTenant(data.tenant ?? null);
      setModules(data.modules ?? []);
      setReportGroups(data.reportGroups ?? []);
      setReports(data.reports ?? []);
      setOperationalFunctions(data.operationalFunctions ?? []);
      setLicenseSummary(
        data.licenseSummary ?? {
          seatLimit: 0,
          usedSeats: 0,
          availableSeats: 0,
          validUntil: null,
        }
      );

      if (opts?.preserveModule) {
        setSelectedModuleId(moduleId);
      } else {
        setSelectedModuleId(data.selectedModuleId ?? moduleId ?? "");
      }

      if (opts?.preserveGroup) {
        setSelectedReportGroupId(reportGroupId);
      } else {
        setSelectedReportGroupId(data.selectedReportGroupId ?? reportGroupId ?? "");
      }

      const nextRowState: Record<string, ReportRowState> = {};
      for (const r of data.reports ?? []) {
        nextRowState[r.id] = {
          responsibleFunctionId: r.responsibleFunctionId ?? "",
          approverFunctionId: r.approverFunctionId ?? "",
        };
      }
      setRowState(nextRowState);
    } finally {
      setBusy(false);
    }
  }

  async function handleModuleChange(moduleId: string) {
    setSelectedModuleId(moduleId);
    setSelectedReportGroupId("");
    setReports([]);
    setRowState({});
    setLicenseSummary({
      seatLimit: 0,
      usedSeats: 0,
      availableSeats: 0,
      validUntil: null,
    });

    setQueryValues(moduleId, "");

    await loadData({
      moduleId,
      reportGroupId: "",
      preserveModule: true,
      preserveGroup: true,
    });
  }

  async function handleGroupChange(reportGroupId: string) {
    setSelectedReportGroupId(reportGroupId);
    setQueryValues(selectedModuleId, reportGroupId);

    await loadData({
      moduleId: selectedModuleId,
      reportGroupId,
      preserveModule: true,
      preserveGroup: true,
    });
  }

  function updateRow(reportId: string, patch: Partial<ReportRowState>) {
    setRowState((prev) => ({
      ...prev,
      [reportId]: {
        responsibleFunctionId: prev[reportId]?.responsibleFunctionId ?? "",
        approverFunctionId: prev[reportId]?.approverFunctionId ?? "",
        ...patch,
      },
    }));
  }

  async function saveRow(reportId: string) {
    const state = rowState[reportId] ?? {
      responsibleFunctionId: "",
      approverFunctionId: "",
    };

    try {
      setBusyReportId(reportId);

      const res = await fetch("/api/tenant-admin/report-function-assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportId,
          responsibleFunctionId: state.responsibleFunctionId || null,
          approverFunctionId: state.approverFunctionId || null,
        }),
      });

      const text = await res.text();
      const data = safeJson(text);

      if (!res.ok) {
        if (data?.error === "LICENSE_LIMIT_EXCEEDED") {
          toast.error(
            `License limit exceeded (${data?.details?.usedSeats}/${data?.details?.seatLimit})`
          );
        } else {
          toast.error(data?.error || "FAILED_TO_SAVE_ASSIGNMENT");
        }
        return;
      }

      toast.success("Report assignment saved");

      setLicenseSummary(
        data?.licenseSummary ?? {
          seatLimit: 0,
          usedSeats: 0,
          availableSeats: 0,
          validUntil: null,
        }
      );

      await loadData({
        moduleId: selectedModuleId,
        reportGroupId: selectedReportGroupId,
        silent: true,
        preserveModule: true,
        preserveGroup: true,
      });
    } finally {
      setBusyReportId(null);
    }
  }

  useEffect(() => {
    setSelectedModuleId(urlModuleId);
    setSelectedReportGroupId(urlReportGroupId);
    void loadData({
      moduleId: urlModuleId,
      reportGroupId: urlReportGroupId,
      silent: true,
      preserveModule: true,
      preserveGroup: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlModuleId, urlReportGroupId]);

  return (
    <div className="space-y-4">
      <div className="text-sm text-white/70">
        Assign Responsible and Approver operational functions to tenant reports.
      </div>

      {err ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-wider text-white/50">
            Tenant
          </div>
          <div className="h-10 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-white/80 flex items-center">
            {tenantLabel}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-4">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-white/50">
              Module
            </div>
            <select
              className="h-10 w-full rounded-md border border-white/10 bg-[#1f2a26] px-3 text-sm text-white outline-none"
              value={selectedModuleId}
              onChange={(e) => void handleModuleChange(e.target.value)}
              disabled={busy}
            >
              <option value="" className="bg-[#1f2a26] text-white">
                Select Module
              </option>
              {modules.map((m) => (
                <option
                  key={m.id}
                  value={m.id}
                  className="bg-[#1f2a26] text-white"
                >
                  {m.industryName} / {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-4">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-white/50">
              Report Group
            </div>
            <select
              className="h-10 w-full rounded-md border border-white/10 bg-[#1f2a26] px-3 text-sm text-white outline-none"
              value={selectedReportGroupId}
              onChange={(e) => void handleGroupChange(e.target.value)}
              disabled={busy || !selectedModuleId}
            >
              <option value="" className="bg-[#1f2a26] text-white">
                Select Report Group
              </option>
              {reportGroups.map((g) => (
                <option
                  key={g.id}
                  value={g.id}
                  className="bg-[#1f2a26] text-white"
                >
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-3">
            <div className="text-[11px] uppercase tracking-wider text-white/50">
              Purchased Licenses
            </div>
            <div className="mt-1 text-lg font-semibold text-white">
              {licenseSummary.seatLimit}
            </div>
          </div>

          <div className="col-span-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-3">
            <div className="text-[11px] uppercase tracking-wider text-white/50">
              Used Licenses
            </div>
            <div className="mt-1 text-lg font-semibold text-amber-300">
              {licenseSummary.usedSeats}
            </div>
          </div>

          <div className="col-span-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-3">
            <div className="text-[11px] uppercase tracking-wider text-white/50">
              Available Licenses
            </div>
            <div className="mt-1 text-lg font-semibold text-emerald-300">
              {licenseSummary.availableSeats}
            </div>
          </div>

          <div className="col-span-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-3">
            <div className="text-[11px] uppercase tracking-wider text-white/50">
              License Valid Until
            </div>
            <div className="mt-1 text-lg font-semibold text-cyan-300">
              {validUntilLabel}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-wider text-white/50">
          Reports
        </div>

        <div className="grid grid-cols-12 gap-2 bg-white/[0.04] px-3 py-2 text-xs uppercase tracking-wider text-white/50">
          <div className="col-span-4">Report</div>
          <div className="col-span-3">Responsible</div>
          <div className="col-span-3">Approver</div>
          <div className="col-span-2 text-center">Actions</div>
        </div>

        <div className="max-h-[420px] overflow-y-auto divide-y divide-white/10 pb-2">
          {reports.map((r) => {
            const state = rowState[r.id] ?? {
              responsibleFunctionId: "",
              approverFunctionId: "",
            };

            return (
              <div
                key={r.id}
                className="grid grid-cols-12 gap-2 px-3 py-2 text-sm items-center"
              >
                <div className="col-span-4 text-white/80">
                  <div className="truncate">{r.name}</div>
                </div>

                <div className="col-span-3">
                  <select
                    className="h-9 w-full rounded-md border border-white/10 bg-white/[0.04] px-2 text-sm text-white/80 outline-none"
                    value={state.responsibleFunctionId}
                    onChange={(e) =>
                      updateRow(r.id, {
                        responsibleFunctionId: e.target.value,
                      })
                    }
                    disabled={busy}
                  >
                    <option value="">Select Responsible</option>
                    {operationalFunctions.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-3">
                  <select
                    className="h-9 w-full rounded-md border border-white/10 bg-white/[0.04] px-2 text-sm text-white/80 outline-none"
                    value={state.approverFunctionId}
                    onChange={(e) =>
                      updateRow(r.id, {
                        approverFunctionId: e.target.value,
                      })
                    }
                    disabled={busy}
                  >
                    <option value="">Select Approver</option>
                    {operationalFunctions.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 flex justify-center">
                  <button
                    onClick={() => void saveRow(r.id)}
                    disabled={busy || busyReportId === r.id}
                    className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {busyReportId === r.id ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            );
          })}

          {reports.length === 0 && (
            <div className="px-3 py-6 text-sm text-white/50">
              Select module and report group to load reports.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
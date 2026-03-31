"use client";

type ModuleItem = {
  id: string;
  code: string;
  name: string;
};

type ReportGroupItem = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
};

type ReportItem = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
};

export default function ReportAssignmentsFilters(props: {
  modules: ModuleItem[];
  reportGroups: ReportGroupItem[];
  reports: ReportItem[];
  selectedModuleId: string;
  selectedReportGroupId: string;
  selectedReportId: string;
  q: string;
}) {
  return (
    <form
      id="reportAssignmentsFilters"
      method="GET"
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
    >
      <div className="mb-4 text-xs uppercase tracking-wider text-white/40">
        Filters
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">
            Module
          </label>
          <select
            name="moduleId"
            defaultValue={props.selectedModuleId}
            onChange={(e) => {
              const form = e.currentTarget.form;
              if (!form) return;

              const rg = form.elements.namedItem("reportGroupId") as HTMLSelectElement | null;
              const r = form.elements.namedItem("reportId") as HTMLSelectElement | null;
              const qInput = form.elements.namedItem("q") as HTMLInputElement | null;

              if (rg) rg.value = "";
              if (r) r.value = "";
              if (qInput) qInput.value = "";

              form.requestSubmit();
            }}
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
          >
            <option value="">Select Module</option>
            {props.modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">
            Report Group
          </label>
          <select
            name="reportGroupId"
            defaultValue={props.selectedReportGroupId}
            onChange={(e) => {
              const form = e.currentTarget.form;
              if (!form) return;

              const r = form.elements.namedItem("reportId") as HTMLSelectElement | null;
              const qInput = form.elements.namedItem("q") as HTMLInputElement | null;

              if (r) r.value = "";
              if (qInput) qInput.value = "";

              form.requestSubmit();
            }}
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
          >
            <option value="">Select Report Group</option>
            {props.reportGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">
            Report
          </label>
          <select
            name="reportId"
            defaultValue={props.selectedReportId}
            onChange={(e) => {
              const form = e.currentTarget.form;
              if (!form) return;
              form.requestSubmit();
            }}
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
          >
            <option value="">Select Report</option>
            {props.reports.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">
            Search MPs
          </label>
          <input
            name="q"
            defaultValue={props.q}
            placeholder="Tag, description, source tag..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const form = e.currentTarget.form;
                if (!form) return;
                e.preventDefault();
                form.requestSubmit();
              }
            }}
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
          />
        </div>
      </div>
    </form>
  );
}
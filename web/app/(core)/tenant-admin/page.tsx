"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

import TenantUsersPanel from "@/components/tenant-admin/TenantUsersPanel";
import TenantRolesPanel from "@/components/tenant-admin/TenantRolesPanel";
import ReportAssignmentsPanel from "@/components/tenant-admin/ReportAssignmentsPanel";
import TechnicalSetupPanel from "@/components/tenant-admin/TechnicalSetupPanel";

const tabs = [
  { key: "users", label: "Users" },
  { key: "roles", label: "Roles" },
  { key: "report-assignments", label: "Report Assignments" },
  ] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function TenantAdminPage() {
  const sp = useSearchParams();
  const tab = ((sp?.get("tab") as TabKey | null) ?? "users");

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tenant Admin</h1>
        <p className="mt-1 text-sm text-white/60">
          Tenant Governance, Roles, Report Assignments, And Technical Setup
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => {
          const active = tab === t.key;

          return (
            <Link
              key={t.key}
              href={`/tenant-admin?tab=${t.key}`}
              className={`px-4 py-2 rounded-md border text-sm font-medium transition ${
                active
                  ? "bg-blue-600 text-white border-blue-500"
                  : "bg-white/5 text-white border-white/10 hover:bg-white/10"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        {tab === "users" && <TenantUsersPanel />}
        {tab === "roles" && <TenantRolesPanel />}
        {tab === "report-assignments" && <ReportAssignmentsPanel />}
</div>
    </div>
  );
}
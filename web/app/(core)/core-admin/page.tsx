"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import IndustryPanel from "@/components/core-admin/IndustryPanel";
import ModulesPanel from "@/components/core-admin/ModulesPanel";
import ReportGroupsPanel from "@/components/core-admin/ReportGroupsPanel";
import ReportsPanel from "@/components/core-admin/ReportsPanel";
import LicensingPanel from "@/components/core-admin/LicensingPanel";
import TenantsPanel from "@/components/core-admin/TenantsPanel";
import UsersPanel from "@/components/core-admin/UsersPanel";
import TenantControlPanel from "@/components/core-admin/TenantControlPanel";

const tabs = [
  { key: "industry", label: "Industry" },
  { key: "modules", label: "Modules" },
  { key: "report-groups", label: "Report Groups" },
  { key: "reports", label: "Reports" },
  { key: "tenants", label: "Tenants" },
  { key: "licensing", label: "Licensing" },
  { key: "users", label: "Users" },
  { key: "tenant-control", label: "Tenant Control" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function CoreAdminPage() {
  const sp = useSearchParams();
  const rawTab = sp?.get("tab");

  const tab: TabKey = tabs.some((t) => t.key === rawTab)
    ? (rawTab as TabKey)
    : "industry";

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="flex min-h-0 h-[calc(100vh-7rem)] flex-col">
          <div className="mb-6 shrink-0">
            <h1 className="text-2xl font-semibold tracking-tight">Core Admin</h1>
            <p className="mt-1 text-sm text-white/60">
              Global configuration (Industries / Modules / Report Groups / Reports) + Tenant governance
            </p>
          </div>

          <div className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/[0.03] shadow-sm">
            <div className="shrink-0 border-b border-white/10 p-4">
              <div className="flex flex-wrap gap-2">
                {tabs.map((t) => {
                  const active = tab === t.key;

                  return (
                    <Link
                      key={t.key}
                      href={`/core-admin?tab=${t.key}`}
                      scroll={false}
                      className={[
                        "inline-flex items-center rounded-lg px-3 py-2 text-sm transition",
                        "border border-white/10 hover:bg-white/10",
                        active ? "border-white/20 bg-white/15" : "bg-white/[0.04]",
                      ].join(" ")}
                    >
                      {t.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col p-6">
              <div className="mb-4 shrink-0">
                <div className="text-xs uppercase tracking-wider text-white/40">
                  {tabs.find((t) => t.key === tab)?.label}
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-white/10 bg-black/20 p-4">
                {tab === "industry" && <IndustryPanel />}
                {tab === "modules" && <ModulesPanel />}
                {tab === "report-groups" && <ReportGroupsPanel />}
                {tab === "reports" && <ReportsPanel />}
                {tab === "tenants" && <TenantsPanel />}
                {tab === "licensing" && <LicensingPanel />}
                {tab === "users" && <UsersPanel />}
                {tab === "tenant-control" && <TenantControlPanel />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import TenantControlPanel from "@/components/core-admin/TenantControlPanel";
import IndustryPanel from "@/components/core-admin/IndustryPanel";

const tabs = [
  { key: "industry", label: "Industry" },
  { key: "modules", label: "Modules" },
  { key: "tenants", label: "Tenants" },
  { key: "tenant-control", label: "Tenant Control" },
  { key: "licensing", label: "Licensing" },
  { key: "users", label: "Users" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function CoreAdminClient({ tab }: { tab: string }) {
  const activeTab: TabKey =
    (tabs.find((t) => t.key === tab)?.key as TabKey) ?? "industry";

  return (
    <div className="max-w-5xl mx-auto text-white">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Core Admin</h1>
        <p className="text-xs text-white/70">
          Global configuration + Tenant governance
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => {
          const active = activeTab === t.key;
          return (
            <Link
              key={t.key}
              href={`/core-admin?tab=${t.key}`}
              className={cn(
                "inline-flex items-center rounded-md border border-white/15 px-3 py-2 text-sm",
                "bg-white/5 hover:bg-white/10",
                active && "bg-white/15 border-white/25"
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* Panel */}
      <div className="rounded-lg border border-white/15 p-4 bg-white/5">
        {activeTab === "industry" && (
  <div style={{color:"red"}}>AKO OVO VIDIS, MENJAM PRAVI FAJL</div>
)}        {activeTab === "modules" && <div>Modules form</div>}
        {activeTab === "tenants" && <div>Tenants form</div>}
        {activeTab === "tenant-control" && <TenantControlPanel />}
        {activeTab === "licensing" && <div>Licensing form</div>}
        {activeTab === "users" && <div>Users form</div>}
      </div>
    </div>
  );
}
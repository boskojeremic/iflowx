"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import IndustryPanel from "@/components/core-admin/IndustryPanel";
import ModulesPanel from "@/components/core-admin/ModulesPanel";
import LicensingPanel from "@/components/core-admin/LicensingPanel";
import TenantsPanel from "@/components/core-admin/TenantsPanel";
import UsersPanel from "@/components/core-admin/UsersPanel";
import TenantControlPanel from "@/components/core-admin/TenantControlPanel";

const tabs = [
  { key: "industry", label: "Industry" },
  { key: "modules", label: "Modules" },
  { key: "tenants", label: "Tenants" },
  { key: "licensing", label: "Licensing" },
  { key: "users", label: "Users" },
  { key: "tenant-control", label: "Tenant Control" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function CoreAdminPage() {
  const sp = useSearchParams();
  const tab = ((sp?.get("tab") as TabKey | null) ?? "industry");

  return (
    // ✅ make page a height container
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        {/* Card becomes a fixed-height layout inside viewport */}
        <div className="flex flex-col h-[calc(100vh-7rem)] min-h-0">
          {/* Header */}
          <div className="mb-6 shrink-0">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Core Admin</h1>
                <p className="mt-1 text-sm text-white/60">
                  Global configuration (Industries / Modules) + Tenant governance
                </p>
              </div>
            </div>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] shadow-sm flex flex-col min-h-0">
            {/* Tabs row */}
            <div className="border-b border-white/10 p-4 shrink-0">
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
                        active ? "bg-white/15 border-white/20" : "bg-white/[0.04]",
                      ].join(" ")}
                    >
                      {t.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col min-h-0">
              <div className="mb-4 shrink-0">
                <div className="text-xs uppercase tracking-wider text-white/40">
                  {tabs.find((t) => t.key === tab)?.label}
                </div>
              </div>

              {/* ✅ IMPORTANT: this is the scroll boundary container */}
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 flex-1 min-h-0 overflow-hidden">
                {/* If you want OTHER tabs to scroll too, wrap them with overflow-y-auto.
                    For now, we keep them as-is and TenantControl handles its own scroll. */}
                {tab === "industry" && <IndustryPanel />}
                {tab === "modules" && <ModulesPanel />}
                {tab === "tenants" && <TenantsPanel />}
                {tab === "licensing" && <LicensingPanel />}
                {tab === "users" && <UsersPanel />}

                {/* ✅ TenantControl uses h-full/min-h-0 internally */}
                {tab === "tenant-control" && <TenantControlPanel />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
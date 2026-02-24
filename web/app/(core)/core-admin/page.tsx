"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

export default function CoreAdminPage() {
  const sp = useSearchParams();
const tab = ((sp?.get("tab") as TabKey | null) ?? "industry");

  return (
  <div className="mx-auto w-full max-w-5xl px-6 py-8">
    {/* Header */}
    <div className="mb-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Core Admin</h1>
          <p className="mt-1 text-sm text-white/60">
            Global configuration (Industries / Platforms / Modules) + Tenant governance
          </p>
          {/* DEBUG */}
          <div className="mt-2 text-xs text-white/40">TAB = {tab}</div>
        </div>
      </div>
    </div>

    {/* Card */}
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] shadow-sm">
      {/* Tabs row */}
      <div className="border-b border-white/10 p-4">
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
      <div className="p-6">
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wider text-white/40">
            {tabs.find((t) => t.key === tab)?.label}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          {tab === "industry" && <IndustryPanel />}
          {tab === "modules" && <div>Modules form</div>}
          {tab === "tenants" && <div>Tenants form</div>}
          {tab === "tenant-control" && <div>Tenant Control form</div>}
          {tab === "licensing" && <div>Licensing form</div>}
          {tab === "users" && <div>Users form</div>}
        </div>
      </div>
    </div>
  </div>
);
}
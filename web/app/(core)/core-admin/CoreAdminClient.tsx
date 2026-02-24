"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "industry", label: "Industry" },
  { key: "modules", label: "Modules" },
  { key: "tenants", label: "Tenants" },
  { key: "tenant-control", label: "Tenant Control" },
  { key: "licensing", label: "Licensing" },
  { key: "users", label: "Users" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function CoreAdminClient() {
  const sp = useSearchParams();
  const tab = (sp.get("tab") as TabKey) ?? "industry";

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Core Admin</h1>

        {/* DEBUG - možeš posle da obrišeš */}
        <div className="text-xs opacity-60">TAB = {tab}</div>

        <p className="text-xs opacity-70">
          Global configuration (Industries / Platforms / Modules) + Tenant governance
        </p>
      </div>

      {/* Tabs row */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <Link
              key={t.key}
              href={`/core-admin?tab=${t.key}`}
              scroll={false}
              className={cn(
                "inline-flex items-center rounded-md border px-3 py-2 text-sm",
                "hover:bg-sidebar-accent/40",
                active && "bg-sidebar-accent"
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* Content */}
      <div className="rounded-lg border p-4">
        {tab === "industry" && <div>Industry form</div>}
        {tab === "modules" && <div>Modules form</div>}
        {tab === "tenants" && <div>Tenants form</div>}
        {tab === "tenant-control" && <div>Tenant Control form</div>}
        {tab === "licensing" && <div>Licensing form</div>}
        {tab === "users" && <div>Users form</div>}
      </div>
    </div>
  );
}
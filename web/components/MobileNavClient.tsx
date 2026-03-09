"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useState } from "react";
import {
  Home,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
  Wrench,
  Menu,
  X,
  Package,
  Factory,
  Flame,
  BarChart3,
  Boxes,
  FileCheck,
} from "lucide-react";

type SidebarModule = { code: string; label: string; href: string };
type SidebarGroupData = { key: string; title: string; items: SidebarModule[] };

function moduleIcon(code: string) {
  switch ((code || "").toUpperCase()) {
    case "PRO":
      return <Package className="h-4 w-4 shrink-0" />;
    case "FOP":
      return <Factory className="h-4 w-4 shrink-0" />;
    case "GHG":
      return <Flame className="h-4 w-4 shrink-0" />;
    case "REP":
      return <BarChart3 className="h-4 w-4 shrink-0" />;
    case "HSE":
      return <ShieldCheck className="h-4 w-4 shrink-0" />;
    case "ESG":
      return <FileCheck className="h-4 w-4 shrink-0" />;
    default:
      return <Boxes className="h-4 w-4 shrink-0" />;
  }
}

export default function MobileNavClient({
  groups,
  showCoreAdmin,
  showTenantAdmin,
  showMasterDataAdmin,
}: {
  groups: SidebarGroupData[];
  showCoreAdmin: boolean;
  showTenantAdmin: boolean;
  showMasterDataAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-[#0b0f0d] px-3 text-white">
        <div className="text-sm font-semibold tracking-wide">IFlowX</div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-[#151a18]"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={close}
        />

        <div
          className={`absolute left-0 top-0 h-full w-[320px] max-w-[88vw] overflow-y-auto border-r border-white/10 bg-[#0b0f0d] text-white shadow-2xl transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-14 items-center justify-between border-b border-white/10 bg-[#0b0f0d] px-3">
            <div className="text-sm font-semibold tracking-wide">IFlowX</div>
            <button
              type="button"
              onClick={close}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-[#151a18]"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 bg-[#0b0f0d] p-3">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase opacity-60">
                General
              </div>

              <Link
                href="/home"
                onClick={close}
                className="flex items-center gap-2 rounded-md border border-white/10 bg-[#151a18] px-3 py-2 text-sm"
              >
                <Home className="h-4 w-4" />
                HOME
              </Link>
            </div>

            {(showCoreAdmin || showTenantAdmin || showMasterDataAdmin) && (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase opacity-60">
                  Admin
                </div>

                {showCoreAdmin && (
                  <Link
                    href="/core-admin?tab=industry"
                    onClick={close}
                    className="flex items-center gap-2 rounded-md border border-white/10 bg-[#151a18] px-3 py-2 text-sm"
                  >
                    <Settings className="h-4 w-4" />
                    CORE ADMIN
                  </Link>
                )}

                {showTenantAdmin && (
                  <Link
                    href="/tenant-admin?tab=users"
                    onClick={close}
                    className="flex items-center gap-2 rounded-md border border-white/10 bg-[#151a18] px-3 py-2 text-sm"
                  >
                    <Users className="h-4 w-4" />
                    TENANT ADMIN
                  </Link>
                )}

                {showMasterDataAdmin && (
                  <Link
                    href="/master-data"
                    onClick={close}
                    className="flex items-center gap-2 rounded-md border border-white/10 bg-[#151a18] px-3 py-2 text-sm"
                  >
                    <Wrench className="h-4 w-4" />
                    MASTER DATA ADMIN
                  </Link>
                )}
              </div>
            )}

            {groups.map((group) => (
              <div key={group.key} className="space-y-2">
                <div className="text-[11px] font-semibold uppercase opacity-60">
                  {group.title}
                </div>

                <div className="space-y-2">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={close}
                      className="flex items-start gap-2 rounded-md border border-white/10 bg-[#151a18] px-3 py-2 text-sm"
                    >
                      {moduleIcon(item.code)}
                      <span className="leading-snug">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-2 rounded-md border border-white/10 bg-[#151a18] px-3 py-2 text-sm"
              >
                <LogOut className="h-4 w-4" />
                LOGOUT
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
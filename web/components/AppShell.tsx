"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavGroup } from "@/types/nav";

export function AppShell({
  children,
  navTitle,
  navSubtitle,
  navGroups,
  showSuperAdmin,
  superAdminHref,
}: {
  children: React.ReactNode;
  navTitle: string;
  navSubtitle?: string;
  navGroups: NavGroup[];
  showSuperAdmin: boolean;
  superAdminHref: string;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen text-white">
      <div className="flex">
        <aside className="w-[280px] shrink-0 border-r border-white/10 p-4">
          <div className="mb-4">
            <div className="text-sm opacity-80">{navTitle}</div>
            {navSubtitle && <div className="text-xs text-white/50">{navSubtitle}</div>}
          </div>

          {showSuperAdmin && (
            <Link
              href={superAdminHref}
              className="mb-4 block rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
            >
              Super Admin
            </Link>
          )}

          <div className="space-y-4">
            {navGroups.map((g) => (
              <div key={g.title}>
                <div className="mb-2 text-[12px] font-semibold tracking-wide text-white/70">
                  {g.title}
                </div>

                <div className="space-y-2">
                  {g.items.map((it) => {
                    const active = pathname === it.href || pathname.startsWith(it.href + "/");
                    return (
                      <Link
                        key={it.href}
                        href={it.href}
                        className={[
                          "block rounded-lg border px-3 py-2 text-sm",
                          active
                            ? "border-white/25 bg-white/15"
                            : "border-white/10 bg-white/5 hover:bg-white/10",
                        ].join(" ")}
                      >
                        {it.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
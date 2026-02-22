import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import { getServerSession } from "next-auth/next";

import "./globals.css";

import LogoutButton from "@/components/LogoutButton";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IFlowX",
  description: "GHG Emissions Web App",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = (await getServerSession(authOptions as any)) as any;
  const email = session?.user?.email;

  // Ako nije ulogovan, middleware ga već šalje na /login,
  // ali ovo je dodatna sigurnost da layout ne radi DB hit bez email-a.
  if (!email) {
    // Ne redirectujemo ovde da ne pravimo loop (login page već radi svoje).
    // Samo renderujemo layout bez Licensor dugmeta.
  }

  const me = email
    ? await db.user.findUnique({
        where: { email: String(email) },
        select: { isSuperAdmin: true },
      })
    : null;

  const isSuperAdmin = Boolean(me?.isSuperAdmin);

  return (
  <html lang="en" suppressHydrationWarning>
    <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-4 backdrop-blur">
        <div className="flex items-center gap-3">
          {/* Uklonili smo SidebarTrigger */}
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-white/10 ring-1 ring-white/10 flex items-center justify-center">
              <span className="text-sm font-bold text-white/90">DO</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white/95">
                DigitalOps Consulting
              </div>
              <div className="text-[11px] text-white/70">
                GHG Emissions Platform
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {isSuperAdmin && (
            <Link
              href="/core-admin/tenants"
              className="px-3 py-1 border border-white/20 rounded hover:bg-white/10 text-white/80"
            >
              Licensor
            </Link>
          )}

          <LogoutButton className="px-3 py-1 border border-white/20 rounded hover:bg-white/10 text-white/80" />
          <div className="text-white/60">Pilot</div>
        </div>
      </header>

      <main className="min-h-[calc(100vh-3.5rem)] p-6">{children}</main>
    </body>
  </html>
);
}
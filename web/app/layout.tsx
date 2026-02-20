import LogoutButton from "@/components/LogoutButton";
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import AppSidebar from "@/components/app-sidebar"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "IFlowX",
  description: "GHG Emissions Web App",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SidebarProvider>
          <AppSidebar />

          <SidebarInset>
            <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="text-white/90" />

                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-xl bg-white/10 ring-1 ring-white/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-white/90">DO</span>
                  </div>
                  <div className="leading-tight">
                    <div className="text-sm font-semibold text-white/95">DigitalOps Consulting</div>
                    <div className="text-[11px] text-white/70">GHG Emissions Platform</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
  <a
    href="/admin"
    className="px-3 py-1 border border-white/20 rounded hover:bg-white/10 text-white/80"
  >
    Licensor
  </a>

  <a
    href="/app"
    className="px-3 py-1 border border-white/20 rounded hover:bg-white/10 text-white/80"
  >
    App
  </a>

  <LogoutButton />

  <div className="text-white/60">Pilot</div>
</div>
            </header>

            <main className="min-h-[calc(100vh-3.5rem)] p-6">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  )
}

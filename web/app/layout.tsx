import "./globals.css";
import type { Viewport } from "next";
import { getPortalNavForUserTenant } from "@/lib/portal-nav";
import MobileNavClient from "@/components/MobileNavClient";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
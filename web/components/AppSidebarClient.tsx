"use client";

import * as React from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  Home,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
  Wrench,
  Menu,
  X,
} from "lucide-react";
import {
  Package,
  Factory,
  Flame,
  BarChart3,
  Boxes,
  FileCheck,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type SidebarModule = { code: string; label: string; href: string };
type SidebarGroupData = { key: string; title: string; items: SidebarModule[] };

const moduleIcon = (code: string) => {
  switch ((code || "").toUpperCase()) {
    case "PRO":
      return <Package className="mr-2 h-4 w-4 shrink-0" />;
    case "FOP":
      return <Factory className="mr-2 h-4 w-4 shrink-0" />;
    case "GHG":
      return <Flame className="mr-2 h-4 w-4 shrink-0" />;
    case "REP":
      return <BarChart3 className="mr-2 h-4 w-4 shrink-0" />;
    case "HSE":
      return <ShieldCheck className="mr-2 h-4 w-4 shrink-0" />;
    case "ESG":
      return <FileCheck className="mr-2 h-4 w-4 shrink-0" />;
    default:
      return <Boxes className="mr-2 h-4 w-4 shrink-0" />;
  }
};

export default function AppSidebarClient({
  groups,
  showCoreAdmin,
  showTenantAdmin,
  showMasterDataAdmin,
  mobileOpen,
  setMobileOpen,
}: {
  groups: SidebarGroupData[];
  showCoreAdmin: boolean;
  showTenantAdmin: boolean;
  showMasterDataAdmin: boolean;
  mobileOpen: boolean;
  setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const showAdminGroup =
    showCoreAdmin || showTenantAdmin || showMasterDataAdmin;

  const closeMobile = () => setMobileOpen(false);

  const sidebarBody = (
    <Sidebar
      collapsible="icon"
      className="bg-sidebar text-sidebar-foreground h-full"
    >
      <SidebarHeader className="px-3 py-3">
        <div className="text-sm font-semibold tracking-wide">IFlowX</div>
        <div className="text-xs opacity-70">Pilot</div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className="w-full justify-start cursor-pointer uppercase tracking-wide"
                >
                  <Link
                    href="/home"
                    className="flex items-center"
                    onClick={closeMobile}
                  >
                    <Home className="mr-2 h-4 w-4" />
                    HOME
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showAdminGroup && (
          <SidebarGroup>
            <SidebarGroupLabel>ADMIN</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {showCoreAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className="w-full justify-start cursor-pointer uppercase tracking-wide"
                    >
                      <Link
                        href="/core-admin?tab=industry"
                        className="flex items-center"
                        onClick={closeMobile}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        CORE ADMIN
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {showTenantAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className="w-full justify-start cursor-pointer uppercase tracking-wide"
                    >
                      <Link
                        href="/tenant-admin?tab=users"
                        className="flex items-center"
                        onClick={closeMobile}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        TENANT ADMIN
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {showMasterDataAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className="w-full justify-start cursor-pointer uppercase tracking-wide"
                    >
                      <Link
                        href="/master-data"
                        className="flex items-center"
                        onClick={closeMobile}
                      >
                        <Wrench className="mr-2 h-4 w-4" />
                        MASTER DATA ADMIN
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {groups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      className="h-auto w-full justify-start py-2"
                    >
                      <Link
                        href={item.href}
                        className="flex w-full items-start gap-2"
                        onClick={closeMobile}
                      >
                        {moduleIcon(item.code)}
                        <span className="whitespace-normal break-words text-left leading-snug">
                          {item.label}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="px-3 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <SidebarMenuButton className="w-full justify-start cursor-pointer uppercase tracking-wide">
                  <LogOut className="mr-2 h-4 w-4" />
                  LOGOUT
                </SidebarMenuButton>
              </AlertDialogTrigger>

              <AlertDialogContent className="border border-white/15 bg-[#0b0f0d] text-white shadow-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Log out?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to log out of the application?
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel className="border border-white/15 bg-white/10 text-white hover:bg-white/15">
                    Cancel
                  </AlertDialogCancel>

                  <AlertDialogAction
                    className="bg-green-600 text-white hover:bg-green-700"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                  >
                    Logout
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );

  return (
    <SidebarProvider>
      <>
        {/* Mobile top bar */}
        <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-3 md:hidden">
          <div className="text-sm font-semibold tracking-wide">IFlowX</div>
          <button
            type="button"
            aria-label="Open menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden md:block">{sidebarBody}</div>

        {/* Mobile sidebar overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-[280px] max-w-[85vw] bg-background shadow-xl">
              <div className="flex h-14 items-center justify-between border-b px-3">
                <div className="text-sm font-semibold tracking-wide">IFlowX</div>
                <button
                  type="button"
                  aria-label="Close menu"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="h-[calc(100%-56px)]">{sidebarBody}</div>
            </div>
          </div>
        )}
      </>
    </SidebarProvider>
  );
}
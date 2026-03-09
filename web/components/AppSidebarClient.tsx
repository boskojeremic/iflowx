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
}: {
  groups: SidebarGroupData[];
  showCoreAdmin: boolean;
  showTenantAdmin: boolean;
  showMasterDataAdmin: boolean;
}) {
  const showAdminGroup =
    showCoreAdmin || showTenantAdmin || showMasterDataAdmin;

  return (
    <SidebarProvider>
      <div className="hidden md:block">
        <Sidebar collapsible="icon" className="bg-sidebar text-sidebar-foreground">
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
                      <Link href="/home" className="flex items-center">
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
                          <Link href="/master-data" className="flex items-center">
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
                          className="w-full justify-start h-auto py-2"
                        >
                          <Link
                            href={item.href}
                            className="flex items-start gap-2 w-full"
                          >
                            {moduleIcon(item.code)}
                            <span className="whitespace-normal break-words leading-snug text-left">
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

                  <AlertDialogContent className="bg-[#0b0f0d] border border-white/15 text-white shadow-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Log out?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to log out of the application?
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-white/10 hover:bg-white/15 text-white border border-white/15">
                        Cancel
                      </AlertDialogCancel>

                      <AlertDialogAction
                        className="bg-green-600 hover:bg-green-700 text-white"
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
      </div>
    </SidebarProvider>
  );
}
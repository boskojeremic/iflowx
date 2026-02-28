"use client";

import * as React from "react";
import Link from "next/link";
import { Home, LogOut, Settings } from "lucide-react";
import { signOut } from "next-auth/react";
import { Package, Factory, Flame, BarChart3, Boxes } from "lucide-react";

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
  switch (code) {
    case "PRO":
      return <Package className="mr-2 h-4 w-4" />;
    case "FOP":
      return <Factory className="mr-2 h-4 w-4" />;
    case "GHG":
      return <Flame className="mr-2 h-4 w-4" />;
    case "REP":
      return <BarChart3 className="mr-2 h-4 w-4" />;
    default:
      return <Boxes className="mr-2 h-4 w-4" />;
  }
};

export default function AppSidebarClient({
  groups,
  showCoreAdmin,
}: {
  groups: SidebarGroupData[];
  showCoreAdmin: boolean;
}) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="bg-sidebar text-sidebar-foreground">
        <SidebarHeader className="px-3 py-3">
          <div className="text-sm font-semibold tracking-wide">IFlowX</div>
          <div className="text-xs opacity-70">Pilot</div>
        </SidebarHeader>

        <SidebarContent>
          {/* HOME */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="w-full justify-start">
                    <Link href="/home">
                      <Home className="mr-2 h-4 w-4" />
                      Home
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* SUPER ADMIN */}
          {showCoreAdmin && (
            <SidebarGroup>
              <SidebarGroupLabel>Admin</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="w-full justify-start">
                      <Link href="/core-admin?tab=industry">
                        <Settings className="mr-2 h-4 w-4" />
                        Core Admin
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* DYNAMIC GROUPS */}
          {groups.map((group) => (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild className="w-full justify-start">
                        <Link href={item.href} className="flex items-center">
  {moduleIcon(item.code)}
  {item.label}
</Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        {/* LOGOUT (dole) */}
        <SidebarFooter className="px-3 pb-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <SidebarMenuButton className="w-full justify-start cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
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
    </SidebarProvider>
  );
}
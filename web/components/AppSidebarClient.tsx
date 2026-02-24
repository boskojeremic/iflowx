"use client";

import * as React from "react";
import Link from "next/link";
import { Home, LogOut, Settings } from "lucide-react";
import { signOut } from "next-auth/react";

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

type SidebarModule = { label: string; href: string };
type SidebarGroupData = { title: string; items: SidebarModule[] };

export default function AppSidebarClient({
  groups,
  showCoreAdmin,
}: {
  groups: SidebarGroupData[];
  showCoreAdmin: boolean;
}) {
  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    window.location.href = "/login";
  }

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
                  <SidebarMenuButton
                    asChild
                    className="w-full justify-start"
                  >
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
          <SidebarMenuButton
            asChild
            className="w-full justify-start"
          >
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
                      <SidebarMenuButton
                        asChild
                        className="w-full justify-start"
                      >
                        <Link href={item.href}>
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

        {/* LOGOUT */}
        <SidebarFooter className="px-3 pb-3">
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton
        className="w-full justify-start cursor-pointer"
        onClick={() => {
          const confirmed = window.confirm(
            "Are you sure you want to log out of the application?"
          );

          if (confirmed) {
            signOut({ callbackUrl: "/login" });
          }
        }}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Logout
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
</SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  );
}
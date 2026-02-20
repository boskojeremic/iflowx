"use client";

import * as React from "react";
import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const nav = [
  { title: "Dashboard", href: "/" },
  { title: "Projects", href: "/projects" },
  { title: "Activity", href: "/activity" },
  { title: "Reports", href: "/reports" },
  { title: "Settings", href: "/settings" },
];

export default function AppSidebar() {
  return (
    <Sidebar collapsible="icon" className="bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="px-3 py-3">
        <div className="text-sm font-semibold tracking-wide">IFlowX</div>
        <div className="text-xs opacity-70">Pilot</div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild>
                    <Link href={item.href}>{item.title}</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
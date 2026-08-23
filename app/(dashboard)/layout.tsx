import React from "react";
import { SidebarProvider } from "@/components/SidebarProvider";
import { DashboardLayoutClient } from "@/components/DashboardLayoutClient";
import { AIAssistant } from "@/components/AIAssistant";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  
  if (!session) {
    redirect("/login");
  }

  return (
    <SidebarProvider>
      <DashboardLayoutClient>
        {children}
        <AIAssistant />
      </DashboardLayoutClient>
    </SidebarProvider>
  );
}

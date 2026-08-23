"use client";

import React from "react";
import { useSidebar } from "./SidebarProvider";
import { NavRail } from "./NavRail";
import { BottomNav } from "./BottomNav";
import { usePathname } from "next/navigation";

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const { navAberto } = useSidebar();
  const pathname = usePathname();

  const isEventoNovo = pathname === "/eventos/novo";

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <NavRail />

      {}
      <div 
        className={`transition-[padding] duration-200 ease-out pl-0 ${
          navAberto ? "md:pl-56" : "md:pl-16"
        } ${isEventoNovo ? "pb-0" : "pb-20 md:pb-0"}`}
      >
        <div className={isEventoNovo ? "p-0 md:p-4" : "p-0 md:p-4"}>
          <div 
            className={`flex flex-col overflow-hidden ${
              isEventoNovo 
                ? "h-[100dvh] md:h-[calc(100vh-2rem)] md:rounded-2xl md:bg-slate-900/50" 
                : "h-[calc(100dvh-5rem)] md:h-[calc(100vh-2rem)] md:rounded-2xl md:bg-slate-900/50"
            }`}
          >
            {children}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

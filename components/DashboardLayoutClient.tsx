"use client";

import React from "react";
import { useSidebar } from "./SidebarProvider";
import { NavRail } from "./NavRail";
import { BottomNav } from "./BottomNav";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const { navAberto } = useSidebar();
  const { isLoading } = useAuth();
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
            {isLoading ? (
              <div className="flex flex-col items-center justify-center flex-1 min-h-[60vh] gap-6 animate-in fade-in duration-300">
                <div className="relative flex items-center justify-center">
                  <div className="h-16 w-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  <div className="absolute h-8 w-8 bg-primary/20 rounded-full animate-pulse blur-md"></div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <h2 className="text-xl font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Carregando dados</h2>
                  <p className="text-sm text-muted-foreground animate-pulse">Aguarde um momento...</p>
                </div>
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

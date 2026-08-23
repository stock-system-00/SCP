"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  Settings,
  User,
  Calendar,
  FileText,
  BarChart2,
  Grid,
  AlertCircle,
  Store,
  Image as ImageIcon,
  PlusCircle,
  Receipt,
  TrendingUp,
  LogOut
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebar } from "./SidebarProvider";
import { useAuth } from "@/lib/auth-context";
import { StoreSwitcher } from "./StoreSwitcher";

export function NavRail() {
  const pathname = usePathname();
  const { navAberto: aberto } = useSidebar();
  const { hasPermission, settings, user, logout } = useAuth();

  const navGroups = [
    {
      title: "Visão Geral",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", permission: "dashboard:ver" },
        { icon: TrendingUp, label: "Evoluções", href: "/evolucoes", permission: "evolucoes:ver" },
        { icon: BarChart2, label: "Relatórios", href: "/relatorios", permission: "relatorios:ver" },
      ]
    },
    {
      title: "Operações",
      items: [
        { icon: PlusCircle, label: "Registrar Perda", href: "/eventos/novo", permission: "eventos:criar" },
      ]
    },
    {
      title: "Cadastros",
      items: [
        { icon: Store, label: "Catálogo", href: "/catalogo", permission: "catalogo:ver" },
        { icon: Grid, label: "Categorias", href: "/categorias", permission: "categorias:ver" },
        { icon: AlertCircle, label: "Motivos", href: "/motivos", permission: "motivos:ver" },
      ]
    },
    {
      title: "Registros",
      items: [
        { icon: Calendar, label: "Eventos", href: "/eventos", permission: "eventos:menu" },
        { icon: ImageIcon, label: "Galeria", href: "/galeria", permission: "galeria:ver" },
        { icon: BarChart2, label: "Vendas", href: "/vendas", permission: "vendas:ver" },
        { icon: Receipt, label: "Importação NFe", href: "/nfe-importacao", permission: "notas:importar" },
      ]
    }
  ];

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-in-out bg-background flex-col items-center py-4 hidden md:flex",
        aberto ? "w-56 items-start px-4" : "w-16"
      )}
    >
      <div className="w-full pt-2">
        <StoreSwitcher isCollapsed={!aberto} />
      </div>

      <nav className="flex-1 w-full space-y-4 mt-2 overflow-y-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {navGroups.map((group, groupIdx) => {

          const filteredItems = group.items.filter((item) => {
            if (item.href === "/galeria" && user?.role === "funcionario") {
              return hasPermission(item.permission) && settings?.permitirFuncionarioGaleria === true;
            }
            return hasPermission(item.permission);
          });


          if (filteredItems.length === 0) return null;

          return (
            <div key={groupIdx} className="w-full space-y-1 flex flex-col items-center">
              {aberto && (
                <div className="w-full px-3 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.title}
                </div>
              )}
              {!aberto && groupIdx > 0 && <div className="h-px bg-border w-8 mx-auto my-2" />}
              
              {filteredItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center p-3 rounded-xl transition-colors",
                      isActive
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                      aberto ? "justify-start gap-3 w-full" : "justify-center"
                    )}
                  >
                    <item.icon size={20} />
                    {aberto && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto w-full space-y-2 flex flex-col items-center">
        {hasPermission("iris:ver") && (
          <button
            onClick={() => window.dispatchEvent(new Event("open-ai-assistant"))}
            className={cn(
              "p-3 rounded-xl text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors flex items-center",
              aberto ? "justify-start gap-3 w-full" : "justify-center"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary overflow-hidden border">
              <img src="/bot.png" alt="IA" className="object-cover w-full h-full" />
            </div>
            {aberto && <span className="font-medium text-foreground">Iris (IA)</span>}
          </button>
        )}
        
        {hasPermission("perfil:ver") && (
          <Link 
            href="/perfil"
            className={cn(
              "p-3 rounded-xl text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors flex items-center",
              aberto ? "justify-start gap-3 w-full" : "justify-center"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center">
              <User size={16} />
            </div>
            {aberto && <span className="font-medium">Perfil</span>}
          </Link>
        )}
        
        <button 
          onClick={async () => await logout()}
          className={cn(
            "p-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors flex items-center",
            aberto ? "justify-start gap-3 w-full" : "justify-center"
          )}
          title="Sair do sistema"
        >
          <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center">
            <LogOut size={16} />
          </div>
          {aberto && <span className="font-medium">Sair</span>}
        </button>
      </div>
    </aside>
  );
}

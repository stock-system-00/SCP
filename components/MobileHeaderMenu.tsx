"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart2,
  Image as ImageIcon,
  Menu,
  Store,
  Grid,
  AlertCircle,
  User,
  Calendar,
  Receipt,
  TrendingUp,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export function MobileHeaderMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { hasPermission, settings, user, logout } = useAuth();
  const pathname = usePathname();

  const mainNavItems = [
    { icon: LayoutDashboard, label: "Início", href: "/dashboard", permission: "dashboard:ver" },
    { icon: BarChart2, label: "Relatórios", href: "/relatorios", permission: "relatorios:ver" },
  ].filter(item => hasPermission(item.permission));

  const secondaryNavItems = [
    { icon: ImageIcon, label: "Galeria", href: "/galeria", permission: "galeria:ver" },
  ].filter(item => {
    if (item.href === "/galeria" && user?.role === "funcionario") {
      return hasPermission(item.permission) && settings?.permitirFuncionarioGaleria === true;
    }
    return hasPermission(item.permission);
  });

  const moreMenuOptions = [
    { icon: TrendingUp, label: "Evoluções", href: "/evolucoes", permission: "evolucoes:ver" },
    { icon: Calendar, label: "Eventos", href: "/eventos", permission: "eventos:menu" },
    { icon: Store, label: "Catálogo", href: "/catalogo", permission: "catalogo:ver" },
    { icon: Grid, label: "Categorias", href: "/categorias", permission: "categorias:ver" },
    { icon: AlertCircle, label: "Motivos", href: "/motivos", permission: "motivos:ver" },
    { icon: BarChart2, label: "Vendas", href: "/vendas", permission: "vendas:ver" },
    { icon: Receipt, label: "NFe (Custos)", href: "/nfe-importacao", permission: "notas:importar" },
  ].filter(item => hasPermission(item.permission));

  const systemOptions = [
    { icon: User, label: "Perfil", href: "/perfil", permission: "perfil:ver" },
  ].filter(item => hasPermission(item.permission));

  const allItems = [...mainNavItems, ...secondaryNavItems, ...moreMenuOptions];

  return (
    <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-2xl px-2 pb-6 max-h-[85vh]">
        <SheetHeader className="px-4 text-left border-b pb-4 mb-4">
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-4 gap-4 px-2">
          {allItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-2xl transition-colors",
                  isActive ? "bg-primary/15 text-primary" : "bg-surface text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                )}
              >
                <item.icon size={24} className={isActive ? "text-primary" : ""} />
                <span className="text-[10px] font-medium text-center">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {systemOptions.length > 0 && (
          <div className="mt-6 mb-2 border-t pt-4 px-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sistema</h4>
            <div className="space-y-1">
              {systemOptions.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center">
                    <item.icon size={18} />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
              <button
                onClick={async () => {
                  setIsMenuOpen(false);
                  await logout();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center">
                  <LogOut size={18} />
                </div>
                <span className="text-sm font-medium">Sair do sistema</span>
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

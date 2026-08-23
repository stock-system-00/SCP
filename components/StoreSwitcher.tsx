"use client";

import React, { useEffect, useState } from "react";
import { Store, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getMinhasLojas } from "@/app/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LojaOption {
  id: string;
  nome: string;
  cnpj: string | null;
}

export function StoreSwitcher({ isCollapsed }: { isCollapsed?: boolean }) {
  const { user, activeLojaId, switchLoja } = useAuth();
  const [lojas, setLojas] = useState<LojaOption[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (user?.role === "dono" || user?.role === "gestor") {
      getMinhasLojas().then((data) => {
        setLojas(data);
      });
    }
  }, [user]);

  if (!user || (user.role !== "dono" && user.role !== "gestor")) {
    return null;
  }

  const activeLoja = lojas.find((l) => l.id === activeLojaId);

  const handleSelectLoja = async (lojaId: string) => {
    if (lojaId === activeLojaId) return;
    try {
      await switchLoja(lojaId);
      toast.success("Loja alterada com sucesso!");
      window.location.reload();
    } catch (error) {
      toast.error("Erro ao alterar loja");
    }
  };

  if (isCollapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center justify-center w-10 h-10 rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors mx-auto mb-4">
            <Store className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right" className="w-56">
          <DropdownMenuLabel>Alternar Loja</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {lojas.map((loja) => (
            <DropdownMenuItem
              key={loja.id}
              onClick={() => handleSelectLoja(loja.id)}
              className={cn(
                "cursor-pointer flex flex-col items-start gap-1",
                activeLojaId === loja.id && "bg-accent/50"
              )}
            >
              <span className="font-medium text-sm line-clamp-1">{loja.nome}</span>
              <span className="text-xs text-muted-foreground">{loja.cnpj}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="w-full px-3 mb-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="group flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground rounded-md transition-colors">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                <Store className="h-4 w-4" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium leading-tight truncate">
                  {activeLoja?.nome || "Selecione uma loja"}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {activeLoja ? "Loja Ativa" : "Múltiplas Filiais"}
                </span>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-[200px]">
          <DropdownMenuLabel>Suas Lojas</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {lojas.length === 0 && (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              Nenhuma loja encontrada.
            </div>
          )}
          {lojas.map((loja) => (
            <DropdownMenuItem
              key={loja.id}
              onClick={() => handleSelectLoja(loja.id)}
              className={cn(
                "cursor-pointer flex flex-col items-start gap-1 py-2 rounded-lg my-1 transition-all",
                activeLojaId === loja.id ? "bg-primary/10 text-primary hover:bg-primary/20" : "hover:bg-accent"
              )}
            >
              <span className="font-semibold text-xs leading-tight line-clamp-2">
                {loja.nome}
              </span>
              {loja.cnpj && (
                <span className="text-[10px] opacity-70">CNPJ: {loja.cnpj}</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

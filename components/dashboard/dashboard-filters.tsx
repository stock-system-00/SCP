"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type Modo = "dia" | "semana" | "mes";

interface DashboardFiltersProps {
  modo: Modo;
  pa: string;
  setPa: (val: string) => void;
  pb: string;
  setPb: (val: string) => void;
  limiteGlobal: number;
  setLimiteGlobal: (val: number) => void;
  busca: string;
  setBusca: (val: string) => void;
}

export function DashboardFilters({
  modo,
  pa,
  setPa,
  pb,
  setPb,
  limiteGlobal,
  setLimiteGlobal,
  busca,
  setBusca,
}: DashboardFiltersProps) {
  const inputType = modo === "dia" ? "date" : modo === "semana" ? "week" : "month";
  const [localLimite, setLocalLimite] = useState(limiteGlobal);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [pendingLimite, setPendingLimite] = useState<number | null>(null);


  useEffect(() => {
    setLocalLimite(limiteGlobal);
  }, [limiteGlobal]);

  const handleLimiteChangeComplete = (val: number) => {
    if (val !== limiteGlobal) {
      setPendingLimite(val);
      setIsAlertOpen(true);
    }
  };

  const confirmarAlteracao = () => {
    if (pendingLimite !== null) {
      setLimiteGlobal(pendingLimite);
    }
    setIsAlertOpen(false);
    setPendingLimite(null);
  };

  const cancelarAlteracao = () => {
    setLocalLimite(limiteGlobal);
    setIsAlertOpen(false);
    setPendingLimite(null);
  };

  return (
    <section className="flex flex-wrap items-end gap-x-5 gap-y-3 text-xs">
      <label className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Período</span>
        <input
          type={inputType}
          value={pa}
          onChange={(e) => setPa(e.target.value)}
          className="rounded-md bg-surface px-2.5 py-1.5 text-sm text-foreground outline-none focus:bg-surface-2 transition-colors"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Comparar com</span>
        <input
          type={inputType}
          value={pb}
          onChange={(e) => setPb(e.target.value)}
          className="rounded-md bg-surface px-2.5 py-1.5 text-sm text-foreground outline-none focus:bg-surface-2 transition-colors"
        />
      </label>
      <label className="hidden flex-col gap-1 md:flex">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Limite de perda ({localLimite}%)
        </span>
        <input
          type="range"
          min={1}
          max={20}
          value={localLimite}
          onChange={(e) => setLocalLimite(Number(e.target.value))}
          onMouseUp={(e) => handleLimiteChangeComplete(Number((e.target as HTMLInputElement).value))}
          onTouchEnd={(e) => handleLimiteChangeComplete(Number((e.target as HTMLInputElement).value))}
          className="h-8 w-40 accent-[var(--primary)] cursor-pointer"
        />
      </label>
      <label className="relative ml-auto flex items-center">
        <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar produto ou código"
          className="w-full rounded-md bg-surface py-1.5 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:bg-surface-2 transition-colors md:w-64"
        />
      </label>

      {}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar Limite de Perda?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a alterar a tolerância padrão de perda do painel para <strong>{pendingLimite}%</strong>.
              Isso afetará os alertas visuais de desperdício.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelarAlteracao}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmarAlteracao}>
              Aplicar Limite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

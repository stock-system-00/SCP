"use client";

import { useState, useEffect } from "react";
import { Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function dateToIsoWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const year = d.getUTCFullYear();
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

function isoWeekToDate(value: string) {
  if (!value || !value.includes("-W")) return undefined;
  const [y, w] = value.split("-W");
  const jan4 = new Date(Date.UTC(Number(y), 0, 4));
  const dow = (jan4.getUTCDay() + 6) % 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dow + (Number(w) - 1) * 7);
  return new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate());
}

function DayPicker({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  const date = value ? new Date(value + "T00:00:00") : undefined;
  let label = "Selecione o dia";
  if (date) {
    label = String(date.getUTCDate()).padStart(2, '0') + "/" + String(date.getUTCMonth() + 1).padStart(2, '0') + "/" + date.getUTCFullYear();
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[140px] h-[34px] rounded-md bg-surface px-2.5 py-1.5 text-sm text-foreground border-0 outline-none focus:ring-1 focus:ring-surface-3 transition-colors shadow-none justify-start font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (d) {
              const iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
              onChange(iso);
            }
          }}
          initialFocus
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  );
}

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function MonthPicker({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  const [y, m] = value ? value.split("-") : [new Date().getFullYear().toString(), ""];
  const year = parseInt(y);
  
  let label = "Selecione o mês";
  if (value && m) {
    label = `${MONTHS[parseInt(m) - 1]} / ${year}`;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[140px] h-[34px] rounded-md bg-surface px-2.5 py-1.5 text-sm text-foreground border-0 outline-none focus:ring-1 focus:ring-surface-3 transition-colors shadow-none justify-start font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-3" align="start">
        <div className="flex items-center justify-between mb-3">
           <Button variant="ghost" size="icon" className="h-7 w-7 opacity-50 hover:opacity-100" onClick={() => onChange(`${year - 1}-${m || '01'}`)}>
             <ChevronLeft className="h-4 w-4" />
           </Button>
           <span className="text-sm font-medium">{year}</span>
           <Button variant="ghost" size="icon" className="h-7 w-7 opacity-50 hover:opacity-100" onClick={() => onChange(`${year + 1}-${m || '01'}`)}>
             <ChevronRight className="h-4 w-4" />
           </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((month, idx) => {
            const isSelected = m && parseInt(m) === idx + 1;
            return (
              <Button
                key={month}
                variant={isSelected ? "default" : "ghost"}
                className={cn("h-8 text-xs font-normal", isSelected && "bg-primary text-primary-foreground font-medium")}
                onClick={() => {
                  onChange(`${year}-${String(idx + 1).padStart(2, '0')}`);
                }}
              >
                {month}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function WeekPicker({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  const date = isoWeekToDate(value);
  let label = "Selecione a semana";
  
  if (date && value) {
    const weekNum = value.split("-W")[1];
    const monday = new Date(date);
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const startStr = String(monday.getDate()).padStart(2, '0') + "/" + String(monday.getMonth() + 1).padStart(2, '0');
    const endStr = String(sunday.getDate()).padStart(2, '0') + "/" + String(sunday.getMonth() + 1).padStart(2, '0');
    label = `Sem. ${weekNum} (${startStr} a ${endStr})`;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[230px] h-[34px] rounded-md bg-surface px-2.5 py-1.5 text-sm text-foreground border-0 outline-none focus:ring-1 focus:ring-surface-3 transition-colors shadow-none justify-start font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => d && onChange(dateToIsoWeek(d))}
          initialFocus
          showOutsideDays={true}
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  );
}

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
        {modo === "semana" && <WeekPicker value={pa} onChange={setPa} />}
        {modo === "dia" && <DayPicker value={pa} onChange={setPa} />}
        {modo === "mes" && <MonthPicker value={pa} onChange={setPa} />}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Comparar com</span>
        {modo === "semana" && <WeekPicker value={pb} onChange={setPb} />}
        {modo === "dia" && <DayPicker value={pb} onChange={setPb} />}
        {modo === "mes" && <MonthPicker value={pb} onChange={setPb} />}
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

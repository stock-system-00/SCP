"use client";

import { Package, Info } from "lucide-react";
import { formatCurrency, formatQuantity } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger, PopoverPrimitive } from "@/components/ui/popover";

interface DesperdicioItem {
  codigo: string;
  descricao: string;
  perdido: number;
  custo: number;
  perdaPct: number;
}

interface CriticalItemsProps {
  itens: DesperdicioItem[];
}

export function CriticalItems({ itens }: CriticalItemsProps) {

  const topItens = itens.slice(0, 5);

  return (
    <div className="rounded-xl bg-surface p-4 shadow-sm flex flex-col h-full">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[13px] font-medium flex items-center gap-1.5">
          Top 5 Desperdícios
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full">
                <Info className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="center" className="w-64 text-sm p-4 leading-relaxed bg-slate-900 border-slate-800 shadow-xl z-50">
              <p className="text-xs text-slate-300">
                Os 5 itens que geraram maior custo de desperdício em relação ao faturamento no período e que estouraram o limite definido.
              </p>
              <PopoverPrimitive.Arrow className="fill-slate-900" width={16} height={8} />
            </PopoverContent>
          </Popover>
        </h2>
      </div>

      <div className="flex-1">
        {topItens.length > 0 ? (
          <div className="divide-y divide-border">
            {topItens.map((entry, index) => {
              const custoPerda = entry.perdido * entry.custo;

              const pctVisual = Math.min(entry.perdaPct, 100);

              return (
                <div
                  key={entry.codigo}
                  className="py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                      {index + 1}
                    </div>
                    
                    <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {entry.descricao}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {formatQuantity(entry.perdido)} perdidos
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs font-medium text-destructive">
                          {formatCurrency(custoPerda)}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs font-medium text-destructive">
                          {entry.perdaPct.toFixed(1)}% de perda
                        </span>
                      </div>
                    </div>
                  </div>
                  {}
                  <div className="mt-2 ml-11">
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-destructive/70 to-destructive rounded-full transition-all duration-500"
                        style={{ width: `${pctVisual}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 h-full flex flex-col justify-center items-center text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum alerta crítico no período.</p>
          </div>
        )}
      </div>
    </div>
  );
}

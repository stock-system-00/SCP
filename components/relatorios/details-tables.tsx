
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Package, AlertTriangle } from "lucide-react";

interface DetailsTablesProps {
  topItens: any[];
  topMotivos: any[];
}

export function DetailsTables({ topItens, topMotivos }: DetailsTablesProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 mt-6">
      {}
      <Card className="flex flex-col shadow-sm">
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-lg md:text-xl flex items-center gap-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            Top 10 Itens com Maior Perda
          </CardTitle>
          <CardDescription>
            Itens que mais geraram prejuízo financeiro no período
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6 flex-1">
          {topItens.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
              Nenhum dado no período selecionado.
            </div>
          ) : (
            <div className="space-y-4">
              {topItens.map((d, i) => (
                <div
                  key={d.item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-muted/20 gap-3"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      {i + 1}º
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {d.item.nome}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {d.item.codigoInterno} •{" "}
                        {d.item.categoria?.nome || d.item.categoria}
                      </p>
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0">
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-sm font-bold text-destructive">
                        {formatCurrency(d.custoPerda)}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        Taxa de Perda: 
                        <span className={d.taxaPerda > 5 ? "text-destructive font-bold" : "font-bold"}>
                          {Number(d.taxaPerda).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-normal h-5 mt-1"
                    >
                      {Number(d.qtdPerda).toLocaleString("pt-BR", {
                        maximumFractionDigits: 3,
                      })}{" "}
                      {d.item.unidade}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {}
      <Card className="flex flex-col shadow-sm">
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-lg md:text-xl flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            Principais Motivos
          </CardTitle>
          <CardDescription>
            Causas mais frequentes de perdas financeiras no período
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6 flex-1">
          {topMotivos.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
              Nenhum dado no período selecionado.
            </div>
          ) : (
            <div className="space-y-4">
              {topMotivos.map((d, i) => (
                <div
                  key={d.motivo}
                  className="p-4 rounded-lg border bg-muted/10 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-sm">{d.motivo}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {Number(d.quantidade).toLocaleString("pt-BR", {
                          maximumFractionDigits: 3,
                        })}{" "}
                        itens afetados
                      </p>
                    </div>
                    <div className="text-sm font-bold whitespace-nowrap">
                      {formatCurrency(d.custo)}
                    </div>
                  </div>

                  {d.topItens && d.topItens.length > 0 && (
                    <div className="pt-3 border-t border-dashed mt-2">
                      <p className="text-[10px] uppercase text-muted-foreground mb-2 font-semibold tracking-wider">
                        Itens mais afetados por este motivo:
                      </p>
                      <div className="space-y-2">
                        {d.topItens.map((sub: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center text-xs"
                          >
                            <span className="truncate pr-2 text-muted-foreground flex-1">
                              • {sub.nome}
                            </span>
                            <span className="font-medium shrink-0">
                              {formatCurrency(sub.custo)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

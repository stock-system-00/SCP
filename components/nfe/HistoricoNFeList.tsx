"use client";

import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, ArrowRight, CalendarDays, DollarSign, Package, CheckCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function HistoricoNFeList({ historico }: { historico: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get("status") || "todos";

  const handleStatusChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val === "todos") {
      params.delete("status");
    } else {
      params.set("status", val);
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="w-full space-y-4">
      {}
      <div className="flex justify-between items-center bg-card/40 backdrop-blur-md p-3 rounded-2xl border border-border/50">
        <h2 className="text-sm font-semibold text-foreground px-2">Notas Importadas</h2>
        <Select value={currentStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px] bg-background">
            <SelectValue placeholder="Filtrar por Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as Notas</SelectItem>
            <SelectItem value="pendente">Pendente de Mapeamento</SelectItem>
            <SelectItem value="mapeado">100% Mapeado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!historico || historico.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-surface border rounded-2xl border-dashed">
          <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mb-4 text-muted-foreground">
            <FileText size={32} />
          </div>
          <p className="text-muted-foreground font-medium text-center">Nenhuma NFe encontrada.</p>
          {currentStatus !== "todos" && (
            <Button variant="link" onClick={() => handleStatusChange("todos")} className="mt-2 text-primary">
              Limpar Filtros
            </Button>
          )}
        </div>
      ) : (
        <>
          {}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {historico.map((nfe) => {


          const dataPrincipal = nfe.dataEmissao ? new Date(nfe.dataEmissao) : new Date(nfe.dataImportacao);
          const total = nfe.totalCount || 0;
          const mapped = nfe.mappedCount || 0;
          const isFullyMapped = total > 0 && mapped === total;
          
          return (
            <Link
              key={nfe.id}
              href={`/nfe-importacao/${nfe.id}`}
              className="bg-surface border rounded-2xl p-5 hover:border-primary/50 transition-all active:scale-[0.98] group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground line-clamp-1">
                        NFe Nº {nfe.numero || "Desconhecido"}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {nfe.emitente || "Fornecedor Desconhecido"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <CalendarDays size={14} /> Emissão
                    </span>
                    <span className="font-medium text-foreground">
                      {format(dataPrincipal, "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle size={14} /> Status
                    </span>
                    {isFullyMapped ? (
                      <span className="text-xs font-semibold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                        100% Mapeado
                      </span>
                    ) : (
                      <span className="text-xs font-medium bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
                        {mapped}/{total} Pendentes
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <DollarSign size={14} /> Total
                    </span>
                    <span className="font-medium text-foreground">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(nfe.valorTotal || 0))}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t flex items-center justify-end text-primary text-sm font-medium group-hover:gap-2 transition-all">
                Ver detalhes <ArrowRight size={16} className="ml-1" />
              </div>
            </Link>
          );
        })}
      </div>

      {}
      <div className="hidden md:block bg-card/40 backdrop-blur-md p-2 rounded-2xl shadow-sm border border-border/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="border-b border-white/10">
              <tr className="text-muted-foreground hover:bg-transparent">
                <th className="font-semibold p-4 font-medium text-slate-300">Número</th>
                <th className="font-semibold p-4 font-medium text-slate-300">Emitente</th>
                <th className="font-semibold p-4 font-medium text-slate-300">Data da Nota</th>
                <th className="font-semibold p-4 font-medium text-slate-300">Status</th>
                <th className="font-semibold p-4 font-medium text-slate-300 text-right">Valor Total</th>
                <th className="font-semibold p-4 font-medium text-slate-300 text-center">Ação</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((nfe) => {
                const dataPrincipal = nfe.dataEmissao ? new Date(nfe.dataEmissao) : new Date(nfe.dataImportacao);
                const total = nfe.totalCount || 0;
                const mapped = nfe.mappedCount || 0;
                const isFullyMapped = total > 0 && mapped === total;
                
                return (
                  <tr key={nfe.id} className="group transition-colors border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 align-middle">
                      <div className="font-medium text-slate-200">NFe {nfe.numero || "-"}</div>
                    </td>
                    <td className="p-4 align-middle text-muted-foreground truncate max-w-[250px]" title={nfe.emitente}>
                      {nfe.emitente || "Fornecedor Desconhecido"}
                    </td>
                    <td className="p-4 align-middle text-slate-300">
                      {format(dataPrincipal, "dd/MM/yyyy", { locale: ptBR })}
                    </td>
                    <td className="p-4 align-middle">
                      {isFullyMapped ? (
                        <span className="text-xs font-semibold bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full whitespace-nowrap">
                          100% Mapeado
                        </span>
                      ) : (
                        <span className="text-xs font-medium bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full whitespace-nowrap">
                          {mapped}/{total} Mapeados
                        </span>
                      )}
                    </td>
                    <td className="p-4 align-middle text-right font-medium text-slate-200">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(nfe.valorTotal || 0))}
                    </td>
                    <td className="p-4 align-middle text-center">
                      <Button variant="ghost" size="sm" asChild className="rounded-xl hover:bg-white/10 hover:text-primary">
                        <Link href={`/nfe-importacao/${nfe.id}`}>
                          Detalhes
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )}
    </div>
  );
}

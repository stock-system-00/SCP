"use client";

import { useState, useMemo, useEffect } from "react";
import { getEventos } from "@/app/actions/eventos";
import { useAuth } from "@/lib/auth-context";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { generateMotivoPDF } from "@/lib/pdf-generator";

interface RelatorioMotivoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RelatorioMotivoModal({ open, onOpenChange }: RelatorioMotivoModalProps) {
  const { activeLojaNome, settings } = useAuth();
  const [selectedMotivo, setSelectedMotivo] = useState<string>("todos");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("30dias");
  const [localEventos, setLocalEventos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      getEventos().then((res) => {
        if (res.success && res.data) {
          setLocalEventos(res.data);
        }
        setIsLoading(false);
      });
    }
  }, [open]);

  const getEffectiveMotivo = (e: any) => {
    let motivo = e.motivo;
    if (!motivo && e.evidencias && e.evidencias.length > 0) {
      motivo = e.evidencias.find((ev: any) => ev.motivo)?.motivo || null;
    }
    return motivo || "Não especificado";
  };

  const dateFilteredEventos = useMemo(() => {
    if (selectedPeriod === "todos") return localEventos;
    
    const now = new Date();
    let start: Date;
    let end: Date = now;

    if (selectedPeriod === "30dias") {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (selectedPeriod === "60dias") {
      start = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    } else if (selectedPeriod === "90dias") {
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (selectedPeriod === "esteMes") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (selectedPeriod === "mesPassado") {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else {
      return localEventos;
    }

    return localEventos.filter(ev => {
      const d = new Date(ev.dataHora);
      return d >= start && d <= end;
    });
  }, [localEventos, selectedPeriod]);

  const motivosDisponiveis = useMemo(() => {
    const motivos = new Set<string>();
    dateFilteredEventos.forEach((e) => {
      const m = getEffectiveMotivo(e);
      motivos.add(m);
    });
    return Array.from(motivos).sort();
  }, [dateFilteredEventos]);

  const dadosFiltrados = useMemo(() => {
    let eventosBase = dateFilteredEventos;
    if (selectedMotivo !== "todos") {
      eventosBase = dateFilteredEventos.filter((e) => {
        const m = getEffectiveMotivo(e);
        return m === selectedMotivo;
      });
    }

    const mapItens: Record<string, {
      nome: string;
      codigo: string;
      unidade: string;
      quantidade: number;
      custoTotal: number;
    }> = {};

    eventosBase.forEach((ev) => {
      const id = ev.item?.id || "desconhecido";
      if (!mapItens[id]) {
        mapItens[id] = {
          nome: ev.item?.nome || "Produto Desconhecido",
          codigo: ev.item?.codigoInterno || "-",
          unidade: ev.unidade || ev.item?.unidade || "UN",
          quantidade: 0,
          custoTotal: 0,
        };
      }
      mapItens[id].quantidade += ev.quantidade;
      mapItens[id].custoTotal += (ev.custoSnapshot || 0) * ev.quantidade;
    });

    return Object.values(mapItens).sort((a, b) => b.custoTotal - a.custoTotal);
  }, [dateFilteredEventos, selectedMotivo]);

  const totais = useMemo(() => {
    return dadosFiltrados.reduce(
      (acc, item) => {
        acc.quantidade += item.quantidade;
        acc.custoTotal += item.custoTotal;
        return acc;
      },
      { quantidade: 0, custoTotal: 0 }
    );
  }, [dadosFiltrados]);

  const handleDownloadPDF = () => {
    if (dadosFiltrados.length === 0) return;

    let nomeRelatorio = "Todos os Motivos";
    if (selectedMotivo !== "todos") {
      nomeRelatorio = selectedMotivo;
    }

    const periodMap: Record<string, string> = {
      "30dias": "Últimos 30 dias",
      "60dias": "Últimos 60 dias",
      "90dias": "Últimos 90 dias",
      "esteMes": "Este Mês",
      "mesPassado": "Mês Passado",
      "todos": "Todos os períodos",
    };

    const companyName = activeLojaNome || settings?.empresaNome || undefined;
    const periodoTexto = periodMap[selectedPeriod] || "Todos os períodos";
    generateMotivoPDF(dadosFiltrados, totais, nomeRelatorio, companyName, periodoTexto);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0">
        <div className="px-6 pt-6">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-xl">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Relatório de Itens por Motivo
            </SheetTitle>
            <SheetDescription>
              Gere uma lista limpa dos itens perdidos baseada no motivo, ideal para repasses ou conferência.
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="px-6 flex flex-col sm:flex-row items-end gap-4 py-4 border-b">
          <div className="w-full sm:w-1/2">
            <span className="text-xs font-medium mb-1.5 block text-muted-foreground ml-1">
              Período
            </span>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                <SelectItem value="esteMes">Este Mês</SelectItem>
                <SelectItem value="60dias">Últimos 60 dias</SelectItem>
                <SelectItem value="mesPassado">Mês Passado</SelectItem>
                <SelectItem value="90dias">Últimos 90 dias</SelectItem>
                <SelectItem value="todos">Todos os períodos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:flex-1">
            <span className="text-xs font-medium mb-1.5 block text-muted-foreground ml-1">
              Filtrar por Motivo
            </span>
            <Select value={selectedMotivo} onValueChange={setSelectedMotivo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um motivo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Motivos</SelectItem>
                {motivosDisponiveis.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleDownloadPDF} className="w-full sm:w-auto" disabled={dadosFiltrados.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Baixar PDF
          </Button>
        </div>

        <div className="px-6 flex-1 flex flex-col bg-background pb-6 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center py-12 flex-1">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="bg-card rounded-md border mt-4 flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left">
                  <thead className="sticky top-0 bg-secondary/80 backdrop-blur-sm shadow-sm z-10">
                  <tr className="text-muted-foreground border-b border-white/5">
                    <th className="p-3 font-semibold w-24">Código</th>
                    <th className="p-3 font-semibold">Produto</th>
                    <th className="p-3 font-semibold text-right w-24">Qtd</th>
                    <th className="p-3 font-semibold text-right w-32">Total (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        Nenhum item encontrado para este filtro.
                      </td>
                    </tr>
                  ) : (
                    dadosFiltrados.map((item) => (
                      <tr key={item.codigo + item.nome} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-3 text-muted-foreground">{item.codigo}</td>
                        <td className="p-3 font-medium text-foreground">{item.nome}</td>
                        <td className="p-3 text-right">
                          {Number(item.quantidade).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} <span className="text-xs text-muted-foreground">{item.unidade}</span>
                        </td>
                        <td className="p-3 text-right font-medium">
                          {formatCurrency(item.custoTotal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {dadosFiltrados.length > 0 && (
                  <tfoot className="sticky bottom-0 bg-secondary/90 backdrop-blur-md border-t border-white/10 font-bold text-foreground z-10">
                    <tr>
                      <td colSpan={2} className="p-3 text-right">TOTAL GERAL:</td>
                      <td className="p-3 text-right">{Number(totais.quantidade).toLocaleString("pt-BR", { maximumFractionDigits: 3 })}</td>
                      <td className="p-3 text-right text-primary">{formatCurrency(totais.custoTotal)}</td>
                    </tr>
                  </tfoot>
                )}
                </table>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

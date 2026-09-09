"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { Evento } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface RelatorioMotivoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  validEventos: Evento[];
}

export function RelatorioMotivoModal({ open, onOpenChange, validEventos }: RelatorioMotivoModalProps) {
  const [selectedMotivo, setSelectedMotivo] = useState<string>("todos");

  const motivosDisponiveis = useMemo(() => {
    const motivos = new Set<string>();
    motivos.add("Devolução"); // Motivo fixo do sistema
    validEventos.forEach((e) => motivos.add(e.motivo || "Não especificado"));
    return Array.from(motivos).sort();
  }, [validEventos]);

  const dadosFiltrados = useMemo(() => {
    let eventosBase = validEventos;
    if (selectedMotivo !== "todos") {
      eventosBase = validEventos.filter((e) => (e.motivo || "Não especificado") === selectedMotivo);
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
  }, [validEventos, selectedMotivo]);

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

  const handleDownloadCSV = () => {
    if (dadosFiltrados.length === 0) return;

    const headers = ["Código", "Produto", "Qtd", "Unidade", "Custo Total (R$)"];
    const rows = dadosFiltrados.map((i) => [
      i.codigo,
      `"${i.nome.replace(/"/g, '""')}"`,
      i.quantidade.toString().replace('.', ','),
      i.unidade,
      i.custoTotal.toFixed(2).replace('.', ','),
    ]);

    // Linha de total
    rows.push([
      "TOTAL",
      "",
      totais.quantidade.toString().replace('.', ','),
      "",
      totais.custoTotal.toFixed(2).replace('.', ','),
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((r) => r.join(";")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const nomeMotivo = selectedMotivo === "todos" ? "todos-motivos" : selectedMotivo.replace(/\s+/g, '-').toLowerCase();
    link.download = `relatorio-itens-${nomeMotivo}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Relatório de Itens por Motivo
          </DialogTitle>
          <DialogDescription>
            Gere uma lista limpa dos itens perdidos baseada no motivo, ideal para repasses ou conferência.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row items-end gap-4 py-4 border-b">
          <div className="w-full sm:w-64">
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
          <Button onClick={handleDownloadCSV} className="w-full sm:w-auto" disabled={dadosFiltrados.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Baixar CSV
          </Button>
        </div>

        <div className="flex-1 overflow-auto min-h-[300px] bg-card rounded-md border mt-4">
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
                      {item.quantidade} <span className="text-xs text-muted-foreground">{item.unidade}</span>
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
                  <td className="p-3 text-right">{totais.quantidade.toFixed(2).replace(/\.00$/, '')}</td>
                  <td className="p-3 text-right text-primary">{formatCurrency(totais.custoTotal)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

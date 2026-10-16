"use client";

import { useState, useMemo } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Calendar as CalendarIcon,
  FileCheck2,
  FileX2,
  Filter,
  FileSpreadsheet,
  AlertCircle,
  FileText,
} from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Evento } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import {
  generatePerdasPorDataPDF,
  RelatorioPerdasDataRow,
} from "@/lib/pdf-relatorio-perdas-data";

interface RelatorioPerdasDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventos: Evento[];
}

export function RelatorioPerdasDataModal({
  open,
  onOpenChange,
  eventos,
}: RelatorioPerdasDataModalProps) {
  const { activeLojaNome, settings } = useAuth();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [filtroNfe, setFiltroNfe] = useState<"todos" | "com_nfe" | "sem_nfe">("todos");

  // Agrupamento por data (dia)
  const relatorioData = useMemo(() => {
    // 1. Filtrar eventos pelo período
    const filtrados = eventos.filter((ev) => {
      if (ev.status === "rejeitado") return false; // descarta rejeitados da conferência de perda

      if (dateRange?.from) {
        const evDate = new Date(ev.dataHora);
        const start = startOfDay(dateRange.from);
        const end = endOfDay(dateRange.to || dateRange.from);
        if (!isWithinInterval(evDate, { start, end })) return false;
      }
      return true;
    });

    // 2. Agrupar por data (formato dd/MM/yyyy)
    const grupos: Record<
      string,
      {
        dataOriginal: Date;
        eventos: Evento[];
        temNfe: boolean;
      }
    > = {};

    filtrados.forEach((ev) => {
      const dataStr = formatDate(ev.dataHora);
      if (!grupos[dataStr]) {
        grupos[dataStr] = {
          dataOriginal: new Date(ev.dataHora),
          eventos: [],
          temNfe: false,
        };
      }
      grupos[dataStr].eventos.push(ev);

      // Critério acordado: se possui nfeEmitida ou nfePdfUrl ou notasFiscais vinculadas
      const hasNfe =
        !!ev.nfeEmitida ||
        !!ev.nfePdfUrl ||
        (ev.notasFiscais && ev.notasFiscais.length > 0);

      if (hasNfe) {
        grupos[dataStr].temNfe = true;
      }
    });

    // 3. Montar linhas do relatório
    const rows: RelatorioPerdasDataRow[] = Object.entries(grupos)
      .map(([data, grupo]) => {
        const totalEventos = grupo.eventos.length;
        const quantidadeTotal = grupo.eventos.reduce(
          (acc, e) => acc + (Number(e.quantidade) || 0),
          0
        );
        const valorTotal = grupo.eventos.reduce(
          (acc, e) => acc + (Number(e.custoSnapshot) || 0) * (Number(e.quantidade) || 0),
          0
        );

        return {
          data,
          dataOriginal: grupo.dataOriginal,
          totalEventos,
          quantidadeTotal,
          valorTotal,
          temNfe: grupo.temNfe,
          nfeStatusTexto: grupo.temNfe ? "EMITIDA / ANEXADA" : "PENDENTE",
        };
      })
      .sort((a: any, b: any) => b.dataOriginal.getTime() - a.dataOriginal.getTime());

    // 4. Filtrar por status de NF-e
    const rowsFiltradas = rows.filter((r) => {
      if (filtroNfe === "com_nfe") return r.temNfe;
      if (filtroNfe === "sem_nfe") return !r.temNfe;
      return true;
    });

    // 5. Totais consolidados
    const totais = rowsFiltradas.reduce(
      (acc, r) => {
        acc.totalEventos += r.totalEventos;
        acc.quantidadeTotal += r.quantidadeTotal;
        acc.valorTotal += r.valorTotal;
        if (r.temNfe) acc.diasComNfe++;
        else acc.diasSemNfe++;
        return acc;
      },
      {
        diasCount: rowsFiltradas.length,
        totalEventos: 0,
        quantidadeTotal: 0,
        valorTotal: 0,
        diasComNfe: 0,
        diasSemNfe: 0,
      }
    );

    return {
      rows: rowsFiltradas,
      totais,
    };
  }, [eventos, dateRange, filtroNfe]);

  const handleExportPDF = () => {
    if (relatorioData.rows.length === 0) return;

    let periodoTexto = "Todos os períodos";
    if (dateRange?.from) {
      if (dateRange.to) {
        periodoTexto = `${format(dateRange.from, "dd/MM/yyyy")} a ${format(dateRange.to, "dd/MM/yyyy")}`;
      } else {
        periodoTexto = format(dateRange.from, "dd/MM/yyyy");
      }
    }

    const filtroNfeTextoMap = {
      todos: "Todos (Com e Sem NF-e)",
      com_nfe: "Apenas Com NF-e Anexada",
      sem_nfe: "Pendentes de NF-e",
    };

    generatePerdasPorDataPDF({
      dados: relatorioData.rows,
      totais: relatorioData.totais,
      filtroNfeTexto: filtroNfeTextoMap[filtroNfe],
      periodoTexto,
      companyName: activeLojaNome || settings?.empresaNome || undefined,
    });
  };

  const handleExportCSV = () => {
    if (relatorioData.rows.length === 0) return;

    const headers = [
      "Data",
      "Quantidade de Eventos",
      "Nota Fiscal Anexada",
      "Valor Total (R$)",
    ];

    const rows = relatorioData.rows.map((r) => [
      r.data,
      r.totalEventos,
      r.temNfe ? "SIM" : "NAO",
      r.valorTotal.toFixed(2).replace(".", ","),
    ]);

    // Linha final de totais
    rows.push([
      "TOTAL GERAL",
      relatorioData.totais.totalEventos,
      `${relatorioData.totais.diasComNfe} COM NF / ${relatorioData.totais.diasSemNfe} SEM NF`,
      relatorioData.totais.valorTotal.toFixed(2).replace(".", ","),
    ]);

    const csvContent = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-perdas-datas-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl flex flex-col p-0">
        <div className="px-6 pt-6">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-xl">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Relatório de Perdas por Data e NF-e
            </SheetTitle>
            <SheetDescription>
              Acompanhe a quantidade de eventos de perdas por data e confira se o setor fiscal já
              emitiu a nota fiscal para cada dia.
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Barra de Filtros e Ações */}
        <div className="px-6 flex flex-col sm:flex-row items-stretch sm:items-end gap-3 py-4 border-b">
          {/* Seletor de Período com Atalhos */}
          <div className="flex-1">
            <span className="text-xs font-medium mb-1.5 block text-muted-foreground ml-1">
              Período
            </span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left text-xs font-normal h-9",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy")
                    )
                  ) : (
                    <span>Selecione o período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-2 border-b flex flex-wrap gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() =>
                      setDateRange({
                        from: startOfMonth(new Date()),
                        to: endOfMonth(new Date()),
                      })
                    }
                  >
                    Este Mês
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() =>
                      setDateRange({
                        from: startOfMonth(subMonths(new Date(), 1)),
                        to: endOfMonth(subMonths(new Date(), 1)),
                      })
                    }
                  >
                    Mês Passado
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setDateRange(undefined)}
                  >
                    Limpar
                  </Button>
                </div>
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  initialFocus
                  locale={ptBR}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Filtro de NF-e */}
          <div className="w-full sm:w-56">
            <span className="text-xs font-medium mb-1.5 block text-muted-foreground ml-1">
              Filtro de Nota Fiscal
            </span>
            <Select
              value={filtroNfe}
              onValueChange={(val: any) => setFiltroNfe(val)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Status da NF-e" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos (Com e Sem NF-e)</SelectItem>
                <SelectItem value="com_nfe">Com NF-e Anexada</SelectItem>
                <SelectItem value="sem_nfe">Pendentes de NF-e</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botões de Exportação */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={relatorioData.rows.length === 0}
              className="h-9 text-xs gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button
              size="sm"
              onClick={handleExportPDF}
              disabled={relatorioData.rows.length === 0}
              className="h-9 text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </Button>
          </div>
        </div>

        {/* Resumo em Cards */}
        <div className="px-6 py-3 bg-muted/20 grid grid-cols-2 md:grid-cols-4 gap-2.5 border-b">
          <div className="bg-background border rounded-lg p-2.5 flex flex-col justify-between min-h-[68px]">
            <p className="text-[11px] font-medium text-muted-foreground truncate">Dias com Perda</p>
            <p className="text-base sm:text-lg font-bold tracking-tight">{relatorioData.totais.diasCount}</p>
          </div>
          <div className="bg-background border rounded-lg p-2.5 flex flex-col justify-between min-h-[68px]">
            <p className="text-[11px] font-medium text-muted-foreground truncate">Total de Eventos</p>
            <p className="text-base sm:text-lg font-bold tracking-tight">{relatorioData.totais.totalEventos}</p>
          </div>
          <div className="bg-background border rounded-lg p-2.5 flex flex-col justify-between min-h-[68px]">
            <p className="text-[11px] font-medium text-muted-foreground truncate">Status Fiscal</p>
            <div className="flex items-center gap-1.5 flex-wrap text-xs font-semibold pt-0.5">
              <span className="inline-flex items-center gap-1 text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded text-[11px]">
                <FileCheck2 className="h-3 w-3 shrink-0" />
                <span>{relatorioData.totais.diasComNfe} com NF</span>
              </span>
              <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded text-[11px]">
                <FileX2 className="h-3 w-3 shrink-0" />
                <span>{relatorioData.totais.diasSemNfe} sem</span>
              </span>
            </div>
          </div>
          <div className="bg-background border rounded-lg p-2.5 flex flex-col justify-between min-h-[68px]">
            <p className="text-[11px] font-medium text-muted-foreground truncate">Valor Total (Custo)</p>
            <p className="text-base sm:text-lg font-bold tracking-tight text-primary truncate" title={formatCurrency(relatorioData.totais.valorTotal)}>
              {formatCurrency(relatorioData.totais.valorTotal)}
            </p>
          </div>
        </div>

        {/* Tabela de Dados */}
        <div className="px-6 flex-1 flex flex-col bg-background pb-6 overflow-hidden">
          <div className="bg-card rounded-md border mt-4 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="sticky top-0 bg-secondary/80 backdrop-blur-sm shadow-sm z-10">
                  <tr className="text-muted-foreground border-b border-white/5 text-xs">
                    <th className="p-3 font-semibold">Data do Registro</th>
                    <th className="p-3 font-semibold text-center w-32">Nº Eventos</th>
                    <th className="p-3 font-semibold text-center w-48">Nota Fiscal</th>
                    <th className="p-3 font-semibold text-right w-40">Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorioData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        Nenhum registro de perda encontrado para este período ou filtro.
                      </td>
                    </tr>
                  ) : (
                    relatorioData.rows.map((row) => (
                      <tr
                        key={row.data}
                        className="border-b border-white/5 hover:bg-muted/40 transition-colors"
                      >
                        <td className="p-3 font-semibold text-foreground">{row.data}</td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className="font-normal text-xs">
                            {row.totalEventos} {row.totalEventos === 1 ? "evento" : "eventos"}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          {row.temNfe ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20 gap-1 text-[11px] font-medium">
                              <FileCheck2 className="h-3.5 w-3.5" />
                              Anexada
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1 text-[11px] font-medium"
                            >
                              <FileX2 className="h-3.5 w-3.5" />
                              Pendente
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-right font-medium text-foreground">
                          {formatCurrency(row.valorTotal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {relatorioData.rows.length > 0 && (
                  <tfoot className="sticky bottom-0 bg-secondary/95 backdrop-blur-md border-t font-bold text-foreground z-10 text-xs">
                    <tr>
                      <td className="p-3">TOTAL GERAL:</td>
                      <td className="p-3 text-center">
                        {relatorioData.totais.totalEventos}
                      </td>
                      <td className="p-3 text-center text-[11px] text-muted-foreground font-normal">
                        {relatorioData.totais.diasComNfe} com NF | {relatorioData.totais.diasSemNfe} sem NF
                      </td>
                      <td className="p-3 text-right text-sm text-primary">
                        {formatCurrency(relatorioData.totais.valorTotal)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

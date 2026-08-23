
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { getEventos } from "@/app/actions/eventos";
import { getRelatorioGeral } from "@/app/actions/relatorios";
import { useAuth } from "@/lib/auth-context";
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  Loader2,
  Download,
} from "lucide-react";
import { Evento, Item } from "@/lib/types";
import { toast } from "sonner";
import { generateReportPDF } from "@/lib/pdf-generator";
import { cn } from "@/lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  differenceInDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";

import { SummaryCards } from "@/components/relatorios/summary-cards";
import { ChartsOverview } from "@/components/relatorios/charts-overview";
import { DetailsTables } from "@/components/relatorios/details-tables";
import { PageHeader } from "@/components/PageHeader";

export default function RelatoriosPage() {
  const { hasPermission } = useAuth();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [combinedItens, setCombinedItens] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!dateRange?.from || !dateRange?.to) return;
      setIsLoading(true);
      const result = await getRelatorioGeral(
        dateRange.from.toISOString().split("T")[0],
        dateRange.to.toISOString().split("T")[0]
      );
      
      if (result.success && result.data) {
        const mappedEventos: Evento[] = (result.data.eventos as any[]).map((ev) => ({
          id: ev.id,
          dataHora: ev.dataHora,
          motivo: ev.motivo,
          status: ev.status,
          quantidade: Number(ev.quantidade),
          unidade: ev.unidade,
          custoSnapshot: Number(ev.custoSnapshot),
          precoVendaSnapshot: Number(ev.precoVendaSnapshot),
          item: ev.item
            ? {
              id: ev.item.id,
              nome: ev.item.nome,
              codigoInterno: ev.item.codigoInterno,
              categoria: ev.item.categoria?.nome || "Sem Categoria",
              unidade: ev.item.unidade,
              custo: Number(ev.item.custo),
              precoVenda: Number(ev.item.precoVenda),
              status: ev.item.status,
              imagemUrl: ev.item.imagemUrl,
            }
            : undefined,
          criadoPor: ev.criadoPor,
          evidencias: ev.evidencias,
          notasFiscais: ev.notasFiscais || [],
        }));
        setEventos(mappedEventos);
        setCombinedItens(result.data.combinedItens);
      } else {
        toast.error("Erro ao carregar relatórios");
      }
      setIsLoading(false);
    }
    loadData();
  }, [dateRange]);

  const stats = useMemo(() => {
    const from = dateRange?.from || startOfMonth(new Date());
    const to = dateRange?.to || endOfMonth(new Date());

    const baseEventos = eventos.filter(
      (e) => e.status !== "rascunho" && e.status !== "rejeitado",
    );

    const validEventos = baseEventos.filter((e) => {
      const d = new Date(e.dataHora);
      return d >= startOfDay(from) && d <= endOfDay(to);
    });

    const diffDias = differenceInDays(to, from);
    const isDiario = diffDias <= 35;
    const chartDataMap: Record<
      string,
      { custo: number; venda: number; qtd: number }
    > = {};

    if (isDiario) {
      for (let i = 0; i <= diffDias; i++) {
        const d = new Date(from);
        d.setDate(d.getDate() + i);
        chartDataMap[format(d, "dd/MM")] = { custo: 0, venda: 0, qtd: 0 };
      }
    } else {
      const d = new Date(from);
      d.setDate(1);
      const endLimit = endOfMonth(to);
      while (d <= endLimit) {
        chartDataMap[format(d, "MMM/yy", { locale: ptBR })] = {
          custo: 0,
          venda: 0,
          qtd: 0,
        };
        d.setMonth(d.getMonth() + 1);
      }
    }

    validEventos.forEach((ev) => {
      const d = new Date(ev.dataHora);
      const key = isDiario
        ? format(d, "dd/MM")
        : format(d, "MMM/yy", { locale: ptBR });

      if (chartDataMap[key]) {
        chartDataMap[key].custo += (ev.custoSnapshot || 0) * ev.quantidade;
        chartDataMap[key].venda += (ev.precoVendaSnapshot || 0) * ev.quantidade;
        chartDataMap[key].qtd += ev.quantidade;
      }
    });

    const monthlyData = Object.entries(chartDataMap).map(([mes, val]) => ({
      mes,
      ...val,
    }));

    const motivosMap: Record<
      string,
      {
        qtd: number;
        custo: number;
        itens: Record<
          string,
          { nome: string; qtd: number; custo: number; unidade: string }
        >;
      }
    > = {};

    validEventos.forEach((ev) => {
      const motivo = ev.motivo || "Não especificado";
      if (!motivosMap[motivo])
        motivosMap[motivo] = { qtd: 0, custo: 0, itens: {} };

      motivosMap[motivo].qtd += ev.quantidade;
      motivosMap[motivo].custo += (ev.custoSnapshot || 0) * ev.quantidade;

      if (ev.item) {
        const itemId = ev.item.id;
        if (!motivosMap[motivo].itens[itemId]) {
          motivosMap[motivo].itens[itemId] = {
            nome: ev.item.nome,
            qtd: 0,
            custo: 0,
            unidade: ev.unidade,
          };
        }
        motivosMap[motivo].itens[itemId].qtd += ev.quantidade;
        motivosMap[motivo].itens[itemId].custo +=
          (ev.custoSnapshot || 0) * ev.quantidade;
      }
    });

    const topMotivosPerdas = Object.entries(motivosMap)
      .map(([motivo, val]) => ({
        motivo,
        quantidade: val.qtd,
        custo: val.custo,
        topItens: Object.values(val.itens)
          .sort((a, b) => b.custo - a.custo)
          .slice(0, 3),
      }))
      .sort((a, b) => b.custo - a.custo)
      .slice(0, 5);

    const diasMap: Record<string, { qtd: number; custo: number }> = {
      Domingo: { qtd: 0, custo: 0 },
      Segunda: { qtd: 0, custo: 0 },
      Terça: { qtd: 0, custo: 0 },
      Quarta: { qtd: 0, custo: 0 },
      Quinta: { qtd: 0, custo: 0 },
      Sexta: { qtd: 0, custo: 0 },
      Sábado: { qtd: 0, custo: 0 },
    };

    validEventos.forEach((ev) => {
      const d = new Date(ev.dataHora);
      const dia = d.toLocaleDateString("pt-BR", { weekday: "long" });
      const simpleKey = (dia.charAt(0).toUpperCase() + dia.slice(1)).split(
        "-",
      )[0];
      const normalizedKey =
        Object.keys(diasMap).find((k) => k.startsWith(simpleKey)) || "Outro";

      if (diasMap[normalizedKey]) {
        diasMap[normalizedKey].qtd += ev.quantidade;
        diasMap[normalizedKey].custo += (ev.custoSnapshot || 0) * ev.quantidade;
      }
    });

    const perdasPorDiaSemana = Object.entries(diasMap).map(([dia, val]) => ({
      dia,
      quantidade: val.qtd,
      custo: val.custo,
    }));

    const topItens = combinedItens
      .sort((a, b) => b.custoPerda - a.custoPerda)
      .slice(0, 10);

    return {
      monthlyData,
      topMotivosPerdas,
      perdasPorDiaSemana,
      topItens,
      validEventos,
      diffDias,
    };
  }, [eventos, dateRange, combinedItens]);

  const summary = useMemo(() => {
    const totalCusto = stats.validEventos.reduce(
      (acc, e) => acc + (e.custoSnapshot || 0) * e.quantidade,
      0,
    );
    const totalVenda = stats.validEventos.reduce(
      (acc, e) => acc + (e.precoVendaSnapshot || 0) * e.quantidade,
      0,
    );
    const totalQtd = stats.validEventos.reduce(
      (acc, e) => acc + e.quantidade,
      0,
    );

    const diasValidos = Math.max(1, stats.diffDias + 1);
    const mediaQtdDia = totalQtd / diasValidos;

    return {
      totalCusto,
      totalVenda,
      totalQtd,
      mediaQtdDia,
      margemPerda:
        totalVenda > 0 ? ((totalVenda - totalCusto) / totalVenda) * 100 : 0,
    };
  }, [stats]);

  const handleDownloadPDF = () => {
    try {
      const fromFormatted = dateRange?.from
        ? format(dateRange.from, "dd/MM/yyyy")
        : "";
      const toFormatted = dateRange?.to
        ? format(dateRange.to, "dd/MM/yyyy")
        : "";
      const periodoTexto = `${fromFormatted} a ${toFormatted}`;

      const reportData = {
        summary: {
          totalCusto: summary.totalCusto,
          totalVenda: summary.totalVenda,
          // VOLTOU PARA NUMBER: Passamos o valor puro para não quebrar o TypeScript do PDF
          totalQtd: summary.totalQtd,
          margemPerda:
            Number(summary.margemPerda).toLocaleString("pt-BR", {
              maximumFractionDigits: 1,
            }) + "%",
        },
        topItens: stats.topItens,
        topMotivos: stats.topMotivosPerdas,
        periodoTexto,
      };
      generateReportPDF(reportData);
      toast.success("Relatório gerado com sucesso!");
    } catch (error) {
      toast.error("Ocorreu um erro ao gerar o relatório.");
    }
  };

  if (!hasPermission("relatorios:ver")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando dados...</p>
      </div>
    );
  }

  const isDiario = stats.diffDias <= 35;

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Análise detalhada do período filtrado"
      >
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleDownloadPDF}
            variant="outline"
            className="gap-2 border-primary/20 hover:bg-primary/5 w-full sm:w-auto"
          >
            <Download className="h-4 w-4" />
            Baixar PDF
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-full sm:w-65 justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd LLL, y", { locale: ptBR })} -{" "}
                      {format(dateRange.to, "dd LLL, y", { locale: ptBR })}
                    </>
                  ) : (
                    format(dateRange.from, "dd LLL, y", { locale: ptBR })
                  )
                ) : (
                  <span>Selecione um período</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
      </PageHeader>

      <main className="flex-1 space-y-6 px-4 py-5 md:px-8 md:py-6 overflow-y-auto">

        <SummaryCards summary={summary} />

        <ChartsOverview
          monthlyData={stats.monthlyData}
          perdasPorDiaSemana={stats.perdasPorDiaSemana}
          isDiario={isDiario}
        />

        <DetailsTables
          topItens={stats.topItens}
          topMotivos={stats.topMotivosPerdas}
        />
      </main>
    </>
  );
}

"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { getRelatorioGeral } from "@/app/actions/relatorios";
import { useAuth } from "@/lib/auth-context";
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  Loader2,
  Download,
  FileSpreadsheet,
  Store,
  Search,
  ListFilter,
  CheckCircle2,
} from "lucide-react";
import { Evento } from "@/lib/types";
import { toast } from "sonner";
import { generateReportPDF } from "@/lib/pdf-generator";
import { cn, formatCurrency, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  differenceInDays,
  subDays,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";

import { SummaryCards } from "@/components/relatorios/summary-cards";
import { ChartsOverview } from "@/components/relatorios/charts-overview";
import { DetailsTables } from "@/components/relatorios/details-tables";
import { PageHeader } from "@/components/PageHeader";
import { RelatorioMotivoModal } from "@/components/relatorios/relatorio-motivo-modal";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function RelatoriosPage() {
  const { hasPermission, activeLojaNome, activeLojaId, settings } = useAuth();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [lojaInfo, setLojaInfo] = useState<{ id: string; nome: string; cnpj: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [combinedItens, setCombinedItens] = useState<any[]>([]);
  const [isMotivoModalOpen, setIsMotivoModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Filtros da tabela de lançamentos detalhados
  const [tableSearch, setTableSearch] = useState("");
  const [tableMotivo, setTableMotivo] = useState("todos");
  const [tablePage, setTablePage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Carregar dados sempre que o dateRange ou o activeLojaId mudar
  useEffect(() => {
    async function loadData() {
      const from = dateRange?.from || startOfMonth(new Date());
      const to = dateRange?.to || from;

      setIsLoading(true);
      const startDateStr = format(from, "yyyy-MM-dd");
      const endDateStr = format(to, "yyyy-MM-dd");

      const result = await getRelatorioGeral(
        startDateStr,
        endDateStr,
        activeLojaId || undefined
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
        setCombinedItens(result.data.combinedItens || []);
        if (result.data.loja) {
          setLojaInfo(result.data.loja);
        }
      } else {
        toast.error(result.message || "Erro ao carregar relatórios");
      }
      setIsLoading(false);
    }

    loadData();
  }, [dateRange, activeLojaId]);

  // Presets rápidos de data
  const handleSelectPreset = (preset: "hoje" | "ontem" | "7dias" | "30dias" | "esteMes" | "mesPassado") => {
    const today = new Date();
    let newRange: DateRange;

    switch (preset) {
      case "hoje":
        newRange = { from: today, to: today };
        break;
      case "ontem": {
        const ontem = subDays(today, 1);
        newRange = { from: ontem, to: ontem };
        break;
      }
      case "7dias":
        newRange = { from: subDays(today, 6), to: today };
        break;
      case "30dias":
        newRange = { from: subDays(today, 29), to: today };
        break;
      case "esteMes":
        newRange = { from: startOfMonth(today), to: endOfMonth(today) };
        break;
      case "mesPassado": {
        const lastMonth = subMonths(today, 1);
        newRange = { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
        break;
      }
    }

    setDateRange(newRange);
    setIsCalendarOpen(false);
  };

  const stats = useMemo(() => {
    const from = dateRange?.from || startOfMonth(new Date());
    const to = dateRange?.to || from;

    // Os eventos já vêm filtrados com segurança pelo servidor para a loja e o período
    const validEventos = eventos.filter(
      (e) => e.status !== "rascunho" && e.status !== "rejeitado"
    );

    const diffDias = Math.max(0, differenceInDays(to, from));
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

    // Mapa dos dias da semana
    const diasMap: Record<string, { qtd: number; custo: number }> = {
      Domingo: { qtd: 0, custo: 0 },
      Segunda: { qtd: 0, custo: 0 },
      Terça: { qtd: 0, custo: 0 },
      Quarta: { qtd: 0, custo: 0 },
      Quinta: { qtd: 0, custo: 0 },
      Sexta: { qtd: 0, custo: 0 },
      Sábado: { qtd: 0, custo: 0 },
    };

    // Mapa de motivos
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
      // 1. Chart Mapping (compatível com a data formatada oficial do sistema)
      const evFormatted = formatDate(ev.dataHora); // ex: "03/11/2026"
      const [diaStr, mesStr, anoStr] = evFormatted.split("/");
      const dayMonthKey = `${diaStr}/${mesStr}`;

      const dForMonth = new Date(Number(anoStr), Number(mesStr) - 1, 1);
      const monthKey = format(dForMonth, "MMM/yy", { locale: ptBR });
      const chartKey = isDiario ? dayMonthKey : monthKey;

      if (!chartDataMap[chartKey]) {
        chartDataMap[chartKey] = { custo: 0, venda: 0, qtd: 0 };
      }

      chartDataMap[chartKey].custo += (ev.custoSnapshot || 0) * ev.quantidade;
      chartDataMap[chartKey].venda += (ev.precoVendaSnapshot || 0) * ev.quantidade;
      chartDataMap[chartKey].qtd += ev.quantidade;

      // 2. Dia da semana
      const dForWeek = new Date(Number(anoStr), Number(mesStr) - 1, Number(diaStr), 12, 0, 0);
      const diaSemanaStr = dForWeek.toLocaleDateString("pt-BR", { weekday: "long" });
      const simpleWeekKey = (diaSemanaStr.charAt(0).toUpperCase() + diaSemanaStr.slice(1)).split("-")[0];
      const normalizedWeekKey = Object.keys(diasMap).find((k) => k.startsWith(simpleWeekKey)) || "Outro";

      if (diasMap[normalizedWeekKey]) {
        diasMap[normalizedWeekKey].qtd += ev.quantidade;
        diasMap[normalizedWeekKey].custo += (ev.custoSnapshot || 0) * ev.quantidade;
      }

      // 3. Motivos
      let motivo = ev.motivo;
      if (!motivo && ev.evidencias && ev.evidencias.length > 0) {
        motivo = ev.evidencias.find((e: any) => e.motivo)?.motivo || undefined;
      }
      motivo = motivo || "Não especificado";

      if (!motivosMap[motivo]) {
        motivosMap[motivo] = { qtd: 0, custo: 0, itens: {} };
      }

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
        motivosMap[motivo].itens[itemId].custo += (ev.custoSnapshot || 0) * ev.quantidade;
      }
    });

    const monthlyData = Object.entries(chartDataMap).map(([mes, val]) => ({
      mes,
      ...val,
    }));

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
      0
    );
    const totalVenda = stats.validEventos.reduce(
      (acc, e) => acc + (e.precoVendaSnapshot || 0) * e.quantidade,
      0
    );
    const totalQtd = stats.validEventos.reduce(
      (acc, e) => acc + e.quantidade,
      0
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

  // Lista de motivos únicos para o filtro da tabela de eventos
  const uniqueTableMotivos = useMemo(() => {
    const set = new Set<string>();
    stats.validEventos.forEach((ev) => {
      if (ev.motivo) set.add(ev.motivo);
    });
    return Array.from(set).sort();
  }, [stats.validEventos]);

  // Eventos filtrados da tabela detalhada
  const filteredTableEventos = useMemo(() => {
    let list = stats.validEventos;

    if (tableMotivo !== "todos") {
      list = list.filter((e) => e.motivo === tableMotivo);
    }

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      list = list.filter(
        (e) =>
          (e.item?.nome || "").toLowerCase().includes(q) ||
          (e.item?.codigoInterno || "").toLowerCase().includes(q) ||
          (e.motivo || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [stats.validEventos, tableMotivo, tableSearch]);

  const totalTablePages = Math.ceil(filteredTableEventos.length / ITEMS_PER_PAGE);
  const paginatedTableEventos = useMemo(() => {
    const start = (tablePage - 1) * ITEMS_PER_PAGE;
    return filteredTableEventos.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTableEventos, tablePage]);

  const handleDownloadPDF = () => {
    try {
      const from = dateRange?.from || startOfMonth(new Date());
      const to = dateRange?.to || from;
      const fromFormatted = format(from, "dd/MM/yyyy");
      const toFormatted = format(to, "dd/MM/yyyy");
      const periodoTexto = fromFormatted === toFormatted ? fromFormatted : `${fromFormatted} a ${toFormatted}`;

      const reportData = {
        summary: {
          totalCusto: summary.totalCusto,
          totalVenda: summary.totalVenda,
          totalQtd: summary.totalQtd,
          margemPerda:
            Number(summary.margemPerda).toLocaleString("pt-BR", {
              maximumFractionDigits: 1,
            }) + "%",
        },
        todosItens: [...combinedItens].sort((a, b) => {
          const nomeA = a.item?.nome || "";
          const nomeB = b.item?.nome || "";
          return nomeA.localeCompare(nomeB);
        }),
        topMotivos: stats.topMotivosPerdas,
        periodoTexto,
      };

      const companyName = lojaInfo?.nome || activeLojaNome || settings?.empresaNome || undefined;
      generateReportPDF(reportData, companyName);
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

  const effectiveFrom = dateRange?.from || startOfMonth(new Date());
  const effectiveTo = dateRange?.to || effectiveFrom;
  const fromFormattedStr = format(effectiveFrom, "dd/MM/yyyy");
  const toFormattedStr = format(effectiveTo, "dd/MM/yyyy");
  const dateLabel = fromFormattedStr === toFormattedStr ? fromFormattedStr : `${fromFormattedStr} - ${toFormattedStr}`;

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Análise detalhada de perdas e descarte por filial e período"
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Indicador de Filial Ativa */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-foreground">
            <Store className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate max-w-[200px]" title={lojaInfo?.nome || activeLojaNome || "Filial"}>
              {lojaInfo?.nome || activeLojaNome || "Carregando Filial..."}
            </span>
          </div>

          <Button
            onClick={() => setIsMotivoModalOpen(true)}
            variant="outline"
            size="sm"
            className="gap-2 border-primary/20 hover:bg-primary/5 text-xs h-9"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
            Por Motivo
          </Button>

          <Button
            onClick={handleDownloadPDF}
            variant="outline"
            size="sm"
            className="gap-2 border-primary/20 hover:bg-primary/5 text-xs h-9"
          >
            <Download className="h-3.5 w-3.5 text-primary" />
            Baixar PDF
          </Button>

          {/* Seletor de Período Inteligente com Presets */}
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant="outline"
                size="sm"
                className="h-9 justify-start text-left font-normal text-xs gap-2 min-w-[190px]"
              >
                <CalendarIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">{dateLabel}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="end">
              <div className="flex flex-col gap-3">
                {/* Presets Rápidos */}
                <div className="grid grid-cols-3 gap-1.5 pb-2 border-b">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs font-medium"
                    onClick={() => handleSelectPreset("hoje")}
                  >
                    Hoje
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs font-medium"
                    onClick={() => handleSelectPreset("ontem")}
                  >
                    Ontem
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs font-medium"
                    onClick={() => handleSelectPreset("7dias")}
                  >
                    7 dias
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs font-medium"
                    onClick={() => handleSelectPreset("30dias")}
                  >
                    30 dias
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs font-medium"
                    onClick={() => handleSelectPreset("esteMes")}
                  >
                    Este Mês
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs font-medium"
                    onClick={() => handleSelectPreset("mesPassado")}
                  >
                    Mês Passado
                  </Button>
                </div>

                <div className="text-[11px] text-muted-foreground font-medium px-1">
                  Ou selecione no calendário (clique único para 1 dia):
                </div>

                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={(range) => {
                    if (range?.from && !range.to) {
                      // Ao clicar uma vez, assume o dia selecionado imediatamente
                      setDateRange({ from: range.from, to: range.from });
                    } else {
                      setDateRange(range);
                    }
                  }}
                  numberOfMonths={1}
                  locale={ptBR}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </PageHeader>

      <main className="flex-1 space-y-6 px-4 py-5 md:px-8 md:py-6 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando relatório da filial...</p>
          </div>
        ) : (
          <>
            {/* Banner de contextualização com a filial ativa */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-card border text-xs">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-primary shrink-0" />
                <span>
                  Exibindo dados isolados de:{" "}
                  <strong className="text-foreground font-semibold">
                    {lojaInfo?.nome || activeLojaNome}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>Período: <strong className="text-foreground">{dateLabel}</strong></span>
                <span>•</span>
                <Badge variant="secondary" className="text-[11px] font-medium">
                  {stats.validEventos.length} {stats.validEventos.length === 1 ? "registro" : "registros"}
                </Badge>
              </div>
            </div>

            {/* Cards de Resumo */}
            <SummaryCards summary={summary} />

            {/* Gráficos de Evolução e Dias da Semana */}
            <ChartsOverview
              monthlyData={stats.monthlyData}
              perdasPorDiaSemana={stats.perdasPorDiaSemana}
              isDiario={stats.diffDias <= 35}
            />

            {/* Top 10 Itens e Principais Motivos */}
            <DetailsTables
              topItens={stats.topItens}
              topMotivos={stats.topMotivosPerdas}
            />

            {/* NOVA SEÇÃO: Lançamentos Detalhados de Perda no Período */}
            <Card className="shadow-sm">
              <CardHeader className="px-4 md:px-6 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                      <ListFilter className="h-5 w-5 text-primary" />
                      Lançamentos de Perda no Período
                    </CardTitle>
                    <CardDescription>
                      Todos os registros de perdas computados para {lojaInfo?.nome || activeLojaNome} no período ({dateLabel})
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="w-fit text-xs font-semibold">
                    {filteredTableEventos.length} de {stats.validEventos.length} itens
                  </Badge>
                </div>

                {/* Filtros da Tabela */}
                <div className="flex flex-col sm:flex-row gap-3 pt-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por produto, código ou motivo..."
                      value={tableSearch}
                      onChange={(e) => {
                        setTableSearch(e.target.value);
                        setTablePage(1);
                      }}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>

                  <Select
                    value={tableMotivo}
                    onValueChange={(val) => {
                      setTableMotivo(val);
                      setTablePage(1);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-52 h-9 text-xs">
                      <SelectValue placeholder="Filtrar por motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os motivos</SelectItem>
                      {uniqueTableMotivos.map((motivo) => (
                        <SelectItem key={motivo} value={motivo}>
                          {motivo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent className="px-0 md:px-6 pb-4">
                {filteredTableEventos.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground border border-dashed rounded-lg mx-4 md:mx-0">
                    Nenhum lançamento encontrado para os filtros selecionados.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-[11px] uppercase tracking-wider">
                          <TableHead className="w-24">Data</TableHead>
                          <TableHead className="w-24">Código</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead className="text-right">Qtd.</TableHead>
                          <TableHead className="text-right">Custo Unit.</TableHead>
                          <TableHead className="text-right">Total Perda</TableHead>
                          <TableHead className="w-24 text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedTableEventos.map((ev) => (
                          <TableRow key={ev.id} className="text-xs">
                            <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                              {formatDate(ev.dataHora)}
                            </TableCell>
                            <TableCell className="font-mono text-muted-foreground">
                              {ev.item?.codigoInterno || "-"}
                            </TableCell>
                            <TableCell className="font-medium text-foreground max-w-[250px] truncate" title={ev.item?.nome}>
                              {ev.item?.nome || "Item excluído"}
                            </TableCell>
                            <TableCell className="text-muted-foreground truncate max-w-[140px]">
                              {ev.item?.categoria || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-normal">
                                {ev.motivo || "Não especificado"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium whitespace-nowrap">
                              {ev.quantidade} {ev.unidade}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                              {formatCurrency(ev.custoSnapshot || 0)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-destructive whitespace-nowrap">
                              {formatCurrency((ev.custoSnapshot || 0) * ev.quantidade)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={cn(getStatusColor(ev.status as any), "text-[10px] py-0")}>
                                {getStatusLabel(ev.status as any)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Paginação da Tabela */}
                    {totalTablePages > 1 && (
                      <div className="flex items-center justify-between px-4 pt-4 border-t text-xs text-muted-foreground">
                        <div>
                          Página {tablePage} de {totalTablePages}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-xs"
                            onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                            disabled={tablePage === 1}
                          >
                            Anterior
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-xs"
                            onClick={() => setTablePage((p) => Math.min(totalTablePages, p + 1))}
                            disabled={tablePage === totalTablePages}
                          >
                            Próxima
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <RelatorioMotivoModal
        open={isMotivoModalOpen}
        onOpenChange={setIsMotivoModalOpen}
      />
    </>
  );
}

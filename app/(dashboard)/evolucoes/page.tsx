"use client";

import { useState, useEffect, useMemo } from "react";
import { getDadosEvolucao } from "@/app/actions/evolucoes";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2, TrendingUp, TrendingDown, Minus, Download, BarChart2 } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";


import { generateEvolucaoPDF } from "@/lib/pdf-generator";

const chartConfigPerda = {
  taxaPerda: { label: "Taxa de Perda (%)", color: "var(--chart-1)" },
};

const chartConfigValores = {
  custoPerda: { label: "Custo Perda (R$)", color: "var(--chart-1)" },
  faturamento: { label: "Faturamento (R$)", color: "var(--chart-2)" },
};

export default function EvolucoesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [historico, setHistorico] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  

  const hoje = new Date();
  const mesAnterior = new Date();
  mesAnterior.setMonth(hoje.getMonth() - 1);
  
  const formataInputMonth = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const [dataInicio, setDataInicio] = useState(formataInputMonth(mesAnterior));
  const [dataFim, setDataFim] = useState(formataInputMonth(hoje));

  const [produtoId, setProdutoId] = useState<string>("todos");
  const [comboOpen, setComboOpen] = useState(false);
  

  const META_PERDA = 2;

  useEffect(() => {
    async function carregarDados() {
      setIsLoading(true);
      const res = await getDadosEvolucao(
        dataInicio, 
        dataFim,
        produtoId === "todos" ? undefined : produtoId
      );
      if (res.success && res.data) {
        setHistorico(res.data.historico);
        setProdutos(res.data.produtos);
      } else {
        toast.error("Erro ao carregar os dados de evolução.");
      }
      setIsLoading(false);
    }
    carregarDados();
  }, [dataInicio, dataFim, produtoId]);

  const handleDownloadPDF = () => {
    const nomeProduto = produtoId === "todos" 
      ? "Todos os Produtos" 
      : produtos.find(p => p.id === produtoId)?.nome || "Produto Específico";
      
    generateEvolucaoPDF({
      historico,
      produtoNome: nomeProduto,
      periodoTexto: `${dataInicio} até ${dataFim}`,
      metaPerda: META_PERDA
    });
    toast.success("Evolução exportada com sucesso!");
  };

  const selectedProdNome = produtoId === "todos" 
    ? "Visão Geral (Todos os Produtos)" 
    : produtos.find(p => p.id === produtoId)?.nome || "Selecionar produto...";

  return (
    <>
      <PageHeader 
        title="Evolução de Perdas" 
        description="Acompanhe o histórico e a variação das taxas de perda ao longo do tempo"
      >
        <Button 
          variant="outline" 
          className="gap-2 border-primary/20 hover:bg-primary/5"
          onClick={handleDownloadPDF}
          disabled={isLoading || historico.length === 0}
        >
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button>
      </PageHeader>

      <main className="flex-1 space-y-6 px-4 py-5 md:px-8 md:py-6 overflow-y-auto">
        {}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 max-w-sm">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Filtrar por Produto
            </label>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboOpen}
                  className="w-full justify-between"
                >
                  <span className="truncate">{selectedProdNome}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar por código ou nome..." />
                  <CommandList>
                    <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="todos"
                        onSelect={() => {
                          setProdutoId("todos");
                          setComboOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", produtoId === "todos" ? "opacity-100" : "opacity-0")} />
                        Visão Geral (Todos)
                      </CommandItem>
                      {produtos.map((prod) => (
                        <CommandItem
                          key={prod.id}
                          value={`${prod.codigoInterno} ${prod.nome}`}
                          onSelect={() => {
                            setProdutoId(prod.id);
                            setComboOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", produtoId === prod.id ? "opacity-100" : "opacity-0")} />
                          {prod.codigoInterno ? `[${prod.codigoInterno}] ` : ""}{prod.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Mês Inicial
              </label>
              <input
                type="month"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Mês Final
              </label>
              <input
                type="month"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Processando histórico...</p>
          </div>
        ) : historico.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] border border-dashed rounded-lg bg-surface/50">
            <BarChart2 className="h-12 w-12 text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground">Nenhum dado encontrado para o filtro atual.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Taxa de Perda Histórica (%)</CardTitle>
                <CardDescription>
                  Comparativo mês a mês em relação à meta de {META_PERDA}%
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] pt-4">
                <ChartContainer config={chartConfigPerda} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historico} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                      <XAxis 
                        dataKey="label" 
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} 
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `${val}%`}
                      />
                      <ChartTooltip content={<ChartTooltipContent formatter={(val: any) => `${Number(val).toFixed(2)}%`} className="bg-slate-900 border-slate-800 text-slate-100 shadow-xl" />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      
                      <ReferenceLine y={META_PERDA} stroke="hsl(var(--success))" strokeDasharray="3 3" label={{ position: 'top', value: `Meta (${META_PERDA}%)`, fill: 'hsl(var(--success))', fontSize: 11 }} />
                      
                      <Line 
                        type="monotone" 
                        dataKey="taxaPerda" 
                        name="Taxa de Perda (%)" 
                        stroke="var(--chart-1)" 
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 2, fill: "var(--background)", stroke: "var(--chart-1)" }}
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Faturamento vs Perda (R$)</CardTitle>
                <CardDescription>
                  Evolução de Valores de Vendas e Custos de Perda
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] pt-4">
                <ChartContainer config={chartConfigValores} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={historico} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                      <XAxis 
                        dataKey="label" 
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} 
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => {
                          if (val >= 1000) return `R$${(val/1000).toFixed(1)}k`;
                          return `R$${val}`;
                        }}
                      />
                      <ChartTooltip content={<ChartTooltipContent formatter={(val: any) => formatCurrency(Number(val))} className="bg-slate-900 border-slate-800 text-slate-100 shadow-xl" />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      
                      <Bar dataKey="faturamento" name="Faturamento (R$)" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="custoPerda" name="Custo Perda (R$)" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {}
            <Card className="shadow-sm lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Detalhamento Financeiro</CardTitle>
                <CardDescription>
                  Relação entre faturamento e perdas mês a mês
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 rounded-l-md">Mês</th>
                        <th className="px-4 py-3 text-right">Faturamento</th>
                        <th className="px-4 py-3 text-right text-destructive">Custo Perda</th>
                        <th className="px-4 py-3 text-right">Taxa de Perda</th>
                        <th className="px-4 py-3 text-center rounded-r-md">Evolução</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historico.map((h) => (
                        <tr key={h.mesIso} className="border-b last:border-0 border-border hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{h.label}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(h.faturamento)}</td>
                          <td className="px-4 py-3 text-right text-destructive font-bold">{formatCurrency(h.custoPerda)}</td>
                          <td className="px-4 py-3 text-right font-bold">
                            <span className={h.taxaPerda > META_PERDA ? "text-destructive" : "text-success"}>
                              {h.taxaPerda.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 flex justify-center">
                            {h.statusAumento === "aumentou" && (
                              <div className="flex items-center gap-1 text-destructive font-medium bg-destructive/10 px-2 py-1 rounded-full text-xs">
                                <TrendingUp className="h-3 w-3" /> Aumentou
                              </div>
                            )}
                            {h.statusAumento === "diminuiu" && (
                              <div className="flex items-center gap-1 text-success font-medium bg-success/10 px-2 py-1 rounded-full text-xs">
                                <TrendingDown className="h-3 w-3" /> Diminuiu
                              </div>
                            )}
                            {h.statusAumento === "manteve" && (
                              <div className="flex items-center gap-1 text-muted-foreground font-medium bg-muted px-2 py-1 rounded-full text-xs">
                                <Minus className="h-3 w-3" /> Manteve
                              </div>
                            )}
                            {h.statusAumento === "N/A" && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </>
  );
}

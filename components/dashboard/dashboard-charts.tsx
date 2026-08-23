"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger, PopoverPrimitive } from "@/components/ui/popover";

const chartConfig = {
  custo: { label: "Perda (Custo)", color: "var(--chart-1)" },
  venda: { label: "Faturamento", color: "var(--chart-2)" },
};

const categoryColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

interface DashboardChartsProps {

  serieDiaria: any[]; 

  produtosFiltrados: any[]; 
}

export function DashboardCharts({
  serieDiaria,
  produtosFiltrados,
}: DashboardChartsProps) {
  


  const tendencia = serieDiaria.map(d => ({
    dia: d.dia,
    custo: d.Perda,
    venda: d.Faturamento
  }));


  const catMap: Record<string, number> = {};
  produtosFiltrados.forEach(p => {
    const perdaValor = p.perdido * p.custo;
    if (perdaValor > 0) {
      catMap[p.categoria] = (catMap[p.categoria] || 0) + perdaValor;
    }
  });
  
  const topCategorias = Object.entries(catMap)
    .map(([categoria, custo]) => ({ categoria, custo }))
    .sort((a, b) => b.custo - a.custo)
    .slice(0, 5);

  const customYAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const isTruncated = payload.value.length > 12;
    const text = isTruncated ? `${payload.value.substring(0, 12)}...` : payload.value;
    return (
      <g transform={`translate(${x},${y})`}>
        <title>{payload.value}</title>
        <text x={0} y={0} dy={4} textAnchor="end" fill="var(--muted-foreground)" fontSize={11} className="font-medium">
          {text}
        </text>
      </g>
    );
  };

  return (
    <div className="h-full">

      {}
      <div className="rounded-xl bg-surface p-4 shadow-sm flex flex-col h-full">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[13px] font-medium flex items-center gap-1.5">
            Top Categorias
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full">
                  <Info className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="right" align="center" className="w-64 text-sm p-4 leading-relaxed bg-slate-900 border-slate-800 shadow-xl z-50">
                <p className="text-xs text-slate-300">
                  As categorias de produtos que mais geraram custos de desperdício no período.
                </p>
                <PopoverPrimitive.Arrow className="fill-slate-900" width={16} height={8} />
              </PopoverContent>
            </Popover>
          </h2>
          <span className="text-[11px] text-muted-foreground">Maior custo de perda</span>
        </div>
        <div className="flex-1 min-h-[250px]">
          {topCategorias.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topCategorias}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    className="stroke-muted"
                  />
                  <YAxis
                    dataKey="categoria"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={90}
                    tick={customYAxisTick}
                  />
                  <XAxis type="number" hide />
                  <ChartTooltip content={<ChartTooltipContent className="bg-slate-900 border-slate-800 text-slate-100 shadow-xl" />} />
                  <Bar dataKey="custo" radius={4} barSize={28}>
                    {topCategorias.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={categoryColors[index % categoryColors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Nenhuma perda registrada.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

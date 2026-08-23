
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface ChartsOverviewProps {
  monthlyData: any[];
  perdasPorDiaSemana: any[];
  isDiario: boolean;
}

export function ChartsOverview({
  monthlyData,
  perdasPorDiaSemana,
  isDiario,
}: ChartsOverviewProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
      {}
      <Card className="flex flex-col shadow-sm">
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-lg md:text-xl">
            Evolução no Período
          </CardTitle>
          <CardDescription>
            {isDiario
              ? "Acompanhamento diário das perdas registradas"
              : "Acompanhamento mensal das perdas registradas"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 px-2 md:px-6 pb-4">
          {}
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={monthlyData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  className="stroke-muted"
                />
                <XAxis
                  dataKey="mes"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs text-muted-foreground"
                  tickMargin={10}
                />
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs text-muted-foreground"
                  tickFormatter={(value) => `R$${value}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-md">
                          <p className="mb-2 font-medium">{label}</p>
                          {payload.map((entry, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 text-sm"
                            >
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-muted-foreground">
                                {entry.name}:
                              </span>
                              <span className="font-medium">
                                {entry.name === "Qtd. Itens"
                                  ? Number(entry.value).toLocaleString(
                                      "pt-BR",
                                      { maximumFractionDigits: 3 },
                                    )
                                  : formatCurrency(entry.value as number)}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="custo"
                  name="Custo de Perda"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  yAxisId="left"
                  dataKey="venda"
                  name="Perda em Venda"
                  fill="#f97316"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {}
      <Card className="flex flex-col shadow-sm">
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-lg md:text-xl">
            Perdas por Dia da Semana
          </CardTitle>
          <CardDescription>
            Distribuição de custo nos dias do período filtrado
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 px-2 md:px-6 pb-4">
          {}
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={perdasPorDiaSemana}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  className="stroke-muted"
                />
                <XAxis
                  dataKey="dia"
                  tickLine={false}
                  axisLine={false}
                  className="text-[10px] md:text-xs text-muted-foreground"
                  tickMargin={10}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  className="text-xs text-muted-foreground"
                  tickFormatter={(value) => `R$${value}`}
                />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-md">
                          <p className="mb-2 font-medium">{label}</p>
                          <div className="flex flex-col gap-1 text-sm">
                            <span className="text-muted-foreground">
                              Custo Total:{" "}
                              <span className="font-medium text-foreground">
                                {formatCurrency(payload[0].value as number)}
                              </span>
                            </span>
                            <span className="text-muted-foreground">
                              Quantidade:{" "}
                              <span className="font-medium text-foreground">
                                {Number(
                                  payload[0].payload.quantidade,
                                ).toLocaleString("pt-BR", {
                                  maximumFractionDigits: 3,
                                })}{" "}
                                itens
                              </span>
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="custo"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

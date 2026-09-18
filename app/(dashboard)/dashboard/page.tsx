"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import useSWR from "swr";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger, PopoverPrimitive } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


import { PageHeader } from "@/components/PageHeader";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { CriticalItems } from "@/components/dashboard/critical-items";
import { DashboardKpis } from "@/components/dashboard/dashboard-kpis";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { TopVendasList } from "@/components/vendas/TopVendasList";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { brl, pct, num } from "@/lib/format";

type ProdutoLinha = {
  codigo: string;
  descricao: string;
  categoria: string;
  chegou: number;
  vendido: number;
  perdido: number;
  custo: number;
  precoVenda: number;
  faturamentoReal?: number;
  limitePerda: number;
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function rangeDias(inicio: string, fim: string): string[] {
  const out: string[] = [];
  const a = new Date(inicio + "T00:00:00Z");
  const b = new Date(fim + "T00:00:00Z");
  if (isNaN(a.getTime()) || isNaN(b.getTime()) || b < a) return out;
  for (let d = new Date(a); d <= b && out.length < 400; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(isoDate(d));
  }
  return out;
}

type Totais = {
  faturamento: number;
  custoTotal: number;
  lucro: number;
  margem: number;
  chegou: number;
  vendido: number;
  perdido: number;
  perdaPct: number;
  perdaValor: number;
  custoVendido: number;
  ruptura: number;
  excesso: number;
  xmlsImportados: number;
  xmlsPendentes: number;
  itensXml: number;
};

function agregarReais(linhas: ProdutoLinha[], limiteGlobal: number, importados: number): Totais {
  const faturamento = linhas.reduce((s, l) => s + (l.faturamentoReal || (l.vendido * l.precoVenda)), 0);
  const custoTotal = linhas.reduce((s, l) => s + l.chegou * l.custo, 0);
  const custoVendido = linhas.reduce((s, l) => s + l.vendido * l.custo, 0);
  const perdaValor = linhas.reduce((s, l) => s + l.perdido * l.custo, 0);
  const chegou = linhas.reduce((s, l) => s + l.chegou, 0);
  const vendido = linhas.reduce((s, l) => s + l.vendido, 0);
  const perdido = linhas.reduce((s, l) => s + l.perdido, 0);

  const lucro = faturamento - custoVendido - perdaValor;

  return {
    faturamento,
    custoTotal,
    custoVendido,
    lucro,
    margem: faturamento ? (lucro / faturamento) * 100 : 0,
    chegou,
    vendido,
    perdido,
    perdaPct: chegou ? (perdido / chegou) * 100 : 0,
    perdaValor,
    ruptura: linhas.filter((l) => l.chegou > 0 && l.vendido / l.chegou > 0.95).length,
    excesso: linhas.filter((l) => l.chegou > 0 && (l.perdido / l.chegou) * 100 > limiteGlobal).length,
    xmlsImportados: importados,
    xmlsPendentes: 0,
    itensXml: chegou,
  };
}

type Modo = "dia" | "semana" | "mes";

function weekStart(value: string) {

  const [y, w] = value.split("-W");
  const jan4 = new Date(Date.UTC(Number(y), 0, 4));
  const dow = (jan4.getUTCDay() + 6) % 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dow + (Number(w) - 1) * 7);
  return monday;
}

function periodoDias(modo: Modo, valor: string): string[] {
  if (!valor) return [];
  if (modo === "dia") return [valor];
  if (modo === "semana") {
    const s = weekStart(valor);
    const e = new Date(s);
    e.setUTCDate(s.getUTCDate() + 6);
    return rangeDias(isoDate(s), isoDate(e));
  }
  const [y, m] = valor.split("-").map(Number) as [number, number];
  const s = new Date(Date.UTC(y, m - 1, 1));
  const e = new Date(Date.UTC(y, m, 0));
  return rangeDias(isoDate(s), isoDate(e));
}

function rotulo(modo: Modo, valor: string) {
  if (!valor) return "—";
  if (modo === "dia") return valor.split("-").reverse().join("/");
  if (modo === "semana") {
    const s = weekStart(valor);
    return `sem. ${valor.split("-W")[1]} · ${isoDate(s).split("-").reverse().slice(0, 2).join("/")}`;
  }
  const [y, m] = valor.split("-");
  return `${["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][Number(m) - 1]}/${y}`;
}

const delta = (a: number, b: number) => (b === 0 ? (a === 0 ? 0 : 100) : ((a - b) / Math.abs(b)) * 100);

export default function Dashboard() {
  const { hasPermission, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !hasPermission("dashboard:ver")) {
      router.replace("/eventos/novo");
    }
  }, [hasPermission, isLoading, router]);

  const [modo, setModo] = useState<Modo>("semana");
  const [pa, setPa] = useState("2026-W33");
  const [pb, setPb] = useState("2026-W32");

  useEffect(() => {
    const saved = localStorage.getItem("dashboard_modo") as Modo | null;
    if (saved && ["dia", "semana", "mes"].includes(saved)) {
      setModo(saved);
      if (saved === "dia") {
        setPa("2026-08-14");
        setPb("2026-08-13");
      } else if (saved === "semana") {
        setPa("2026-W33");
        setPb("2026-W32");
      } else {
        setPa("2026-08");
        setPb("2026-07");
      }
    }
  }, []);

  const handleModoChange = (m: Modo) => {
    setModo(m);
    localStorage.setItem("dashboard_modo", m);
    if (m === "dia") {
      setPa("2026-08-14");
      setPb("2026-08-13");
    } else if (m === "semana") {
      setPa("2026-W33");
      setPb("2026-W32");
    } else {
      setPa("2026-08");
      setPb("2026-07");
    }
  };
  const [busca, setBusca] = useState("");
  const [limiteGlobal, setLimiteGlobal] = useState(2);

  const diasA = useMemo(() => periodoDias(modo, pa), [modo, pa]);
  const diasB = useMemo(() => periodoDias(modo, pb), [modo, pb]);

  const { data: dashboardData, isLoading: isLoadingReal, error } = useSWR(
    ['dashboard_metrics', diasA, diasB],
    async ([, dA, dB]: [string, string[], string[]]) => {
      const { getRealDashboardMetrics } = await import("@/app/actions/dashboard");
      const result = await getRealDashboardMetrics(dA, dB);
      if (!result.success) throw new Error(result.error || "Erro ao carregar");
      return result.data;
    },
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (error) toast.error("Erro ao carregar métricas reais do dashboard.");
  }, [error]);

  const linhasA = dashboardData?.linhasA || [];
  const linhasB = dashboardData?.linhasB || [];
  const serie = dashboardData?.serie || [];
  const xmlsA = dashboardData?.xmlsImportadosA || 0;
  const xmlsB = dashboardData?.xmlsImportadosB || 0;

  const filteredLinhasA = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return linhasA;
    return linhasA.filter((l) => l.descricao.toLowerCase().includes(q) || l.codigo.toLowerCase().includes(q));
  }, [linhasA, busca]);

  const filteredLinhasB = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return linhasB;
    return linhasB.filter((l) => l.descricao.toLowerCase().includes(q) || l.codigo.toLowerCase().includes(q));
  }, [linhasB, busca]);

  const A = useMemo(() => agregarReais(filteredLinhasA, limiteGlobal, xmlsA), [filteredLinhasA, limiteGlobal, xmlsA]);
  const B = useMemo(() => agregarReais(filteredLinhasB, limiteGlobal, xmlsB), [filteredLinhasB, limiteGlobal, xmlsB]);

  const tabela = useMemo(() => {
    return filteredLinhasA
      .map((l) => {
        const perdaPct = l.chegou ? (l.perdido / l.chegou) * 100 : 0;
        const giro = l.chegou ? (l.vendido / l.chegou) * 100 : 0;
        const limite = l.limitePerda > 0 ? Math.min(l.limitePerda, limiteGlobal) : limiteGlobal;
        const status: "estoque_baixo" | "desperdicio" | "ok" =
          giro > 95 ? "estoque_baixo" : perdaPct > limite ? "desperdicio" : "ok";
        return { ...l, perdaPct, giro, limite, status, faturou: l.vendido * l.precoVenda };
      })
      .sort((a, b) => b.faturou - a.faturou);
  }, [filteredLinhasA, limiteGlobal]);

  const desperdicios = tabela.filter((l) => l.status === "desperdicio");

  const inputType = modo === "dia" ? "date" : modo === "semana" ? "week" : "month";

  return (
    <>
      <PageHeader
        title="Painel de estufa"
        description={`${rotulo(modo, pa)} vs ${rotulo(modo, pb)} · ${num(A.xmlsImportados)} XMLs importados`}
      >
        <div className="flex items-center gap-2">
          <TopVendasList />
          <div className="flex items-center gap-1 rounded-lg bg-surface p-0.5 text-xs">
            {(["dia", "semana", "mes"] as Modo[]).map((m) => (
              <button
                key={m}
                onClick={() => handleModoChange(m)}
                className={`rounded-md px-3 py-1.5 capitalize transition-colors ${modo === m ? "bg-surface-3 text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {m === "mes" ? "mês" : m}
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      <main className="flex-1 overflow-y-auto space-y-6 px-4 py-5 md:px-8 md:py-6">
        { }
        <DashboardFilters
          modo={modo}
          pa={pa}
          setPa={setPa}
          pb={pb}
          setPb={setPb}
          limiteGlobal={limiteGlobal}
          setLimiteGlobal={setLimiteGlobal}
          busca={busca}
          setBusca={setBusca}
        />

        <DashboardKpis A={A} B={B} limiteGlobal={limiteGlobal} />


        { }
        <section className="grid gap-2.5 lg:grid-cols-3">
          <div className="rounded-xl bg-surface p-4 lg:col-span-2 shadow-sm">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[13px] font-medium flex items-center gap-1.5">
                Faturamento por dia
                <Popover>
                  <PopoverTrigger asChild>
                    <button suppressHydrationWarning className="text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full">
                      <Info className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="center" className="w-64 text-sm p-4 leading-relaxed bg-slate-900 border-slate-800 shadow-xl z-50">
                    <p className="text-xs text-slate-300">
                      Comparativo de Receita Bruta Diária do período filtrado contra o período anterior.
                    </p>
                    <PopoverPrimitive.Arrow className="fill-slate-900" width={16} height={8} />
                  </PopoverContent>
                </Popover>
              </h2>
              <span className="text-[11px] text-muted-foreground">
                linha sólida: {rotulo(modo, pa)} · linha pontilhada: {rotulo(modo, pb)}
              </span>
            </div>
            <div className="h-56 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={serie} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="var(--surface-3)" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={45} axisLine={false} tickLine={false} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} />
                  <Tooltip
                    allowEscapeViewBox={{ x: true, y: true }}
                    wrapperStyle={{ zIndex: 100 }}
                    itemStyle={{ color: "#f1f5f9" }}
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #1e293b",
                      borderRadius: 10,
                      fontSize: 12,
                      color: "#f1f5f9",
                    }}
                  />
                  <Line type="monotone" dataKey="Faturamento" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                  <Line
                    type="monotone"
                    dataKey="comparado"
                    name="Comparado"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl bg-surface p-4 shadow-sm">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[13px] font-medium flex items-center gap-1.5">
                % de perda por dia
                <Popover>
                  <PopoverTrigger asChild>
                    <button suppressHydrationWarning className="text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full">
                      <Info className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="center" className="w-64 text-sm p-4 leading-relaxed bg-slate-900 border-slate-800 shadow-xl z-50">
                    <p className="text-xs text-slate-300">
                      Percentual financeiro de perdas em relação à receita bruta de cada dia.
                    </p>
                    <PopoverPrimitive.Arrow className="fill-slate-900" width={16} height={8} />
                  </PopoverContent>
                </Popover>
              </h2>
              <span className="text-[11px] text-muted-foreground">limite {limiteGlobal}%</span>
            </div>
            <div className="h-56 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serie} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                  <CartesianGrid stroke="var(--surface-3)" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={30} axisLine={false} tickLine={false} />
                  <Tooltip
                    allowEscapeViewBox={{ x: true, y: true }}
                    wrapperStyle={{ zIndex: 100 }}
                    cursor={{ fill: "var(--surface-2)" }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "Perda"]}
                    itemStyle={{ color: "#f1f5f9" }}
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #1e293b",
                      borderRadius: 10,
                      fontSize: 12,
                      color: "#f1f5f9",
                    }}
                  />
                  <Bar dataKey="Perda" radius={[4, 4, 0, 0]} fill="var(--chart-3)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        { }
        <div className="grid gap-4 lg:grid-cols-2 xl:gap-6 mt-2">
          { }
          <div className="lg:col-span-1">
            <CriticalItems itens={desperdicios} />
          </div>

          <div className="lg:col-span-1">
            {isLoadingReal ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4 bg-surface rounded-xl shadow-sm h-full min-h-[250px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground text-sm">Calculando dados das categorias...</p>
              </div>
            ) : (
              <DashboardCharts
                serieDiaria={serie}
                produtosFiltrados={filteredLinhasA}
              />
            )}
          </div>
        </div>



        {isLoadingReal && (
          <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Buscando dados no banco...
          </p>
        )}
      </main>
    </>
  );
}



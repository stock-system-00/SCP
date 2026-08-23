import { Kpi } from "@/components/dash/Kpi";
import { Carousel } from "@/components/dash/Carousel";
import { DollarSign, AlertCircle, TrendingUp } from "lucide-react";
import { brl, pct } from "@/lib/format";

export type Totais = {
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

const delta = (a: number, b: number) => (b === 0 ? (a === 0 ? 0 : 100) : ((a - b) / Math.abs(b)) * 100);

export function DashboardKpis({ A, B, limiteGlobal }: { A: Totais; B: Totais; limiteGlobal: number }) {
  return (
    <section>
      <Carousel gridClass="md:grid-cols-2 lg:grid-cols-4">
        {[
          <Kpi
            key="fat"
            label="Faturou"
            value={brl(A.faturamento)}
            delta={delta(A.faturamento, B.faturamento)}
            infoContent={
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 font-medium text-slate-100">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  Receita Bruta Total
                </p>
                <p className="text-muted-foreground text-xs">
                  <strong>Como é calculado:</strong> Soma exata da coluna de valores dos <em>Relatórios de Vendas</em> importados.
                </p>
                <p className="text-muted-foreground text-xs">
                  O sistema não usa o preço do cadastro produto, garantindo que descontos e flutuações reais de caixa reflitam perfeitamente aqui.
                </p>
              </div>
            }
          />,
          <Kpi
            key="custoVendas"
            label="Custo Vendas"
            value={brl(A.custoVendido)}
            delta={delta(A.custoVendido, B.custoVendido)}
            invert
            tone="warning"
            infoContent={
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 font-medium text-slate-100">
                  <TrendingUp className="h-4 w-4 text-amber-400" />
                  Custo de Aquisição dos Produtos
                </p>
                <p className="text-muted-foreground text-xs">
                  <strong>Atenção:</strong> Considera apenas o custo do produto em si, que vem baseado na nota fiscal de entrada.
                </p>
                <p className="text-muted-foreground text-xs">
                  <strong>Como é calculado:</strong> <em>(Qtd vendida no relatório)</em> × <em>(Custo da Nota Fiscal)</em>.
                </p>
              </div>
            }
          />,
          <Kpi
            key="perda"
            label="Perda"
            value={pct(A.perdaPct)}
            delta={delta(A.perdaPct, B.perdaPct)}
            invert
            tone={A.perdaPct > limiteGlobal ? "negative" : "positive"}
            hint={`${brl(A.perdaValor)} · limite ${limiteGlobal}%`}
            infoContent={
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 font-medium text-slate-100">
                  <AlertCircle className="h-4 w-4 text-rose-400" />
                  Custo e Índice de Desperdício
                </p>
                <p className="text-muted-foreground text-xs">
                  <strong>Como é calculado:</strong> <em>(Qtd registrada no app de Perdas)</em> × <em>(Custo da Nota Fiscal)</em>.
                </p>
                <p className="text-muted-foreground text-xs">
                  A porcentagem representa o volume físico jogado fora contra o que entrou via Notas Fiscais no mesmo período.
                </p>
              </div>
            }
          />,
          <Kpi
            key="lucro"
            label="Lucro"
            value={brl(A.lucro)}
            delta={delta(A.lucro, B.lucro)}
            hint={`margem ${pct(A.margem)}`}
            infoContent={
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 font-medium text-slate-100">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  Lucro Bruto (Apenas Produtos)
                </p>
                <p className="text-muted-foreground text-xs">
                  <strong>Como é calculado:</strong> <em>Faturamento</em> − <em>Custo Vendas</em> − <em>Custo Perda</em>.
                </p>
                <p className="text-muted-foreground text-xs">
                  Indicador essencial para saber se a venda cobre o que foi gasto para adquirir as mercadorias, descontando as que foram jogadas fora.
                </p>
              </div>
            }
          />,
        ]}
      </Carousel>
    </section>
  );
}

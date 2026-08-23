import React from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { PageHeader } from "@/components/PageHeader";
import { VendaDetalheItens } from "@/components/vendas/VendaDetalheItens";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, Package, Tag, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function VendaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const ownerId = session?.ownerId || session?.id || "";

  const unwrappedParams = await params;
  const vendaId = unwrappedParams.id;

  const venda = await prisma.vendaDiaria.findUnique({
    where: {
      id: vendaId,
      ownerId
    },
    include: {
      itens: {
        include: {
          item: true
        }
      }
    }
  });

  if (!venda) {
    return notFound();
  }

  // Cálculos de Insights
  let valorTotal = 0;
  let totalItensVendidos = 0; // Quantidade de itens físicos vendidos
  let produtoMaisVendido = { nome: "-", qtd: 0 };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Convert to plain JS objects for the Client Component and calculate totals
  const itensMapped = venda.itens.map((vi: any) => {
    const vLiquido = Number(vi.valorLiquido);
    const qtd = Number(vi.quantidade);

    valorTotal += vLiquido;
    totalItensVendidos += qtd;

    if (qtd > produtoMaisVendido.qtd) {
      produtoMaisVendido = { nome: vi.item.nome, qtd };
    }

    return {
      id: vi.id,
      quantidade: qtd,
      valorLiquido: vLiquido,
      precoMedio: Number(vi.precoMedio),
      item: {
        nome: vi.item.nome,
        codigoInterno: vi.item.codigoInterno,
      }
    };
  });

  return (
    <>
      <main className="flex-1 space-y-6 px-4 py-5 md:px-8 md:py-6 overflow-y-auto">
        <div className="flex items-center gap-4 mb-2">
          <Button variant="outline" size="icon" asChild className="rounded-full shrink-0">
            <Link href="/vendas">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <PageHeader
            title={`Vendas: ${format(new Date(venda.data), "dd 'de' MMMM, yyyy", { locale: ptBR })}`}
            description={`Importado em ${format(new Date(venda.dataImportacao), "dd/MM/yyyy 'às' HH:mm")}`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {}
          <div className="bg-surface border rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Faturamento do Dia</p>
              <h3 className="text-2xl font-bold">{formatCurrency(valorTotal)}</h3>
            </div>
          </div>

          {}
          <div className="bg-surface border rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Volume (Unid/KG)</p>
              <h3 className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(totalItensVendidos)}
              </h3>
            </div>
          </div>

          {}
          <div className="bg-surface border rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Tag className="w-6 h-6" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm text-muted-foreground font-medium">Produto Mais Vendido</p>
              <h3 className="text-lg font-bold truncate" title={produtoMaisVendido.nome}>
                {produtoMaisVendido.nome}
              </h3>
              <p className="text-xs text-muted-foreground">{produtoMaisVendido.qtd} unidades</p>
            </div>
          </div>
        </div>

        <VendaDetalheItens itens={itensMapped} />

      </main>
    </>
  );
}

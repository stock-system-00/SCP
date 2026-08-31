import React from "react";
import { PageHeader } from "@/components/PageHeader";
import { ImportVendasForm } from "@/components/vendas/ImportVendasForm";
import { HistoricoVendasList } from "@/components/vendas/HistoricoVendasList";
import { TopVendasList } from "@/components/vendas/TopVendasList";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function VendasPage() {
  const session = await getSession();
  const ownerId = session?.ownerId || session?.id || "";

  // Busca as vendas diárias e o resumo (total de itens e valor total)
  const vendasDiarias = await prisma.vendaDiaria.findMany({
    where: { ownerId },
    include: {
      itens: {
        select: {
          valorLiquido: true,
        }
      },
      _count: {
        select: { itens: true }
      }
    },
    orderBy: {
      data: "desc"
    }
  });


  const resumoVendas = vendasDiarias.map((venda: any) => {
    const valorTotal = venda.itens.reduce((acc: any, item: any) => acc + Number(item.valorLiquido), 0);
    return {
      id: venda.id,
      data: venda.data,
      dataImportacao: venda.dataImportacao,
      totalItens: venda._count.itens,
      valorTotal
    };
  });

  const topVendasGeraisRaw = await prisma.vendaItem.groupBy({
    by: ['itemId'],
    where: {
      vendaDiaria: { ownerId }
    },
    _sum: {
      quantidade: true,
      valorLiquido: true,
    },
    orderBy: {
      _sum: {
        quantidade: 'desc'
      }
    },
    take: 50
  });

  const itemIds = topVendasGeraisRaw.map((t: any) => t.itemId);
  
  const itemsDetails = await prisma.item.findMany({
    where: { id: { in: itemIds } },
    select: {
      id: true,
      codigoInterno: true,
      nome: true,
      unidade: true
    }
  });

  const itemsMap = new Map(itemsDetails.map((i: any) => [i.id, i]));

  const topVendasGerais = topVendasGeraisRaw.map((t: any) => {
    const detail = itemsMap.get(t.itemId);
    return {
      itemId: t.itemId,
      codigoInterno: detail?.codigoInterno || "-",
      nome: detail?.nome || "Desconhecido",
      unidade: detail?.unidade || "UN",
      quantidade: Number(t._sum.quantidade || 0),
      receita: Number(t._sum.valorLiquido || 0)
    };
  });

  return (
    <>
      <PageHeader
        title="Vendas"
        description="Importe planilhas de vendas e visualize o histórico."
      />
      <main className="flex-1 space-y-6 px-4 py-5 md:px-8 md:py-6 overflow-y-auto">
        {}
        <div className="hidden md:block">
          <ImportVendasForm />
        </div>

        {}
        <div className="md:hidden bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-4 rounded-xl text-sm font-medium text-center">
          A importação de planilhas só está disponível pelo computador.
        </div>

        {}
        <div>
          <TopVendasList ranking={topVendasGerais} />
        </div>

        {}
        <div>
          <HistoricoVendasList vendas={resumoVendas} />
        </div>

      </main>
    </>
  );
}

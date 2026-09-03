import React from "react";
import { PageHeader } from "@/components/PageHeader";
import { ImportVendasForm } from "@/components/vendas/ImportVendasForm";
import { HistoricoVendasList } from "@/components/vendas/HistoricoVendasList";
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
          <HistoricoVendasList vendas={resumoVendas} />
        </div>

      </main>
    </>
  );
}

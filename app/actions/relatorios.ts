"use server";

import { prisma } from "@/lib/prisma";
import { requireServerPermission } from "@/lib/server-permissions";

export async function getRelatorioGeral(
  startDateStr: string,
  endDateStr: string
) {
  const auth = await requireServerPermission("relatorios:ver");
  if (!auth.success) return { success: false, data: null, message: auth.message };
  const session = auth.session;

  try {
    const minDate = new Date(`${startDateStr}T00:00:00Z`);
    const maxDate = new Date(`${endDateStr}T23:59:59Z`);


    const eventos = await prisma.evento.findMany({
      where: {
        ownerId: session.ownerId,
        ...(session.activeLojaId && { lojaId: session.activeLojaId }),
        dataHora: { gte: minDate, lte: maxDate },
        status: { notIn: ["rascunho", "rejeitado"] },
      },
      include: {
        item: {
          include: { categoria: true }
        },
        criadoPor: { select: { nome: true, email: true, role: true } },
      },
      orderBy: { dataHora: "desc" },
    });


    const vendas = await prisma.vendaDiaria.findMany({
      where: {
        ownerId: session.ownerId,
        ...(session.activeLojaId && { lojaId: session.activeLojaId }),
        data: { gte: minDate, lte: maxDate },
      },
      include: {
        itens: {
          include: {
            item: true,
          },
        },
      },
    });



    const itemMap: Record<
      string,
      { item: any; qtdPerda: number; custoPerda: number; qtdVenda: number; faturamento: number }
    > = {};


    for (const ev of eventos) {
      if (!ev.item) continue;
      const itemId = ev.item.id;
      if (!itemMap[itemId]) {
        itemMap[itemId] = { item: ev.item, qtdPerda: 0, custoPerda: 0, qtdVenda: 0, faturamento: 0 };
      }
      itemMap[itemId].qtdPerda += Number(ev.quantidade);
      itemMap[itemId].custoPerda += Number(ev.custoSnapshot || 0) * Number(ev.quantidade);
    }


    for (const venda of vendas) {
      for (const vi of venda.itens) {
        if (!vi.item) continue;
        const itemId = vi.item.id;
        if (!itemMap[itemId]) {
          itemMap[itemId] = { item: vi.item, qtdPerda: 0, custoPerda: 0, qtdVenda: 0, faturamento: 0 };
        }
        itemMap[itemId].qtdVenda += Number(vi.quantidade);
        itemMap[itemId].faturamento += Number(vi.valorLiquido);
      }
    }


    const combinedItens = Object.values(itemMap).map((stat) => {
      let taxaPerda = 0;
      if (stat.faturamento > 0) {
        taxaPerda = (stat.custoPerda / stat.faturamento) * 100;
      } else if (stat.custoPerda > 0) {
        taxaPerda = 100;
      }

      return {
        ...stat,
        taxaPerda,
      };
    });

    return {
      success: true,
      data: JSON.parse(JSON.stringify({
        eventos,
        combinedItens,
      })),
    };
  } catch (error) {
    console.error("Erro ao buscar relatório geral:", error);
    return { success: false, data: null };
  }
}

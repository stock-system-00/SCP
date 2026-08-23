"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { startOfMonth, subMonths, endOfMonth, format } from "date-fns";

export async function getDadosEvolucao(
  dataInicioStr: string,
  dataFimStr: string,
  produtoId?: string
) {
  const session = await getSession();
  if (!session) return { success: false, data: null };

  try {
    const [anoIni, mesIni] = dataInicioStr.split("-").map(Number);
    const minDate = startOfMonth(new Date(anoIni, mesIni - 1, 15));

    const [anoFim, mesFim] = dataFimStr.split("-").map(Number);
    const maxDate = endOfMonth(new Date(anoFim, mesFim - 1, 15));


    const whereEvento: any = {
      ownerId: session.ownerId,
      dataHora: { gte: minDate, lte: maxDate },
      status: { notIn: ["rascunho", "rejeitado"] },
    };

    const whereVenda: any = {
      ownerId: session.ownerId,
      data: { gte: minDate, lte: maxDate },
    };

    if (produtoId) {
      whereEvento.itemId = produtoId;
      whereVenda.itens = {
        some: {
          itemId: produtoId,
        },
      };
    }


    const eventos = await prisma.evento.findMany({
      where: whereEvento,
      include: {
        item: true,
      },
    });


    const vendas = await prisma.vendaDiaria.findMany({
      where: whereVenda,
      include: {
        itens: {
          include: {
            item: true,
          },
        },
      },
    });


    const monthsMap: Record<
      string,
      { label: string; mesIso: string; custoPerda: number; faturamento: number; taxaPerda: number; statusAumento: "aumentou" | "diminuiu" | "manteve" | "N/A" }
    > = {};

    let currentD = new Date(minDate);
    while (currentD <= maxDate) {
      const key = format(currentD, "yyyy-MM");
      const label = format(currentD, "MMM/yyyy").toUpperCase();
      monthsMap[key] = { label, mesIso: key, custoPerda: 0, faturamento: 0, taxaPerda: 0, statusAumento: "N/A" };
      currentD.setMonth(currentD.getMonth() + 1);
    }


    for (const ev of eventos) {
      if (produtoId && ev.itemId !== produtoId) continue;
      const key = format(ev.dataHora, "yyyy-MM");
      if (monthsMap[key]) {
        monthsMap[key].custoPerda += Number(ev.custoSnapshot || 0) * Number(ev.quantidade);
      }
    }


    for (const venda of vendas) {
      const key = format(venda.data, "yyyy-MM");
      if (monthsMap[key]) {
        for (const vi of venda.itens) {
          if (produtoId && vi.itemId !== produtoId) continue;
          monthsMap[key].faturamento += Number(vi.valorLiquido);
        }
      }
    }


    const historico = Object.values(monthsMap);
    let taxaAnterior = -1;

    for (const data of historico) {
      if (data.faturamento > 0) {
        data.taxaPerda = (data.custoPerda / data.faturamento) * 100;
      } else if (data.custoPerda > 0) {
        data.taxaPerda = 100;
      }

      if (taxaAnterior !== -1) {
        if (data.taxaPerda > taxaAnterior) {
          data.statusAumento = "aumentou";
        } else if (data.taxaPerda < taxaAnterior) {
          data.statusAumento = "diminuiu";
        } else {
          data.statusAumento = "manteve";
        }
      }
      taxaAnterior = data.taxaPerda;
    }


    const produtos = await prisma.item.findMany({
      where: { ownerId: session.ownerId },
      select: { id: true, nome: true, codigoInterno: true },
      orderBy: { nome: "asc" }
    });

    return {
      success: true,
      data: JSON.parse(JSON.stringify({
        historico,
        produtos
      })),
    };
  } catch (error) {
    console.error("Erro ao buscar evolução:", error);
    return { success: false, data: null };
  }
}

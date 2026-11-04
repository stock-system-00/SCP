"use server";

import { prisma } from "@/lib/prisma";
import { requireServerPermission } from "@/lib/server-permissions";

function isEventInDateRange(dataHora: Date | string, startStr: string, endStr: string): boolean {
  const d = new Date(dataHora);
  const utcDateStr = d.toISOString().slice(0, 10);
  if (utcDateStr >= startStr && utcDateStr <= endStr) return true;

  const brFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  const brDateStr = brFormatter.format(d);
  if (brDateStr >= startStr && brDateStr <= endStr) return true;

  return false;
}

export async function getRelatorioGeral(
  startDateStr: string,
  endDateStr: string,
  lojaId?: string
) {
  const auth = await requireServerPermission("relatorios:ver");
  if (!auth.success) return { success: false, data: null, message: auth.message };
  const session = auth.session;

  try {
    // 1. Resolver lojaId de forma estrita e segura para isolar os dados da filial
    let targetLojaId = lojaId || session.activeLojaId || null;

    if (session.role !== "dono") {
      const user = await prisma.user.findUnique({
        where: { id: session.id },
        include: { lojasPermitidas: { select: { id: true } } },
      });
      const permitidas = user?.lojasPermitidas.map((l) => l.id) || [];
      if (user?.lojaId) permitidas.push(user.lojaId);

      if (targetLojaId && !permitidas.includes(targetLojaId)) {
        return { success: false, message: "Acesso não permitido a esta filial.", data: null };
      }
      if (!targetLojaId && permitidas.length > 0) {
        targetLojaId = permitidas[0];
      }
    } else {
      if (!targetLojaId) {
        const firstLoja = await prisma.loja.findFirst({
          where: { ownerId: session.ownerId },
          orderBy: { nome: "asc" },
          select: { id: true },
        });
        targetLojaId = firstLoja?.id || null;
      }
    }

    if (!targetLojaId) {
      return { success: false, message: "Nenhuma filial selecionada.", data: null };
    }

    const lojaInfo = await prisma.loja.findUnique({
      where: { id: targetLojaId },
      select: { id: true, nome: true, cnpj: true },
    });

    // 2. Intervalo de consulta abrangente para compensar UTC e fuso de Brasília (UTC-3)
    const minDate = new Date(`${startDateStr}T00:00:00.000Z`);
    const nextDay = new Date(`${endDateStr}T00:00:00.000Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const nextDayStr = nextDay.toISOString().slice(0, 10);
    const maxDate = new Date(`${nextDayStr}T03:59:59.999Z`);

    const rawEventos = await prisma.evento.findMany({
      where: {
        ownerId: session.ownerId,
        lojaId: targetLojaId,
        dataHora: { gte: minDate, lte: maxDate },
        status: { notIn: ["rascunho", "rejeitado"] },
      },
      include: {
        item: {
          include: { categoria: true },
        },
        criadoPor: { select: { nome: true, email: true, role: true } },
        evidencias: true,
      },
      orderBy: { dataHora: "desc" },
    });

    // Filtrar para garantir que caem exatamente no dia (seja por data UTC ou local)
    const eventos = rawEventos.filter((ev) =>
      isEventInDateRange(ev.dataHora, startDateStr, endDateStr)
    );

    const rawVendas = await prisma.vendaDiaria.findMany({
      where: {
        ownerId: session.ownerId,
        lojaId: targetLojaId,
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

    const vendas = rawVendas.filter((v) =>
      isEventInDateRange(v.data, startDateStr, endDateStr)
    );

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

    const combinedItens = Object.values(itemMap)
      .filter((stat) => stat.qtdPerda > 0)
      .map((stat) => {
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
      data: JSON.parse(
        JSON.stringify({
          eventos,
          combinedItens,
          loja: lojaInfo,
        })
      ),
    };
  } catch (error) {
    console.error("Erro ao buscar relatório geral:", error);
    return { success: false, data: null };
  }
}

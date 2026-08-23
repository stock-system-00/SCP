
"use server";

import { prisma } from "@/lib/prisma";

import { requireServerPermission } from "@/lib/server-permissions";

export async function getDashboardStats() {
  try {
    const auth = await requireServerPermission("dashboard:ver");
    if (!auth.success) return { success: false, error: auth.message };
    const session = auth.session;

    const hoje = new Date();
    const inicioHoje = new Date(hoje.setHours(0, 0, 0, 0));

    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - 7);


    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);


    const dataMinima = inicioSemana < inicioMes ? inicioSemana : inicioMes;



    const eventos = await prisma.evento.findMany({
      where: {
        ownerId: session.ownerId,
        ...(session.activeLojaId && { lojaId: session.activeLojaId }),
        dataHora: {
          gte: dataMinima,
        },
        status: {
          notIn: ["rascunho", "rejeitado"],
        },
      },
      select: {
        dataHora: true,
        quantidade: true,
        custoSnapshot: true,
        precoVendaSnapshot: true,
        item: {
          select: {
            id: true,
            nome: true,
            codigoInterno: true,
            imagemUrl: true,
            categoria: {
              select: {
                nome: true,
              },
            },
          },
        },
      },
    });


    const perdasHoje = { qtd: 0, custo: 0 };
    const perdasSemana = { qtd: 0, custo: 0 };
    const perdasMes = { qtd: 0, custo: 0, venda: 0 };

    const perdasPorCatMap: Record<string, number> = {};
    const topItensMap: Record<
      string,
      { item: any; qtd: number; custo: number }
    > = {};
    const tendenciaMap: Record<string, { custo: number; venda: number }> = {};


    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const diaKey = d.toLocaleDateString("pt-BR", { weekday: "short" });
      tendenciaMap[diaKey] = { custo: 0, venda: 0 };
    }


    eventos.forEach((ev) => {
      const dataEv = new Date(ev.dataHora);
      const quantidade = Number(ev.quantidade) || 0;
      const custoSnapshot = Number(ev.custoSnapshot) || 0;
      const precoVendaSnapshot = Number(ev.precoVendaSnapshot) || 0;

      const custoTotal = custoSnapshot * quantidade;
      const vendaTotal = precoVendaSnapshot * quantidade;

      if (dataEv >= inicioHoje) {
        perdasHoje.qtd += 1;
        perdasHoje.custo += custoTotal;
      }
      if (dataEv >= inicioSemana) {
        perdasSemana.qtd += 1;
        perdasSemana.custo += custoTotal;

        const diffDays = Math.floor(
          (new Date().getTime() - dataEv.getTime()) / (1000 * 3600 * 24),
        );
        if (diffDays <= 7) {
          const diaKey = dataEv.toLocaleDateString("pt-BR", {
            weekday: "short",
          });
          if (tendenciaMap[diaKey]) {
            tendenciaMap[diaKey].custo += custoTotal;
            tendenciaMap[diaKey].venda += vendaTotal;
          }
        }
      }
      if (dataEv >= inicioMes) {
        perdasMes.qtd += 1;
        perdasMes.custo += custoTotal;
        perdasMes.venda += vendaTotal;

        const cat = ev.item?.categoria?.nome || "Sem Categoria";
        perdasPorCatMap[cat] = (perdasPorCatMap[cat] || 0) + custoTotal;

        if (ev.item) {
          if (!topItensMap[ev.item.id]) {
            topItensMap[ev.item.id] = { item: ev.item, qtd: 0, custo: 0 };
          }
          topItensMap[ev.item.id].qtd += quantidade;
          topItensMap[ev.item.id].custo += custoTotal;
        }
      }
    });


    const perdasPorCategoria = Object.entries(perdasPorCatMap)
      .map(([cat, val]) => ({ categoria: cat, custo: val }))
      .sort((a, b) => b.custo - a.custo)
      .slice(0, 5);

    const topItensList = Object.values(topItensMap)
      .sort((a, b) => b.custo - a.custo)
      .slice(0, 5);

    const maxCusto = Math.max(...topItensList.map((item) => item.custo), 1);
    const topItens = topItensList.map((item) => ({
      ...item,
      percentual: (item.custo / maxCusto) * 100,
    }));

    const tendenciaSemanal = Object.entries(tendenciaMap).map(
      ([dia, vals]) => ({
        dia,
        ...vals,
      }),
    );


    return {
      success: true,
      data: {
        perdasHoje,
        perdasSemana,
        perdasMes,
        perdasPorCategoria,
        topItens,
        tendenciaSemanal,
      },
    };
  } catch (error) {
    console.error("Erro ao gerar as estatísticas do dashboard:", error);
    return { success: false, error: "Falha ao calcular dados do dashboard." };
  }
}

export async function getRealDashboardMetrics(diasIsoA: string[], diasIsoB: string[]) {
  try {
    const auth = await requireServerPermission("dashboard:ver");
    if (!auth.success) return { success: false, error: auth.message };
    const session = auth.session;

    const allDias = [...new Set([...diasIsoA, ...diasIsoB])].sort();
    if (allDias.length === 0) {
      return { success: true, data: { linhasA: [], linhasB: [], xmlsImportadosA: 0, xmlsImportadosB: 0, serie: [] } };
    }

    const minDateStr = allDias[0];
    const maxDateStr = allDias[allDias.length - 1];
    const minDate = new Date(`${minDateStr}T00:00:00Z`);
    const maxDate = new Date(`${maxDateStr}T23:59:59Z`);


    const itens = await prisma.item.findMany({
      where: { ownerId: session.ownerId },
      select: { id: true, codigoInterno: true, nome: true, custo: true, precoVenda: true, categoria: { select: { nome: true } } }
    });


    const nfes = await prisma.nFeCompra.findMany({
      where: { ownerId: session.ownerId, ...(session.activeLojaId && { lojaId: session.activeLojaId }), dataEmissao: { gte: minDate, lte: maxDate } },
      include: { itens: true }
    });


    const vendas = await prisma.vendaDiaria.findMany({
      where: { ownerId: session.ownerId, ...(session.activeLojaId && { lojaId: session.activeLojaId }), data: { gte: minDate, lte: maxDate } },
      include: { itens: true }
    });


    const eventos = await prisma.evento.findMany({
      where: { ownerId: session.ownerId, ...(session.activeLojaId && { lojaId: session.activeLojaId }), dataHora: { gte: minDate, lte: maxDate }, status: { notIn: ["rascunho", "rejeitado"] } }
    });


    const dailyData: Record<string, Record<string, { chegou: number, vendido: number, perdido: number, faturamentoReal: number }>> = {};
    const globalXmlCount: Record<string, number> = {};

    for (const d of allDias) {
      dailyData[d] = {};
      globalXmlCount[d] = 0;
    }


    for (const nfe of nfes) {
      if (!nfe.dataEmissao) continue;
      const dateStr = nfe.dataEmissao.toISOString().split("T")[0];
      if (!dailyData[dateStr]) continue;
      globalXmlCount[dateStr] += 1;
      
      for (const item of nfe.itens) {
        if (!item.itemId) continue;
        if (!dailyData[dateStr][item.itemId]) dailyData[dateStr][item.itemId] = { chegou: 0, vendido: 0, perdido: 0, faturamentoReal: 0 };
        dailyData[dateStr][item.itemId].chegou += Number(item.quantidade || 0);
      }
    }


    for (const venda of vendas) {
      const dateStr = venda.data.toISOString().split("T")[0];
      if (!dailyData[dateStr]) continue;
      
      for (const item of venda.itens) {
        if (!dailyData[dateStr][item.itemId]) dailyData[dateStr][item.itemId] = { chegou: 0, vendido: 0, perdido: 0, faturamentoReal: 0 };
        dailyData[dateStr][item.itemId].vendido += Number(item.quantidade || 0);
        dailyData[dateStr][item.itemId].faturamentoReal += Number(item.valorLiquido || 0);
      }
    }


    for (const evento of eventos) {
      if (!evento.itemId) continue;
      const dateStr = evento.dataHora.toISOString().split("T")[0];
      if (!dailyData[dateStr]) continue;
      
      if (!dailyData[dateStr][evento.itemId]) dailyData[dateStr][evento.itemId] = { chegou: 0, vendido: 0, perdido: 0, faturamentoReal: 0 };
      dailyData[dateStr][evento.itemId].perdido += Number(evento.quantidade || 0);
    }


    const catalogMap: Record<string, any> = {};
    for (const item of itens) {
      catalogMap[item.id] = {
        codigo: item.codigoInterno,
        descricao: item.nome,
        categoria: item.categoria?.nome || "Sem Categoria",
        custo: Number(item.custo || 0),
        precoVenda: Number(item.precoVenda || 0),
        limitePerda: 0
      };
    }

    const buildLinhasParaDias = (dias: string[]) => {
      const result: any[] = [];
      const itemAgg: Record<string, { chegou: number, vendido: number, perdido: number, faturamentoReal: number }> = {};
      let xmlsImportados = 0;

      for (const d of dias) {
        if (!dailyData[d]) continue;
        xmlsImportados += globalXmlCount[d] || 0;
        
        for (const [itemId, stats] of Object.entries(dailyData[d])) {
          if (!itemAgg[itemId]) itemAgg[itemId] = { chegou: 0, vendido: 0, perdido: 0, faturamentoReal: 0 };
          itemAgg[itemId].chegou += stats.chegou;
          itemAgg[itemId].vendido += stats.vendido;
          itemAgg[itemId].perdido += stats.perdido;
          itemAgg[itemId].faturamentoReal += (stats.faturamentoReal || 0);
        }
      }

      for (const [itemId, stats] of Object.entries(itemAgg)) {
        if (!catalogMap[itemId]) continue;
        result.push({
          ...catalogMap[itemId],
          chegou: stats.chegou,
          vendido: stats.vendido,
          perdido: stats.perdido,
          faturamentoReal: stats.faturamentoReal
        });
      }

      return { linhas: result, xmlsImportados };
    };

    const resA = buildLinhasParaDias(diasIsoA);
    const resB = buildLinhasParaDias(diasIsoB);


    const serie = diasIsoA.map((d, i) => {
      const dB = diasIsoB[i];
      let fatA = 0;
      let lucroA = 0;
      let chegouA = 0;
      let perdidoA = 0;
      let fatB = 0;

      if (dailyData[d]) {
        for (const [itemId, stats] of Object.entries(dailyData[d])) {
          const p = catalogMap[itemId];
          if (!p) continue;
          fatA += stats.faturamentoReal || (stats.vendido * p.precoVenda);
          lucroA += (stats.faturamentoReal || (stats.vendido * p.precoVenda)) - (stats.vendido * p.custo) - (stats.perdido * p.custo);
          chegouA += stats.chegou;
          perdidoA += stats.perdido;
        }
      }

      if (dB && dailyData[dB]) {
        for (const [itemId, stats] of Object.entries(dailyData[dB])) {
          const p = catalogMap[itemId];
          if (!p) continue;
          fatB += stats.faturamentoReal || (stats.vendido * p.precoVenda);
        }
      }

      return {
        dia: d.slice(8) + "/" + d.slice(5, 7),
        Faturamento: Math.round(fatA),
        Lucro: Math.round(lucroA),
        Perda: chegouA > 0 ? Number(((perdidoA / chegouA) * 100).toFixed(1)) : 0,
        comparado: Math.round(fatB)
      };
    });

    return {
      success: true,
      data: {
        linhasA: resA.linhas,
        linhasB: resB.linhas,
        xmlsImportadosA: resA.xmlsImportados,
        xmlsImportadosB: resB.xmlsImportados,
        serie
      }
    };
  } catch (error: any) {
    console.error("Erro ao gerar as estatísticas reais do dashboard:", error);
    return { success: false, error: "Falha ao calcular dados reais do dashboard." };
  }
}


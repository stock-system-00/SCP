"use server";

import { GoogleGenAI, Type, Tool } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { requireServerPermission } from "@/lib/server-permissions";

const GREETINGS = ["oi", "olá", "ola", "tudo bem", "bom dia", "boa tarde", "boa noite", "fala ai", "oii", "hello", "hi"];

function formatBRL(value: number): string {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function resolveDateRange(params: {
  mes?: number;
  ano?: number;
  dataInicio?: string;
  dataFim?: string;
}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let start: Date;
  let end: Date;

  if (params.dataInicio && params.dataFim) {
    start = new Date(`${params.dataInicio}T00:00:00.000Z`);
    end = new Date(`${params.dataFim}T23:59:59.999Z`);
  } else if (params.mes) {
    const y = params.ano || currentYear;
    const m = params.mes;
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    end = new Date(Date.UTC(y, m - 1, lastDay, 23, 59, 59, 999));
  } else {
    // Padrão: mês atual
    const y = params.ano || currentYear;
    const m = currentMonth;
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    end = new Date(Date.UTC(y, m - 1, lastDay, 23, 59, 59, 999));
  }

  // Janela com margem de 4 horas para fuso horário de Brasília (UTC-3)
  const queryStart = new Date(start.getTime() - 4 * 60 * 60 * 1000);
  const queryEnd = new Date(end.getTime() + 4 * 60 * 60 * 1000);

  return { start, end, queryStart, queryEnd };
}

export async function askAssistant(
  userMessage: string,
  history?: { role: string; content: string }[]
) {
  const MAX_RETRIES = 2;
  const DELAY_MS = 2500;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const auth = await requireServerPermission("iris:ver");
      if (!auth.success) return { success: false, error: auth.message };
      const session = auth.session;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return { success: false, error: "Chave da API do Gemini não configurada." };
      }

      // 1. Resolução estrita da filial ativa para isolamento de dados
      let targetLojaId = session.activeLojaId || null;

      if (session.role !== "dono") {
        const user = await prisma.user.findUnique({
          where: { id: session.id },
          include: { lojasPermitidas: { select: { id: true, nome: true } } },
        });
        const permitidas = user?.lojasPermitidas.map((l) => l.id) || [];
        if (user?.lojaId) permitidas.push(user.lojaId);

        if (targetLojaId && !permitidas.includes(targetLojaId)) {
          return { success: false, error: "Acesso não permitido a esta filial." };
        }
        if (!targetLojaId && permitidas.length > 0) {
          targetLojaId = permitidas[0];
        }
      } else {
        if (!targetLojaId) {
          const firstLoja = await prisma.loja.findFirst({
            where: { ownerId: session.ownerId },
            orderBy: { nome: "asc" },
            select: { id: true, nome: true },
          });
          targetLojaId = firstLoja?.id || null;
        }
      }

      const lojaInfo = targetLojaId
        ? await prisma.loja.findUnique({
            where: { id: targetLojaId },
            select: { id: true, nome: true, cnpj: true },
          })
        : null;

      const msgLower = userMessage.trim().toLowerCase();

      // Saudação rápida simples se for apenas 'oi'/'olá' sem perguntas específicas
      const hasBusinessKeywords = ["venda", "perda", "quanto", "total", "custo", "mês", "mes", "item", "produto", "média", "media", "faturamento"].some(k => msgLower.includes(k));
      if (msgLower.length < 20 && GREETINGS.some(g => msgLower.includes(g)) && !hasBusinessKeywords) {
        const ai = new GoogleGenAI({ apiKey });
        const storeName = lojaInfo?.nome ? ` da filial ${lojaInfo.nome}` : "";
        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: userMessage,
          config: {
            systemInstruction: `Você é a Iris, a assistente inteligente de gestão e controle de perdas${storeName}. O usuário está apenas te cumprimentando. Responda de forma extremamente amigável, em 1 ou 2 frases curtas, perguntando como pode ajudar na gestão e nas análises de vendas e perdas hoje.`,
          },
        });
        return { success: true, text: response.text };
      }

      // 2. Ferramentas (Tools) completas para a Iris
      const tools: Tool[] = [
        {
          functionDeclarations: [
            {
              name: "consultarResumoVendas",
              description:
                "Consulta o faturamento total de vendas, quantidade de itens vendidos, quantidade de dias com vendas alimentadas, média de venda por dia alimentado e detalhamento dos dias. Use SEMPRE que o usuário perguntar sobre vendas, faturamento, média de vendas diária ou desempenho de vendas em um mês ou período.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  mes: {
                    type: Type.INTEGER,
                    description: "Número do mês de 1 a 12 (ex: 10 para outubro).",
                  },
                  ano: {
                    type: Type.INTEGER,
                    description: "Ano com 4 dígitos (ex: 2026). Padrão é o ano corrente.",
                  },
                  dataInicio: {
                    type: Type.STRING,
                    description: "Data inicial no formato YYYY-MM-DD (opcional).",
                  },
                  dataFim: {
                    type: Type.STRING,
                    description: "Data final no formato YYYY-MM-DD (opcional).",
                  },
                  detalharDias: {
                    type: Type.BOOLEAN,
                    description: "Se true, inclui a lista com as vendas de cada dia do período.",
                  },
                },
              },
            },
            {
              name: "consultarResumoPerdas",
              description:
                "Consulta o resumo consolidado de perdas e descartes (custo total perdido, valor de venda das perdas, quantidade total de itens, principais motivos e top itens com maior prejuízo). Use para perguntas sobre perdas, desperdícios ou descartes em um período.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  mes: {
                    type: Type.INTEGER,
                    description: "Número do mês de 1 a 12 (ex: 10 para outubro).",
                  },
                  ano: {
                    type: Type.INTEGER,
                    description: "Ano com 4 dígitos (ex: 2026).",
                  },
                  dataInicio: {
                    type: Type.STRING,
                    description: "Data inicial no formato YYYY-MM-DD (opcional).",
                  },
                  dataFim: {
                    type: Type.STRING,
                    description: "Data final no formato YYYY-MM-DD (opcional).",
                  },
                  motivo: {
                    type: Type.STRING,
                    description: "Filtro opcional por motivo específico (ex: 'Vencimento', 'Avaria', 'Qualidade').",
                  },
                },
              },
            },
            {
              name: "compararVendasEPerdas",
              description:
                "Compara as vendas brutas com as perdas do período para calcular o percentual de perda sobre o faturamento (% de perda) e o diagnóstico operacional.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  mes: { type: Type.INTEGER, description: "Número do mês de 1 a 12." },
                  ano: { type: Type.INTEGER, description: "Ano com 4 dígitos (ex: 2026)." },
                  dataInicio: { type: Type.STRING, description: "Data de início YYYY-MM-DD." },
                  dataFim: { type: Type.STRING, description: "Data de fim YYYY-MM-DD." },
                },
              },
            },
            {
              name: "buscarInformacoesDeItem",
              description:
                "Busca informações detalhadas de um produto no catálogo: preços, custos, margem, perdas recentes e vendas recentes.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  termo: {
                    type: Type.STRING,
                    description: "Nome ou código interno do produto.",
                  },
                },
                required: ["termo"],
              },
            },
            {
              name: "buscarDiasDeMaiorVenda",
              description:
                "Busca os dias em que a loja mais faturou (dias de pico de venda).",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  mes: { type: Type.INTEGER, description: "Número do mês (1 a 12)." },
                  ano: { type: Type.INTEGER, description: "Ano (ex: 2026)." },
                  limite: { type: Type.INTEGER, description: "Quantidade de dias (ex: 5)." },
                },
              },
            },
            {
              name: "buscarTopPerdas",
              description:
                "Busca os registros individuais de perdas mais recentes ou mais caros da loja.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  limite: { type: Type.INTEGER, description: "Quantidade de registros a retornar (máximo 20)." },
                  motivo: { type: Type.STRING, description: "Filtrar por motivo específico." },
                },
              },
            },
          ],
        },
      ];

      // 3. Montar contexto temporal preciso e diretrizes da Iris
      const hoje = new Date();
      const dataAtualFormatada = hoje.toLocaleDateString("pt-BR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const mesAtualNumero = hoje.getMonth() + 1;
      const anoAtualNumero = hoje.getFullYear();
      const mesPassadoNumero = mesAtualNumero === 1 ? 12 : mesAtualNumero - 1;
      const anoMesPassado = mesAtualNumero === 1 ? anoAtualNumero - 1 : anoAtualNumero;

      const systemPrompt = `
Você é a Iris, a assistente inteligente especialista em gestão comercial, faturamento, controle de perdas e análises financeiras da loja.

Informações da Filial e do Sistema:
- Filial em Consulta: ${lojaInfo ? `${lojaInfo.nome} (CNPJ: ${lojaInfo.cnpj || "Não cadastrado"})` : "Loja Ativa"}
- Data e Hora Atual do Sistema: ${dataAtualFormatada} (${hoje.toLocaleDateString("pt-BR")})
- Ano Atual: ${anoAtualNumero}
- Mês Atual: Mês ${mesAtualNumero}
- Mês Passado: Mês ${mesPassadoNumero} de ${anoMesPassado}

Diretrizes Obrigatórias de Atendimento:
1. NUNCA diga que não tem dados ou que não tem ferramentas para consultar vendas ou perdas completas. VOCÊ TEM ferramentas completas.
2. Quando o usuário perguntar sobre VENDAS, FATURAMENTO ou MÉDIA DIÁRIA de qualquer período (como mês passado, mês 10, etc.), CHAME a ferramenta "consultarResumoVendas".
3. Ao apresentar a média de vendas por dia:
   - Apresente a MÉDIA POR DIA ALIMENTADO (dias que efetivamente tiveram vendas registradas no sistema), explicando até qual dia o mês foi alimentado. Exemplo: "No mês 10, tivemos registros até o dia 27 (27 dias alimentados), totalizando R$ 47.268,24, com média de R$ 1.750,68 por dia alimentado".
   - Mostre também os dias de maior e menor faturamento caso estejam disponíveis.
4. Quando o usuário perguntar sobre PERDAS, DESPERDÍCIOS ou MOTIVOS, CHAME "consultarResumoPerdas".
5. Quando o usuário pedir análise de porcentagem de perda sobre vendas, CHAME "compararVendasEPerdas".
6. Formatação:
   - Responda em Markdown claro, profissional e bem organizado.
   - Destaque valores em moeda (**R$**) e números importantes com negrito.
   - Use tópicos e espaçamento adequado para facilitar a leitura.
`;

      const ai = new GoogleGenAI({ apiKey });

      // Formatar histórico se fornecido
      const geminiHistory = (history || [])
        .slice(-8)
        .filter((h) => h.content && h.content.trim())
        .map((h) => ({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }],
        }));

      const chat = ai.chats.create({
        model: "gemini-3.6-flash",
        history: geminiHistory,
        config: {
          systemInstruction: systemPrompt,
          tools: tools,
          temperature: 0.1,
        },
      });

      let response = await chat.sendMessage({ message: userMessage });

      // Loop de execução de ferramentas (Tools)
      let toolLoopTurns = 0;
      while (response.functionCalls && response.functionCalls.length > 0 && toolLoopTurns < 3) {
        toolLoopTurns++;
        const calls = response.functionCalls;
        const functionResponses = [];

        for (const call of calls) {
          const args = (call.args || {}) as any;

          if (call.name === "consultarResumoVendas") {
            const { start, end, queryStart, queryEnd } = resolveDateRange({
              mes: args.mes ? Number(args.mes) : undefined,
              ano: args.ano ? Number(args.ano) : undefined,
              dataInicio: args.dataInicio,
              dataFim: args.dataFim,
            });

            const vendas = await prisma.vendaDiaria.findMany({
              where: {
                ownerId: session.ownerId,
                ...(targetLojaId && { lojaId: targetLojaId }),
                data: { gte: queryStart, lte: queryEnd },
              },
              include: {
                itens: {
                  select: {
                    quantidade: true,
                    valorLiquido: true,
                    item: { select: { nome: true } },
                  },
                },
              },
              orderBy: { data: "asc" },
            });

            // Agrupar vendas por dia
            const diasMap = new Map<string, { total: number; qtdItens: number }>();
            let totalFaturamento = 0;
            let totalItens = 0;

            for (const venda of vendas) {
              const diaStr = venda.data.toISOString().split("T")[0];
              // Verificar se o dia cai dentro do período alvo
              const diaDate = new Date(`${diaStr}T12:00:00.000Z`);
              if (diaDate < start || diaDate > end) continue;

              let diaTotal = 0;
              let diaQtd = 0;
              for (const item of venda.itens) {
                diaTotal += Number(item.valorLiquido || 0);
                diaQtd += Number(item.quantidade || 0);
              }

              const existing = diasMap.get(diaStr) || { total: 0, qtdItens: 0 };
              diasMap.set(diaStr, {
                total: existing.total + diaTotal,
                qtdItens: existing.qtdItens + diaQtd,
              });

              totalFaturamento += diaTotal;
              totalItens += diaQtd;
            }

            const diasList = Array.from(diasMap.entries())
              .map(([data, d]) => ({
                data,
                dataFormatada: data.split("-").reverse().join("/"),
                total: d.total,
                totalFormatado: formatBRL(d.total),
                qtdItens: d.qtdItens,
              }))
              .sort((a, b) => a.data.localeCompare(b.data));

            const diasOrdenadosPorValor = [...diasList].sort((a, b) => b.total - a.total);
            const diaMaior = diasOrdenadosPorValor[0] || null;
            const diaMenor = diasOrdenadosPorValor[diasOrdenadosPorValor.length - 1] || null;

            const diasComVendas = diasList.length;
            const mediaDiariaAlimentada = diasComVendas > 0 ? totalFaturamento / diasComVendas : 0;

            const result = {
              filial: lojaInfo?.nome || "Loja Ativa",
              periodoInicio: start.toISOString().split("T")[0],
              periodoFim: end.toISOString().split("T")[0],
              diasComVendasAlimentadas: diasComVendas,
              primeiroDiaAlimentado: diasList[0]?.dataFormatada || null,
              ultimoDiaAlimentado: diasList[diasList.length - 1]?.dataFormatada || null,
              totalFaturamento: formatBRL(totalFaturamento),
              totalFaturamentoNumerico: totalFaturamento,
              totalItensVendidos: Number(totalItens.toFixed(2)),
              mediaDiariaPorDiaAlimentado: formatBRL(mediaDiariaAlimentada),
              mediaDiariaNumerica: mediaDiariaAlimentada,
              diaMaiorVenda: diaMaior
                ? { data: diaMaior.dataFormatada, total: diaMaior.totalFormatado }
                : null,
              diaMenorVenda: diaMenor
                ? { data: diaMenor.dataFormatada, total: diaMenor.totalFormatado }
                : null,
              dias: args.detalharDias || diasList.length <= 31 ? diasList : diasList.slice(0, 10),
            };

            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: { resultado: result },
              },
            });
          } else if (call.name === "consultarResumoPerdas") {
            const { start, end, queryStart, queryEnd } = resolveDateRange({
              mes: args.mes ? Number(args.mes) : undefined,
              ano: args.ano ? Number(args.ano) : undefined,
              dataInicio: args.dataInicio,
              dataFim: args.dataFim,
            });

            const motivoFiltro = args.motivo ? String(args.motivo).trim() : null;

            const perdas = await prisma.evento.findMany({
              where: {
                ownerId: session.ownerId,
                ...(targetLojaId && { lojaId: targetLojaId }),
                dataHora: { gte: queryStart, lte: queryEnd },
                status: { notIn: ["rascunho", "rejeitado"] },
                ...(motivoFiltro && { motivo: { contains: motivoFiltro, mode: "insensitive" } }),
              },
              include: {
                item: { select: { nome: true, codigoInterno: true } },
              },
              orderBy: { dataHora: "desc" },
            });

            let custoTotal = 0;
            let valorVendaTotal = 0;
            let quantidadeTotal = 0;
            const motivosMap = new Map<string, { custo: number; qtd: number }>();
            const itensMap = new Map<string, { nome: string; custo: number; qtd: number }>();

            for (const p of perdas) {
              const d = new Date(p.dataHora);
              if (d < start || d > end) continue;

              const c = Number(p.custoSnapshot || 0) * Number(p.quantidade || 0);
              const v = Number(p.precoVendaSnapshot || 0) * Number(p.quantidade || 0);
              const q = Number(p.quantidade || 0);

              custoTotal += c;
              valorVendaTotal += v;
              quantidadeTotal += q;

              const mot = p.motivo || "Outros";
              const motExist = motivosMap.get(mot) || { custo: 0, qtd: 0 };
              motivosMap.set(mot, { custo: motExist.custo + c, qtd: motExist.qtd + q });

              const itemName = p.item?.nome || "Item Não Identificado";
              const itExist = itensMap.get(itemName) || { nome: itemName, custo: 0, qtd: 0 };
              itensMap.set(itemName, {
                nome: itemName,
                custo: itExist.custo + c,
                qtd: itExist.qtd + q,
              });
            }

            const perdasPorMotivo = Array.from(motivosMap.entries())
              .map(([motivo, val]) => ({
                motivo,
                custoTotal: formatBRL(val.custo),
                quantidade: val.qtd,
                percentual: custoTotal > 0 ? `${((val.custo / custoTotal) * 100).toFixed(1)}%` : "0%",
              }))
              .sort((a, b) => parseFloat(b.percentual) - parseFloat(a.percentual));

            const topItensPerda = Array.from(itensMap.values())
              .sort((a, b) => b.custo - a.custo)
              .slice(0, 5)
              .map((it) => ({
                produto: it.nome,
                custoTotal: formatBRL(it.custo),
                quantidadeDescartada: it.qtd,
              }));

            const result = {
              filial: lojaInfo?.nome || "Loja Ativa",
              totalEventosRegistrados: perdas.length,
              custoTotalPerda: formatBRL(custoTotal),
              custoTotalNumerico: custoTotal,
              valorVendaTotalPerda: formatBRL(valorVendaTotal),
              quantidadeTotalItens: Number(quantidadeTotal.toFixed(2)),
              perdasPorMotivo,
              topItensComMaiorPrejuizo: topItensPerda,
            };

            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: { resultado: result },
              },
            });
          } else if (call.name === "compararVendasEPerdas") {
            const { start, end, queryStart, queryEnd } = resolveDateRange({
              mes: args.mes ? Number(args.mes) : undefined,
              ano: args.ano ? Number(args.ano) : undefined,
              dataInicio: args.dataInicio,
              dataFim: args.dataFim,
            });

            // Vendas
            const vendas = await prisma.vendaDiaria.findMany({
              where: {
                ownerId: session.ownerId,
                ...(targetLojaId && { lojaId: targetLojaId }),
                data: { gte: queryStart, lte: queryEnd },
              },
              include: { itens: { select: { valorLiquido: true } } },
            });

            let faturamento = 0;
            for (const v of vendas) {
              const d = new Date(v.data);
              if (d < start || d > end) continue;
              for (const i of v.itens) faturamento += Number(i.valorLiquido || 0);
            }

            // Perdas
            const perdas = await prisma.evento.findMany({
              where: {
                ownerId: session.ownerId,
                ...(targetLojaId && { lojaId: targetLojaId }),
                dataHora: { gte: queryStart, lte: queryEnd },
                status: { notIn: ["rascunho", "rejeitado"] },
              },
              select: { custoSnapshot: true, quantidade: true, dataHora: true },
            });

            let custoPerda = 0;
            for (const p of perdas) {
              const d = new Date(p.dataHora);
              if (d < start || d > end) continue;
              custoPerda += Number(p.custoSnapshot || 0) * Number(p.quantidade || 0);
            }

            const percentualPerda = faturamento > 0 ? (custoPerda / faturamento) * 100 : 0;
            let diagnostico = "";
            if (percentualPerda <= 1.5) {
              diagnostico = "Excelente controle de perdas (abaixo de 1.5%).";
            } else if (percentualPerda <= 3.0) {
              diagnostico = "Controle de perdas dentro da média aceitável para o setor (entre 1.5% e 3.0%).";
            } else {
              diagnostico = "Atenção: índice de perdas elevado (acima de 3.0%). Recomenda-se investigar os principais motivos e produtos.";
            }

            const result = {
              filial: lojaInfo?.nome || "Loja Ativa",
              faturamentoTotal: formatBRL(faturamento),
              custoTotalPerda: formatBRL(custoPerda),
              percentualPerdaSobreVenda: `${percentualPerda.toFixed(2)}%`,
              diagnostico,
            };

            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: { resultado: result },
              },
            });
          } else if (call.name === "buscarInformacoesDeItem") {
            const termo = String(args.termo || "").trim();

            const itens = await prisma.item.findMany({
              where: {
                ownerId: session.ownerId,
                OR: [
                  { nome: { contains: termo, mode: "insensitive" } },
                  { codigoInterno: { contains: termo, mode: "insensitive" } },
                  { codigoBarras: { contains: termo, mode: "insensitive" } },
                ],
              },
              take: 5,
              include: {
                categoria: { select: { nome: true } },
              },
            });

            const itensFormatados = await Promise.all(
              itens.map(async (item) => {
                const perdasRecentes = await prisma.evento.findMany({
                  where: {
                    ownerId: session.ownerId,
                    ...(targetLojaId && { lojaId: targetLojaId }),
                    itemId: item.id,
                    status: { notIn: ["rascunho", "rejeitado"] },
                  },
                  take: 3,
                  orderBy: { dataHora: "desc" },
                  select: { dataHora: true, quantidade: true, motivo: true, custoSnapshot: true },
                });

                return {
                  nome: item.nome,
                  codigo: item.codigoInterno,
                  categoria: item.categoria?.nome || "Sem categoria",
                  custo: formatBRL(Number(item.custo || 0)),
                  precoVenda: formatBRL(Number(item.precoVenda || 0)),
                  unidade: item.unidade,
                  status: item.status,
                  perdasRecentes: perdasRecentes.map((pr) => ({
                    data: pr.dataHora.toISOString().split("T")[0],
                    quantidade: Number(pr.quantidade),
                    motivo: pr.motivo,
                    custo: formatBRL(Number(pr.custoSnapshot || 0) * Number(pr.quantidade || 0)),
                  })),
                };
              })
            );

            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: {
                  resultado: itensFormatados.length > 0 ? itensFormatados : "Nenhum produto encontrado.",
                },
              },
            });
          } else if (call.name === "buscarDiasDeMaiorVenda") {
            const limit = Math.min(Number(args?.limite) || 5, 10);
            const { queryStart, queryEnd } = resolveDateRange({
              mes: args.mes ? Number(args.mes) : undefined,
              ano: args.ano ? Number(args.ano) : undefined,
            });

            const vendas = await prisma.vendaDiaria.findMany({
              where: {
                ownerId: session.ownerId,
                ...(targetLojaId && { lojaId: targetLojaId }),
                data: { gte: queryStart, lte: queryEnd },
              },
              include: { itens: { select: { valorLiquido: true } } },
            });

            const vendasPorDia = vendas.reduce((acc, venda) => {
              const dataStr = venda.data.toISOString().split("T")[0];
              const totalDia = venda.itens.reduce((sum, item) => sum + Number(item.valorLiquido || 0), 0);
              acc[dataStr] = (acc[dataStr] || 0) + totalDia;
              return acc;
            }, {} as Record<string, number>);

            const diasOrdenados = Object.entries(vendasPorDia)
              .map(([data, total]) => ({
                data: data.split("-").reverse().join("/"),
                totalVendido: formatBRL(total),
                totalNumerico: total,
              }))
              .sort((a, b) => b.totalNumerico - a.totalNumerico)
              .slice(0, limit);

            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: { resultado: diasOrdenados.length > 0 ? diasOrdenados : "Nenhuma venda registrada no período." },
              },
            });
          } else if (call.name === "buscarTopPerdas") {
            const limit = Math.min(Number(args?.limite) || 5, 20);
            const motivoFiltro = args?.motivo ? String(args.motivo).trim() : null;

            const perdas = await prisma.evento.findMany({
              where: {
                ownerId: session.ownerId,
                ...(targetLojaId && { lojaId: targetLojaId }),
                status: { notIn: ["rascunho", "rejeitado"] },
                ...(motivoFiltro && { motivo: { contains: motivoFiltro, mode: "insensitive" } }),
              },
              take: limit,
              orderBy: { dataHora: "desc" },
              include: { item: { select: { nome: true } } },
            });

            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: {
                  resultado: perdas.map((p) => ({
                    data: p.dataHora.toISOString().split("T")[0].split("-").reverse().join("/"),
                    produto: p.item?.nome || "Desconhecido",
                    motivo: p.motivo,
                    qtd: Number(p.quantidade),
                    custoTotal: formatBRL(Number(p.custoSnapshot || 0) * Number(p.quantidade || 0)),
                  })),
                },
              },
            });
          }
        }

        if (functionResponses.length > 0) {
          response = await chat.sendMessage({ message: functionResponses as any });
        }
      }

      return { success: true, text: response.text };
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      const isOverloaded =
        errorMessage.includes("503") ||
        errorMessage.includes("UNAVAILABLE") ||
        errorMessage.includes("high demand") ||
        errorMessage.includes("overloaded");

      if (isOverloaded && attempt < MAX_RETRIES) {
        console.warn(
          `[AI] Servidor sobrecarregado (503). Tentativa ${attempt + 1} de ${MAX_RETRIES}. Aguardando ${DELAY_MS}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        continue;
      }

      console.error("Error asking Gemini:", error);

      if (isOverloaded) {
        return {
          success: false,
          error:
            "A Iris está atendendo muitas requisições neste momento. Por favor, tente enviar sua pergunta novamente em alguns instantes.",
        };
      }

      return { success: false, error: `Erro na assistente: ${errorMessage}` };
    }
  }

  return { success: false, error: "Erro desconhecido ao processar resposta." };
}

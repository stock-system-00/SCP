"use server";

import { GoogleGenAI, Type, Tool } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { requireServerPermission } from "@/lib/server-permissions";


const GREETINGS = ["oi", "olá", "ola", "tudo bem", "bom dia", "boa tarde", "boa noite", "fala ai", "oii", "hello", "hi"];

export async function askAssistant(userMessage: string) {
  try {
    const auth = await requireServerPermission("iris:ver");
    if (!auth.success) return { success: false, error: auth.message };
    const session = auth.session;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return { success: false, error: "Chave da API do Gemini não configurada." };
    }

    const msgLower = userMessage.trim().toLowerCase();
    

    if (msgLower.length < 20 && GREETINGS.some(g => msgLower.includes(g))) {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: userMessage,
        config: {
          systemInstruction: "Você é a Iris, a assistente inteligente de gestão. O usuário está apenas te cumprimentando. Responda de forma extremamente amigável, em apenas 1 ou 2 frases curtas, perguntando como pode ajudar na gestão da loja hoje."
        }
      });
      return { success: true, text: response.text };
    }


    const dateLimit = new Date();
    dateLimit.setMonth(dateLimit.getMonth() - 1);


    const [totalItens, totalCategorias, perdasAggregate, vendasAggregate] = await Promise.all([
      prisma.item.count({ where: { ownerId: session.ownerId, status: "ativo" } }),
      prisma.categoria.count({ where: { ownerId: session.ownerId, status: "ativa" } }),
      prisma.evento.aggregate({
        where: { ownerId: session.ownerId, dataHora: { gte: dateLimit }, status: { notIn: ["rascunho", "rejeitado"] } },
        _count: { id: true }
      }),
      prisma.vendaDiaria.count({
        where: { ownerId: session.ownerId, data: { gte: dateLimit } }
      })
    ]);

    const contextData = {
      periodo: "Últimos 30 dias",
      resumo_rapido: `A loja possui ${totalItens} itens ativos e ${totalCategorias} categorias. Nos últimos 30 dias, ocorreram ${perdasAggregate._count.id} registros de perdas e importamos vendas em ${vendasAggregate} dias diferentes.`
    };


    const tools: Tool[] = [{
      functionDeclarations: [
        {
          name: "buscarTopPerdas",
          description: "Busca os últimos registros de perda ou descarte de produtos da loja. Use quando o usuário perguntar sobre as perdas recentes.",
          parameters: {
             type: Type.OBJECT,
             properties: {
               limite: { type: Type.INTEGER, description: "Quantidade de registros a retornar (ex: 5, máximo 20)" }
             }
          }
        },
        {
          name: "buscarInformacoesDeItem",
          description: "Busca informações específicas de um produto no catálogo (custo, preço, categoria).",
          parameters: {
             type: Type.OBJECT,
             properties: {
               nome: { type: Type.STRING, description: "Nome completo ou pedaço do nome do produto" }
             },
             required: ["nome"]
          }
        }
      ]
    }];

    const systemPrompt = `
Você é a Iris, a assistente inteligente de gestão e controle de perdas do estabelecimento. 

Regras de Comportamento:
1. Seja sempre amigável e direta.
2. Você tem acesso a FERRAMENTAS (Tools). Se o usuário fizer uma pergunta que exige dados precisos (ex: "Quais os produtos com mais perda?", "Qual o custo da Coca Cola?"), VOCÊ DEVE CHAMAR A FERRAMENTA APROPRIADA em vez de inventar dados.
3. Formate a resposta usando Markdown. Use quebras de linha duplas para separar parágrafos.
4. Responda baseado neste contexto inicial ou nos resultados das ferramentas que você chamar.

Contexto da Loja:
${JSON.stringify(contextData)}
`;

    const ai = new GoogleGenAI({ apiKey });
    const chat = ai.chats.create({
       model: 'gemini-3.6-flash',
       config: {
          systemInstruction: systemPrompt,
          tools: tools,
          temperature: 0.1
       }
    });

    let response = await chat.sendMessage({ message: userMessage });


    if (response.functionCalls && response.functionCalls.length > 0) {
      const calls = response.functionCalls;
      const functionResponses = [];

      for (const call of calls) {
         if (call.name === "buscarTopPerdas") {
           const args = call.args as any;
           const limit = Math.min(Number(args?.limite) || 5, 20);
           
           const perdas = await prisma.evento.findMany({
              where: { ownerId: session.ownerId, status: { notIn: ["rascunho", "rejeitado"] } },
              take: limit,
              orderBy: { dataHora: 'desc' },
              include: { item: { select: { nome: true } } }
           });
           
           functionResponses.push({
             functionResponse: {
               name: call.name,
               response: { 
                 resultado: perdas.map(p => ({ 
                   data: p.dataHora.toISOString().split("T")[0], 
                   produto: p.item?.nome || "Desconhecido", 
                   motivo: p.motivo, 
                   qtd: Number(p.quantidade) 
                 })) 
               }
             }
           });
         } 
         else if (call.name === "buscarInformacoesDeItem") {
           const args = call.args as any;
           const itemName = args.nome;

           const itens = await prisma.item.findMany({
             where: { ownerId: session.ownerId, nome: { contains: itemName, mode: "insensitive" } },
             take: 5,
             select: { nome: true, custo: true, custoMedio: true, precoVenda: true, status: true, unidade: true }
           });

           functionResponses.push({
             functionResponse: {
               name: call.name,
               response: { resultado: itens.length > 0 ? itens : "Nenhum produto encontrado com esse nome." }
             }
           });
         }
      }


      if (functionResponses.length > 0) {
        response = await chat.sendMessage({ message: functionResponses as any });
      }
    }

    return { success: true, text: response.text };
  } catch (error: any) {
    console.error("Error asking Gemini:", error);
    const errorMessage = error?.message || String(error);
    return { success: false, error: `Erro na API: ${errorMessage}` };
  }
}

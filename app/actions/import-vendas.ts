"use server";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function importVendasCSV(formData: FormData) {
  const user = await getSession();
  if (!user) {
    return { success: false, error: "Não autorizado." };
  }
  
  const ownerId = user.ownerId || user.id;

  const file = formData.get("file") as File;
  const mode = formData.get("mode") as string || "lote";
  const dataManual = formData.get("data") as string;

  if (!file) {
    return { success: false, error: "Arquivo é obrigatório." };
  }

  if (mode === "isolado" && !dataManual) {
    return { success: false, error: "A data é obrigatória para importação isolada." };
  }

  try {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    
    let startIndex = 1; // Pular cabeçalho
    
    if (lines.length < 2) {
      return { success: false, error: "O arquivo parece estar vazio ou não possui dados suficientes." };
    }

    const parseBrazilianDecimal = (val: string) => {
      if (!val) return 0;
      const cleanVal = val.replace(/\./g, "").replace(",", ".");
      const parsed = parseFloat(cleanVal);
      return isNaN(parsed) ? 0 : parsed;
    };

    let processedCount = 0;
    const vendaDiariaCache: Record<string, string> = {}; 

    // Se for isolado, já sabemos a data
    let dateObjIsolado: Date | null = null;
    let vendaDiariaIdIsolado: string | null = null;
    if (mode === "isolado") {
      const [year, month, day] = dataManual.split("-").map(Number);
      dateObjIsolado = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
      
      let vendaDiaria = await prisma.vendaDiaria.findFirst({
        where: { data: dateObjIsolado, ownerId }
      });
      if (!vendaDiaria) {
        vendaDiaria = await prisma.vendaDiaria.create({
          data: { data: dateObjIsolado, ownerId }
        });
      }
      vendaDiariaIdIsolado = vendaDiaria.id;
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const separator = line.includes(";") ? ";" : (line.includes("\t") ? "\t" : ",");
      const cols = line.split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
      
      if (cols.length < 5) continue; // Linha inválida

      let codItem = "";
      let qtdStr = "";
      let valLiquidoStr = "";
      let vendaDiariaId = "";

      if (mode === "lote") {
        const dtaEmissao = cols[0];  // A
        codItem = cols[1];           // B
        qtdStr = cols[5];            // F
        valLiquidoStr = cols[8];     // I

        if (!dtaEmissao || !codItem) continue;

        const dateParts = dtaEmissao.split('/');
        if (dateParts.length !== 3) continue;
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10);
        const year = parseInt(dateParts[2], 10);
        
        const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        vendaDiariaId = vendaDiariaCache[dateKey];
        if (!vendaDiariaId) {
          const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
          let vendaDiaria = await prisma.vendaDiaria.findFirst({
            where: { data: dateObj, ownerId }
          });
          if (!vendaDiaria) {
            vendaDiaria = await prisma.vendaDiaria.create({
              data: { data: dateObj, ownerId }
            });
          }
          vendaDiariaId = vendaDiaria.id;
          vendaDiariaCache[dateKey] = vendaDiariaId;
        }

      } else {
        codItem = cols[2];
        qtdStr = cols[4];
        valLiquidoStr = cols[7];

        if (!codItem) continue;
        vendaDiariaId = vendaDiariaIdIsolado!;
      }

      const item = await prisma.item.findUnique({
        where: { codigoInterno_ownerId: { codigoInterno: codItem, ownerId } }
      });
      
      if (!item) continue;
      
      const qtd = parseBrazilianDecimal(qtdStr);
      const valLiquido = parseBrazilianDecimal(valLiquidoStr);

      await prisma.vendaItem.create({
        data: {
          vendaDiariaId: vendaDiariaId,
          itemId: item.id,
          quantidade: qtd,
          valorLiquido: valLiquido,
          precoMedio: 0,
        }
      });
      
      processedCount++;
    }

    revalidatePath("/vendas");
    return { success: true, count: processedCount };
  } catch (error: any) {
    console.error("Erro ao importar vendas:", error);
    return { success: false, error: "Erro interno ao processar o arquivo CSV. " + (error.message || "") };
  }
}

export async function deleteVenda(id: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Não autorizado." };
  
  const ownerId = session.ownerId || session.id;

  try {
    await prisma.vendaDiaria.delete({
      where: { id, ownerId }
    });

    revalidatePath("/vendas");
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao excluir venda:", error);
    return { success: false, error: "Erro interno ao excluir a venda. " + (error.message || "") };
  }
}

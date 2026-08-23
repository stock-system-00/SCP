"use strict";
"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

interface NFeItemExtracted {
  cProd: string;
  xProd: string;
  uCom: string;
  qCom: number;
  vUnCom: number;
  vProd: number;
}

function extractTagValue(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>(.*?)<\/${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

export async function recalcularCustosItem(itemId: string, ownerId: string) {
  try {

    const nfeItens = await prisma.nFeCompraItem.findMany({
      where: {
        itemId: itemId,
        nfeCompra: { ownerId: ownerId }
      },
      include: {
        nfeCompra: true
      },
      orderBy: {
        nfeCompra: { dataEmissao: 'desc' }
      }
    });

    if (nfeItens.length === 0) {


      await prisma.item.update({
        where: { id: itemId },
        data: { custoMedio: 0 }
      });
      return;
    }


    const ultimoCusto = nfeItens[0].valorUnitario || 0;


    let somaValores = 0;
    let somaQuantidades = 0;

    for (const item of nfeItens) {
      const v = Number(item.valorTotal?.toString() || 0);
      const q = Number(item.quantidade?.toString() || 0);
      if (v > 0 && q > 0) {
        somaValores += v;
        somaQuantidades += q;
      }
    }

    const custoMedio = somaQuantidades > 0 ? (somaValores / somaQuantidades) : 0;


    await prisma.item.update({
      where: { id: itemId },
      data: {
        custo: ultimoCusto,
        custoMedio: custoMedio
      }
    });

  } catch (error) {
    console.error("Erro ao recalcular custos do item:", error);
  }
}

export async function importNFeXML(formData: FormData) {
  try {
    const user = await getSession();
    if (!user || !user.ownerId) {
      return { success: false, error: "Usuário não autenticado ou sem permissão." };
    }

    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "Nenhum arquivo enviado." };

    const xmlText = await file.text();


    if (!xmlText.includes("<nfeProc") && !xmlText.includes("<NFe")) {
      return { success: false, error: "Arquivo não parece ser um XML de NFe válido." };
    }


    const numero = extractTagValue(xmlText, "nNF");
    const emitente = extractTagValue(xmlText, "xNome");
    const dataEmissaoRaw = extractTagValue(xmlText, "dhEmi") || extractTagValue(xmlText, "dEmi");
    const valorTotalRaw = extractTagValue(xmlText, "vNF");
    
    const dataEmissao = dataEmissaoRaw ? new Date(dataEmissaoRaw) : null;
    const valorTotal = valorTotalRaw ? parseFloat(valorTotalRaw) : 0;


    if (numero) {
      const existeNfe = await prisma.nFeCompra.findFirst({
        where: {
          numero,
          emitente: emitente || undefined,
          ownerId: user.ownerId
        }
      });

      if (existeNfe) {
        return { success: false, error: "DUPLICATED", numero };
      }
    }


    const detGroups = xmlText.split(/<det /i).slice(1);
    const itensNFe: NFeItemExtracted[] = [];

    for (const det of detGroups) {
      const prodGroupMatch = det.match(/<prod>([\s\S]*?)<\/prod>/i);
      if (prodGroupMatch) {
        const prodXml = prodGroupMatch[1];
        
        const cProd = extractTagValue(prodXml, "cProd");
        const xProd = extractTagValue(prodXml, "xProd");
        const uCom = extractTagValue(prodXml, "uCom");
        const qComRaw = extractTagValue(prodXml, "qCom");
        const vUnComRaw = extractTagValue(prodXml, "vUnCom");
        const vProdRaw = extractTagValue(prodXml, "vProd");

        if (cProd && xProd) {
          itensNFe.push({
            cProd,
            xProd,
            uCom: uCom || "",
            qCom: qComRaw ? parseFloat(qComRaw) : 0,
            vUnCom: vUnComRaw ? parseFloat(vUnComRaw) : 0,
            vProd: vProdRaw ? parseFloat(vProdRaw) : 0,
          });
        }
      }
    }

    if (itensNFe.length === 0) {
      return { success: false, error: "Nenhum produto encontrado no XML." };
    }

    // Tentar mapear itens automaticamente
    const mappedItemsToSave = [];
    
    // Buscar todos os códigos de fornecedor conhecidos dessa loja
    const mappedSuppliers = await prisma.itemFornecedor.findMany({
      where: { item: { ownerId: user.ownerId } }
    });

    for (const nfeItem of itensNFe) {
      // Procura se tem algum ItemFornecedor para esse cProd
      const match = mappedSuppliers.find((s: any) => s.codigoFornecedor === nfeItem.cProd);
      
      mappedItemsToSave.push({
        codigoFornecedor: nfeItem.cProd,
        descricaoFornecedor: nfeItem.xProd,
        unidade: nfeItem.uCom,
        quantidade: nfeItem.qCom,
        valorUnitario: nfeItem.vUnCom,
        valorTotal: nfeItem.vProd,
        itemId: match ? match.itemId : null
      });
    }

    // Salvar no Banco
    const nfe = await prisma.nFeCompra.create({
      data: {
        numero,
        emitente,
        dataEmissao,
        valorTotal,
        xmlContent: xmlText,
        ownerId: user.ownerId,
        itens: {
          create: mappedItemsToSave
        }
      }
    });

    // Recalcular custos para os itens que foram mapeados automaticamente
    const mappedIds = new Set<string>();
    for (const m of mappedItemsToSave) {
      if (m.itemId) mappedIds.add(m.itemId);
    }
    for (const id of Array.from(mappedIds)) {
      await recalcularCustosItem(id, user.ownerId);
    }

    revalidatePath("/nfe-importacao");
    return { success: true, count: itensNFe.length, nfeId: nfe.id };
  } catch (error: any) {
    console.error("Erro importNFeXML:", error);
    return { success: false, error: error.message || "Erro interno." };
  }
}

export async function mapItemToCatalog(nfeItemId: string, catalogItemId: string, codigoFornecedor: string) {
  try {
    const user = await getSession();
    if (!user || !user.ownerId) return { success: false, error: "Não autorizado." };


    const updatedItem = await prisma.nFeCompraItem.update({
      where: { id: nfeItemId },
      data: { itemId: catalogItemId }
    });



    await prisma.itemFornecedor.upsert({
      where: {
        itemId_codigoFornecedor: {
          itemId: catalogItemId,
          codigoFornecedor: codigoFornecedor
        }
      },
      update: {},
      create: {
        itemId: catalogItemId,
        codigoFornecedor: codigoFornecedor
      }
    });



    await prisma.nFeCompraItem.updateMany({
      where: {
        codigoFornecedor: codigoFornecedor,
        nfeCompra: { ownerId: user.ownerId },
        itemId: null
      },
      data: {
        itemId: catalogItemId
      }
    });


    await recalcularCustosItem(catalogItemId, user.ownerId);

    revalidatePath("/nfe-importacao");
    revalidatePath(`/nfe-importacao/${updatedItem.nfeCompraId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Erro mapItemToCatalog:", error);
    return { success: false, error: error.message || "Erro interno ao mapear item." };
  }
}
export async function unmapItemFromCatalog(nfeItemId: string, catalogItemId: string, codigoFornecedor: string) {
  try {
    const user = await getSession();
    if (!user || !user.ownerId) return { success: false, error: "Não autorizado." };


    await prisma.itemFornecedor.deleteMany({
      where: {
        itemId: catalogItemId,
        codigoFornecedor: codigoFornecedor
      }
    });


    const updatedItem = await prisma.nFeCompraItem.update({
      where: { id: nfeItemId },
      data: { itemId: null }
    });


    await prisma.nFeCompraItem.updateMany({
      where: {
        codigoFornecedor: codigoFornecedor,
        itemId: catalogItemId,
        nfeCompra: { ownerId: user.ownerId }
      },
      data: {
        itemId: null
      }
    });


    await recalcularCustosItem(catalogItemId, user.ownerId);

    revalidatePath("/nfe-importacao");
    revalidatePath(`/nfe-importacao/${updatedItem.nfeCompraId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Erro unmapItemFromCatalog:", error);
    return { success: false, error: error.message || "Erro interno ao desvincular item." };
  }
}

export async function deleteNFeImport(id: string) {
  try {
    const user = await getSession();
    if (!user || !user.ownerId) return { success: false, error: "Não autorizado." };


    const nfe = await prisma.nFeCompra.findUnique({
      where: { id: id, ownerId: user.ownerId },
      include: { itens: true }
    });

    if (!nfe) return { success: false, error: "NFe não encontrada." };

    const mappedItemIds = new Set<string>();
    nfe.itens.forEach(item => {
      if (item.itemId) mappedItemIds.add(item.itemId);
    });

    await prisma.nFeCompra.delete({
      where: {
        id,
        ownerId: user.ownerId
      }
    });


    for (const itemId of Array.from(mappedItemIds)) {
      await recalcularCustosItem(itemId, user.ownerId);
    }

    revalidatePath("/nfe-importacao");
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao excluir NFe:", error);
    return { success: false, error: "Falha ao excluir a importação da Nota." };
  }
}

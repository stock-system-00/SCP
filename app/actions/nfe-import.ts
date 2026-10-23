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

function extractEmitente(xml: string): string | null {
  const emitMatch = xml.match(/<emit[\s\S]*?<\/emit>/i);
  if (emitMatch) {
    return extractTagValue(emitMatch[0], "xNome");
  }
  return extractTagValue(xml, "xNome");
}

export interface BatchItemResult {
  fileName: string;
  status: "imported" | "skipped_duplicate" | "error";
  numero?: string;
  emitente?: string;
  dataEmissao?: string;
  totalItens?: number;
  valorTotal?: number;
  message?: string;
  nfeId?: string;
}

export async function recalcularCustosItem(itemId: string, ownerId: string) {
  try {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { lojaId: true }
    });

    const nfeItens = await prisma.nFeCompraItem.findMany({
      where: {
        itemId: itemId,
        nfeCompra: {
          ownerId: ownerId,
          ...(item?.lojaId && { lojaId: item.lojaId })
        }
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
    const emitente = extractEmitente(xmlText);
    const dataEmissaoRaw = extractTagValue(xmlText, "dhEmi") || extractTagValue(xmlText, "dEmi");
    const valorTotalRaw = extractTagValue(xmlText, "vNF");
    
    const dataEmissao = dataEmissaoRaw ? new Date(dataEmissaoRaw) : null;
    const valorTotal = valorTotalRaw ? parseFloat(valorTotalRaw) : 0;


    if (numero) {
      const existeNfe = await prisma.nFeCompra.findFirst({
        where: {
          numero,
          emitente: emitente || undefined,
          ownerId: user.ownerId,
          ...(user.activeLojaId && { lojaId: user.activeLojaId })
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
    
    // Buscar apenas os códigos de fornecedor presentes neste XML
    const cProdList = itensNFe.map((i) => i.cProd);
    const mappedSuppliers = await prisma.itemFornecedor.findMany({
      where: { 
        item: {
          ownerId: user.ownerId,
          ...(user.activeLojaId && { lojaId: user.activeLojaId })
        },
        codigoFornecedor: { in: cProdList }
      }
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
        lojaId: user.activeLojaId || null,
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
    await Promise.all(
      Array.from(mappedIds).map(id => recalcularCustosItem(id, user.ownerId))
    );

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



    const catalogItem = await prisma.item.findUnique({
      where: { id: catalogItemId },
      select: { lojaId: true }
    });

    await prisma.nFeCompraItem.updateMany({
      where: {
        codigoFornecedor: codigoFornecedor,
        nfeCompra: {
          ownerId: user.ownerId,
          ...(catalogItem?.lojaId ? { lojaId: catalogItem.lojaId } : (user.activeLojaId && { lojaId: user.activeLojaId }))
        },
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


    const catalogItem = await prisma.item.findUnique({
      where: { id: catalogItemId },
      select: { lojaId: true }
    });

    await prisma.nFeCompraItem.updateMany({
      where: {
        codigoFornecedor: codigoFornecedor,
        itemId: catalogItemId,
        nfeCompra: {
          ownerId: user.ownerId,
          ...(catalogItem?.lojaId ? { lojaId: catalogItem.lojaId } : (user.activeLojaId && { lojaId: user.activeLojaId }))
        }
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

    if (!nfe || (user.activeLojaId && nfe.lojaId !== user.activeLojaId)) return { success: false, error: "NFe não encontrada ou sem permissão." };

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


    await Promise.all(
      Array.from(mappedItemIds).map(itemId => recalcularCustosItem(itemId, user.ownerId))
    );

    revalidatePath("/nfe-importacao");
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao excluir NFe:", error);
    return { success: false, error: "Falha ao excluir a importação da Nota." };
  }
}

export async function importSingleNFeBatchItem(formData: FormData): Promise<BatchItemResult> {
  const fileName = (formData.get("fileName") as string) || "Arquivo XML";
  try {
    const user = await getSession();
    if (!user || !user.ownerId) {
      return {
        fileName,
        status: "error",
        message: "Usuário não autenticado ou sem permissão."
      };
    }

    const file = formData.get("file") as File;
    if (!file) {
      return {
        fileName,
        status: "error",
        message: "Nenhum arquivo enviado para importação."
      };
    }

    const xmlText = await file.text();

    if (!xmlText.includes("<nfeProc") && !xmlText.includes("<NFe") && !xmlText.includes("<infNFe")) {
      return {
        fileName,
        status: "error",
        message: "Arquivo não contém a estrutura de uma NF-e válida."
      };
    }

    const numero = extractTagValue(xmlText, "nNF");
    const emitente = extractEmitente(xmlText);
    const dataEmissaoRaw = extractTagValue(xmlText, "dhEmi") || extractTagValue(xmlText, "dEmi");
    const valorTotalRaw = extractTagValue(xmlText, "vNF");

    const dataEmissao = dataEmissaoRaw ? new Date(dataEmissaoRaw) : null;
    const valorTotal = valorTotalRaw ? parseFloat(valorTotalRaw) : 0;

    // 1. CHECAGEM DE DUPLICIDADE:
    // Se a nota fiscal já existe para este owner/loja, NÃO SOBRESCREVE NADA!
    // Apenas retorna status 'skipped_duplicate' preservando a integridade existente.
    if (numero) {
      const existeNfe = await prisma.nFeCompra.findFirst({
        where: {
          numero,
          emitente: emitente || undefined,
          ownerId: user.ownerId,
          ...(user.activeLojaId && { lojaId: user.activeLojaId })
        },
        select: {
          id: true,
          numero: true,
          emitente: true,
          dataEmissao: true,
          valorTotal: true,
          itens: { select: { id: true } }
        }
      });

      if (existeNfe) {
        return {
          fileName,
          status: "skipped_duplicate",
          numero: existeNfe.numero || numero,
          emitente: existeNfe.emitente || emitente || "Desconhecido",
          dataEmissao: existeNfe.dataEmissao ? existeNfe.dataEmissao.toISOString() : undefined,
          totalItens: existeNfe.itens.length,
          valorTotal: existeNfe.valorTotal ? Number(existeNfe.valorTotal) : undefined,
          message: "Nota fiscal já cadastrada no sistema. Mantida intacta sem alterações.",
          nfeId: existeNfe.id
        };
      }
    }

    // 2. Extração de produtos
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
      return {
        fileName,
        status: "error",
        numero: numero || undefined,
        emitente: emitente || undefined,
        message: "Nenhum produto (<prod>) encontrado no XML."
      };
    }

    // 3. Mapeamento automático de itens já conhecidos no catálogo
    const cProdList = itensNFe.map((i) => i.cProd);
    const mappedSuppliers = await prisma.itemFornecedor.findMany({
      where: {
        item: {
          ownerId: user.ownerId,
          ...(user.activeLojaId && { lojaId: user.activeLojaId })
        },
        codigoFornecedor: { in: cProdList }
      }
    });

    const mappedItemsToSave = [];
    for (const nfeItem of itensNFe) {
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

    // 4. Salvar nova nota no Banco
    const nfe = await prisma.nFeCompra.create({
      data: {
        numero,
        emitente,
        dataEmissao,
        valorTotal,
        xmlContent: xmlText,
        ownerId: user.ownerId,
        lojaId: user.activeLojaId || null,
        itens: {
          create: mappedItemsToSave
        }
      }
    });

    // 5. Recalcular custos para itens mapeados automaticamente
    const mappedIds = new Set<string>();
    for (const m of mappedItemsToSave) {
      if (m.itemId) mappedIds.add(m.itemId);
    }
    if (mappedIds.size > 0) {
      await Promise.all(
        Array.from(mappedIds).map(id => recalcularCustosItem(id, user.ownerId!))
      );
    }

    revalidatePath("/nfe-importacao");

    return {
      fileName,
      status: "imported",
      numero: nfe.numero || numero || "S/N",
      emitente: nfe.emitente || emitente || "Desconhecido",
      dataEmissao: dataEmissao ? dataEmissao.toISOString() : undefined,
      totalItens: itensNFe.length,
      valorTotal,
      nfeId: nfe.id,
      message: `${itensNFe.length} itens importados (${mappedIds.size} vinculados automaticamente).`
    };
  } catch (error: any) {
    console.error("Erro importSingleNFeBatchItem:", error);
    return {
      fileName,
      status: "error",
      message: error.message || "Erro inesperado ao processar arquivo."
    };
  }
}


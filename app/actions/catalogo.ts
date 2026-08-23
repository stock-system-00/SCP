
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ItemUnidade } from "@prisma/client";
import { Item } from "@/lib/types";
import { getSession } from "@/lib/session";
import { recalcularCustosItem } from "./nfe-import";


export type CreateItemData = {
  nome: string;
  codigoBarras?: string;
  codigoInterno?: string;
  unidade: string;
  preco?: number;
  custo?: number;
  categoriaId: string;
  fotoUrl?: string;
};


function parseUnidade(unidade: string): ItemUnidade {
  const u = unidade.toUpperCase();
  if (Object.values(ItemUnidade).includes(u as ItemUnidade)) {
    return u as ItemUnidade;
  }
  return "UN";
}


function generateInternalCode() {
  return `ITEM-${Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0")}`;
}


export async function getItens() {
  const session = await getSession();
  if (!session) return { success: false, data: [] };

  try {
    const itens = await prisma.item.findMany({
      where: { ownerId: session.ownerId },
      orderBy: { nome: "asc" },
      include: {
        categoria: true,
      },
    });

    const formattedItens = itens.map((item) => ({
      ...item,
      custo: Number(item.custo),
      custoMedio: Number((item as any).custoMedio || 0),
      precoVenda: Number(item.precoVenda),
      preco: Number(item.precoVenda),
    }));

    return { success: true, data: formattedItens };
  } catch (error) {
    console.error("Erro ao buscar itens:", error);
    return { success: false, data: [] };
  }
}


export async function createItem(data: CreateItemData) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  if (!data.nome || !data.categoriaId) {
    return { success: false, message: "Nome e Categoria são obrigatórios." };
  }

  try {

    if (data.codigoBarras) {
      const existeCodigo = await prisma.item.findFirst({
        where: {
          codigoBarras: data.codigoBarras,
          ownerId: session.ownerId,
        },
      });
      if (existeCodigo) {
        return {
          success: false,
          message: "Você já possui um item com este código de barras.",
        };
      }
    }

    let finalCodigoInterno = data.codigoInterno;


    if (finalCodigoInterno) {
      const existeInterno = await prisma.item.findFirst({
        where: {
          codigoInterno: finalCodigoInterno,
          ownerId: session.ownerId,
        },
      });
      if (existeInterno) {
        return {
          success: false,
          message: "Este Código Interno já está em uso na sua loja.",
        };
      }
    } else {
      finalCodigoInterno = generateInternalCode();
    }

    await prisma.item.create({
      data: {
        nome: data.nome,
        codigoBarras: data.codigoBarras || null,
        codigoInterno: finalCodigoInterno,
        unidade: parseUnidade(data.unidade),
        precoVenda: data.preco || 0,
        custo: data.custo || 0,
        categoriaId: data.categoriaId,
        imagemUrl: data.fotoUrl || null,
        status: "ativo",
        ownerId: session.ownerId,
      },
    });

    revalidatePath("/catalogo");
    return { success: true };
  } catch (error) {
    console.error("Erro ao criar item:", error);
    return { success: false, message: "Erro ao cadastrar item." };
  }
}


export async function updateItem(id: string, data: Partial<CreateItemData>) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {

    const itemExistente = await prisma.item.findUnique({ where: { id } });
    if (!itemExistente || itemExistente.ownerId !== session.ownerId) {
      return {
        success: false,
        message: "Item não encontrado ou sem permissão.",
      };
    }

    if (data.codigoBarras) {
      const existeOutro = await prisma.item.findFirst({
        where: {
          codigoBarras: data.codigoBarras,
          ownerId: session.ownerId,
          id: { not: id },
        },
      });
      if (existeOutro) {
        return {
          success: false,
          message:
            "Este código de barras já pertence a outro item da sua loja.",
        };
      }
    }

    await prisma.item.update({
      where: { id },
      data: {
        nome: data.nome,
        codigoInterno: data.codigoInterno,
        codigoBarras: data.codigoBarras,
        unidade: data.unidade ? parseUnidade(data.unidade) : undefined,
        precoVenda: data.preco !== undefined ? data.preco : undefined,
        custo: data.custo !== undefined ? data.custo : undefined,
        categoriaId: data.categoriaId,
        imagemUrl: data.fotoUrl,
      },
    });

    revalidatePath("/catalogo");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar item:", error);
    return { success: false, message: "Erro ao atualizar item." };
  }
}


export async function toggleItemStatus(id: string) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {
    const item = await prisma.item.findUnique({ where: { id } });
    if (!item || item.ownerId !== session.ownerId) {
      return {
        success: false,
        message: "Item não encontrado ou sem permissão.",
      };
    }

    const novoStatus = item.status === "ativo" ? "inativo" : "ativo";

    await prisma.item.update({
      where: { id },
      data: { status: novoStatus },
    });

    revalidatePath("/catalogo");
    return { success: true, newStatus: novoStatus };
  } catch (error) {
    return { success: false, message: "Erro ao alterar status." };
  }
}


export async function deleteItem(id: string) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {
    const item = await prisma.item.findUnique({ where: { id } });
    if (!item || item.ownerId !== session.ownerId) {
      return {
        success: false,
        message: "Item não encontrado ou sem permissão.",
      };
    }


    await prisma.vendaItem.deleteMany({ where: { itemId: id } });

    await prisma.item.delete({ where: { id } });

    revalidatePath("/catalogo");
    return { success: true };
  } catch (error) {
    console.error("Erro ao deletar item:", error);
    return { success: false, message: "Erro ao excluir item." };
  }
}


export async function importarItens(itensImportados: Item[]) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {
    let count = 0;
    const categoriaCache = new Map<string, string>();

    for (const item of itensImportados) {
      if (!item.nome) continue;

      const nomeCategoria = item.categoria || "Geral";
      let categoriaId = categoriaCache.get(nomeCategoria);

      if (!categoriaId) {
        const catExistente = await prisma.categoria.findFirst({
          where: {
            nome: { equals: nomeCategoria, mode: "insensitive" },
            ownerId: session.ownerId,
          },
        });

        if (catExistente) {
          categoriaId = catExistente.id;
        } else {
          const novaCat = await prisma.categoria.create({
            data: {
              nome: nomeCategoria,
              status: "ativa",
              ownerId: session.ownerId,
            },
          });
          categoriaId = novaCat.id;
        }
        categoriaCache.set(nomeCategoria, categoriaId);
      }


      await prisma.item.upsert({
        where: {
          codigoInterno_ownerId: {

            codigoInterno: item.codigoInterno,
            ownerId: session.ownerId,
          },
        },
        update: {
          nome: item.nome,
          precoVenda: item.precoVenda,
          custo: item.custo,
          unidade: parseUnidade(item.unidade),
          categoriaId: categoriaId,
        },
        create: {
          codigoInterno: item.codigoInterno,
          nome: item.nome,
          codigoBarras: item.codigoBarras || null,
          precoVenda: item.precoVenda || 0,
          custo: item.custo || 0,
          unidade: parseUnidade(item.unidade),
          categoriaId: categoriaId,
          status: "ativo",
          ownerId: session.ownerId,
        },
      });

      count++;
    }

    revalidatePath("/catalogo");
    return { success: true, count };
  } catch (error) {
    console.error("Erro na importação:", error);
    return { success: false, message: "Falha ao processar importação." };
  }
}


export async function getItemFornecedores(itemId: string) {
  const session = await getSession();
  if (!session) return { success: false, data: [] };

  try {
    const fornecedores = await prisma.itemFornecedor.findMany({
      where: {
        itemId: itemId,
        item: { ownerId: session.ownerId }
      }
    });

    return { success: true, data: fornecedores };
  } catch (error) {
    console.error("Erro ao buscar fornecedores:", error);
    return { success: false, data: [] };
  }
}


export async function deleteItemFornecedor(fornecedorId: string) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {
    const fornecedor = await prisma.itemFornecedor.findUnique({
      where: { id: fornecedorId },
      include: { item: true }
    });

    if (!fornecedor || fornecedor.item.ownerId !== session.ownerId) {
      return { success: false, message: "Vínculo não encontrado ou sem permissão." };
    }

    await prisma.itemFornecedor.delete({ where: { id: fornecedorId } });


    await prisma.nFeCompraItem.updateMany({
      where: {
        codigoFornecedor: fornecedor.codigoFornecedor,
        itemId: fornecedor.itemId,
        nfeCompra: { ownerId: session.ownerId }
      },
      data: { itemId: null }
    });

    await recalcularCustosItem(fornecedor.itemId, session.ownerId);

    revalidatePath("/catalogo");
    return { success: true };
  } catch (error) {
    console.error("Erro ao remover vínculo de fornecedor:", error);
    return { success: false, message: "Erro ao desvincular fornecedor." };
  }
}


export async function createItemFornecedor(itemId: string, codigoFornecedor: string) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  if (!codigoFornecedor.trim()) {
    return { success: false, message: "O código do fornecedor não pode ser vazio." };
  }

  try {
    const item = await prisma.item.findUnique({
      where: { id: itemId }
    });

    if (!item || item.ownerId !== session.ownerId) {
      return { success: false, message: "Item não encontrado ou sem permissão." };
    }


    await prisma.itemFornecedor.upsert({
      where: {
        itemId_codigoFornecedor: {
          itemId: itemId,
          codigoFornecedor: codigoFornecedor
        }
      },
      update: {},
      create: {
        itemId: itemId,
        codigoFornecedor: codigoFornecedor
      }
    });


    await prisma.nFeCompraItem.updateMany({
      where: {
        codigoFornecedor: codigoFornecedor,
        nfeCompra: { ownerId: session.ownerId },
        itemId: null
      },
      data: {
        itemId: itemId
      }
    });

    await recalcularCustosItem(itemId, session.ownerId);

    revalidatePath("/catalogo");
    return { success: true };
  } catch (error) {
    console.error("Erro ao adicionar vínculo de fornecedor:", error);
    return { success: false, message: "Erro ao adicionar código do fornecedor." };
  }
}


export async function atualizarPrecosLote(itensParaAtualizar: { codigoInterno: string; precoVenda: number }[]) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {
    let count = 0;
    

    for (const item of itensParaAtualizar) {
      const dbItem = await prisma.item.findFirst({
        where: {
          codigoInterno: item.codigoInterno,
          ownerId: session.ownerId
        },
      });

      if (dbItem && Number(dbItem.precoVenda) !== item.precoVenda) {
        await prisma.item.update({
          where: { id: dbItem.id },
          data: { precoVenda: item.precoVenda },
        });
        count++;
      }
    }

    revalidatePath("/catalogo");
    return { success: true, count };
  } catch (error) {
    console.error("Erro na atualização de preços:", error);
    return {
      success: false,
      message: "Erro na atualização de preços em lote.",
    };
  }
}

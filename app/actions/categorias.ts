
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";


export async function getCategorias() {
  const session = await getSession();
  if (!session) return { success: false, data: [] };

  try {
    const categorias = await prisma.categoria.findMany({
      where: { ownerId: session.ownerId },
      orderBy: { nome: "asc" },
    });
    return { success: true, data: categorias };
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    return { success: false, data: [] };
  }
}


export async function createCategoria(nome: string) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  if (!nome) return { success: false, message: "Nome é obrigatório" };

  try {


    const existe = await prisma.categoria.findFirst({
      where: {
        nome: { equals: nome, mode: "insensitive" },
        ownerId: session.ownerId,
      },
    });

    if (existe) {
      return {
        success: false,
        message: "Você já possui uma categoria com este nome.",
      };
    }


    await prisma.categoria.create({
      data: {
        nome,
        status: "ativa",
        ownerId: session.ownerId,
      },
    });

    revalidatePath("/categorias");
    return { success: true };
  } catch (error) {
    console.error("Erro ao criar categoria:", error);
    return { success: false, message: "Erro interno ao criar categoria." };
  }
}


export async function updateCategoria(id: string, nome: string) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {

    const categoria = await prisma.categoria.findUnique({ where: { id } });
    if (!categoria || categoria.ownerId !== session.ownerId) {
      return {
        success: false,
        message: "Categoria não encontrada ou sem permissão.",
      };
    }

    await prisma.categoria.update({
      where: { id },
      data: { nome },
    });
    revalidatePath("/categorias");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar categoria:", error);
    return { success: false, message: "Erro ao atualizar." };
  }
}


export async function deleteCategoria(id: string) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {

    const categoria = await prisma.categoria.findUnique({ where: { id } });
    if (!categoria || categoria.ownerId !== session.ownerId) {
      return {
        success: false,
        message: "Categoria não encontrada ou sem permissão.",
      };
    }


    const itensVinculados = await prisma.item.count({
      where: { categoriaId: id },
    });

    if (itensVinculados > 0) {
      return {
        success: false,
        message:
          "Não é possível excluir: existem itens cadastrados nesta categoria.",
      };
    }

    await prisma.categoria.delete({
      where: { id },
    });

    revalidatePath("/categorias");
    return { success: true };
  } catch (error) {
    console.error("Erro ao deletar categoria:", error);
    return { success: false, message: "Erro ao excluir." };
  }
}

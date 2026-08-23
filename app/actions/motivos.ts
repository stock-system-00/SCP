"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";


export async function getMotivos() {
  const session = await getSession();
  if (!session) return { success: false, data: [] };

  try {
    const motivos = await prisma.motivo.findMany({
      where: { ownerId: session.ownerId },
      orderBy: { nome: "asc" },
    });
    return { success: true, data: motivos };
  } catch (error) {
    return { success: false, data: [] };
  }
}


export async function createMotivo(nome: string) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  if (!nome || !nome.trim())
    return { success: false, message: "Nome obrigatório" };

  try {
    const nomeFormatado = nome.trim();


    const existente = await prisma.motivo.findFirst({
      where: {
        nome: { equals: nomeFormatado, mode: "insensitive" },
        ownerId: session.ownerId,
      },
    });

    if (existente) {
      return { success: true, data: existente };
    }


    const totalMotivos = await prisma.motivo.count({
      where: { ownerId: session.ownerId },
    });

    if (totalMotivos >= 15) {
      return {
        success: false,
        message: "Limite de 15 motivos atingido. Exclua um motivo para criar outro.",
      };
    }


    const novo = await prisma.motivo.create({
      data: {
        nome: nomeFormatado,
        ownerId: session.ownerId,
      },
    });

    revalidatePath("/motivos");
    return { success: true, data: novo };
  } catch (error) {
    console.error("Erro ao criar motivo:", error);
    return { success: false, message: "Erro ao criar motivo." };
  }
}


export async function updateMotivo(id: string, nome: string) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {
    const nomeFormatado = nome.trim();


    const motivoAntigo = await prisma.motivo.findUnique({ where: { id } });
    if (!motivoAntigo || motivoAntigo.ownerId !== session.ownerId) {
      return {
        success: false,
        message: "Motivo não encontrado ou sem permissão.",
      };
    }

    if (motivoAntigo.nome === nomeFormatado) {
      return { success: true };
    }


    const motivoExistente = await prisma.motivo.findFirst({
      where: {
        nome: { equals: nomeFormatado, mode: "insensitive" },
        ownerId: session.ownerId,
        id: { not: id },
      },
    });

    await prisma.$transaction(async (tx) => {

      await tx.evidencia.updateMany({
        where: { motivo: motivoAntigo.nome, ownerId: session.ownerId },
        data: { motivo: nomeFormatado },
      });


      await tx.evento.updateMany({
        where: { motivo: motivoAntigo.nome, ownerId: session.ownerId },
        data: { motivo: nomeFormatado },
      });

      if (motivoExistente) {

        await tx.motivo.delete({
          where: { id },
        });
      } else {

        await tx.motivo.update({
          where: { id },
          data: { nome: nomeFormatado },
        });
      }
    });

    revalidatePath("/motivos");
    revalidatePath("/eventos");
    
    return { success: true };
  } catch (error) {
    console.error("Erro ao mesclar/atualizar motivo:", error);
    return { success: false, message: "Erro ao atualizar." };
  }
}


export async function deleteMotivo(id: string) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {

    const motivo = await prisma.motivo.findUnique({ where: { id } });
    if (!motivo || motivo.ownerId !== session.ownerId) {
      return {
        success: false,
        message: "Motivo não encontrado ou sem permissão.",
      };
    }

    await prisma.motivo.delete({
      where: { id },
    });
    revalidatePath("/motivos");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao excluir." };
  }
}

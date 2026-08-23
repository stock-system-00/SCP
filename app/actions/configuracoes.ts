
"use server";

import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { UserRole } from "@/lib/types";
import { requireServerPermission, checkServerPermission } from "@/lib/server-permissions";



export async function getSettings() {
  try {
    const session = await getSession();
    if (!session) return { success: false, message: "Não autorizado" };



    let config = await prisma.configuracao.findUnique({
      where: { donoId: session.ownerId },
    });


    if (!config && session.role === "dono") {
      config = await prisma.configuracao.create({
        data: {
          empresaNome: "Minha Empresa",
          donoId: session.ownerId,
          limiteDiario: 1000,
        },
      });
    }


    const plainConfig = config
      ? {
          ...config,
          limiteDiario: Number(config.limiteDiario),
        }
      : null;

    return { success: true, data: plainConfig };
  } catch (error) {
    console.error("Erro ao buscar configurações:", error);
    return { success: false, message: "Erro ao carregar configurações" };
  }
}

export async function saveSettings(data: {
  empresaNome: string;
  exigirFoto: boolean;
  bloquearAprovados: boolean;
  permitirFuncionarioGaleria: boolean;
  limiteDiario?: number;
  permissoes?: any;
}) {
  const auth = await requireServerPermission("configuracoes:ver");
  if (!auth.success) return auth;
  const session = auth.session;

  try {
    const dataToUpdate = {
      empresaNome: data.empresaNome,
      exigirFoto: data.exigirFoto,
      bloquearAprovados: data.bloquearAprovados,
      permitirFuncionarioGaleria: data.permitirFuncionarioGaleria,
      ...(data.limiteDiario !== undefined && {
        limiteDiario: data.limiteDiario,
      }),
      ...(data.permissoes !== undefined && {
        permissoes: data.permissoes,
      })
    };

    await prisma.configuracao.upsert({
      where: { donoId: session.ownerId },
      update: dataToUpdate,
      create: {
        ...dataToUpdate,
        donoId: session.ownerId,
        limiteDiario: data.limiteDiario || 1000,
      },
    });

    revalidatePath("/configuracoes");
    revalidatePath("/eventos/novo");
    return { success: true };
  } catch (error) {
    console.error("Erro ao salvar configurações:", error);
    return { success: false, message: "Erro interno ao salvar." };
  }
}



export async function getUsers() {
  const auth = await requireServerPermission("usuarios:gerenciar");
  if (!auth.success) return auth;
  const session = auth.session;

  try {

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { id: session.ownerId },
          { ownerId: session.ownerId },
        ],
      },
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        avatarUrl: true,
        ativo: true,
        ownerId: true,
        lojasPermitidas: { select: { id: true } },
      },
    });
    return { success: true, data: users };
  } catch (error) {
    return { success: false, message: "Erro ao buscar usuários" };
  }
}

export async function saveUser(data: {
  id?: string;
  nome: string;
  email: string;
  role: UserRole;
  password?: string;
  avatarUrl?: string;
  ativo?: boolean;
  lojasPermitidas?: string[];
}) {
  const auth = await requireServerPermission("usuarios:gerenciar");
  if (!auth.success) return auth;
  const session = auth.session;

  try {
    if (data.id) {

      const existingUser = await prisma.user.findUnique({
        where: { id: data.id },
      });

      if (
        !existingUser ||
        (existingUser.id !== session.ownerId &&
          existingUser.ownerId !== session.ownerId)
      ) {
        return { success: false, message: "Acesso negado a este usuário." };
      }


      if (existingUser.id === session.ownerId) {
        if (data.role !== "dono") {
          return {
            success: false,
            message: "O proprietário não pode alterar seu próprio cargo.",
          };
        }
        if (data.ativo === false) {
          return {
            success: false,
            message: "O proprietário não pode desativar sua própria conta.",
          };
        }
      }

      const updateData: any = {
        nome: data.nome,
        email: data.email,
        role: data.role,
        ativo: data.ativo,
      };

      if (data.password) {
        updateData.passwordHash = await hashPassword(data.password);
      }

      if (data.lojasPermitidas !== undefined) {
        updateData.lojasPermitidas = {
          set: data.lojasPermitidas.map((id) => ({ id })),
        };
      }

      await prisma.user.update({
        where: { id: data.id },
        data: updateData,
      });
    } else {

      const exists = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (exists)
        return { success: false, message: "Este e-mail já está em uso." };

      const passwordRaw = data.password || "1234";
      const passwordHash = await hashPassword(passwordRaw);

      await prisma.user.create({
        data: {
          nome: data.nome,
          email: data.email,
          role: data.role,
          passwordHash,
          ativo: true,
          ownerId: session.ownerId,
          ...(data.lojasPermitidas && {
            lojasPermitidas: {
              connect: data.lojasPermitidas.map((id) => ({ id })),
            },
          }),
        },
      });
    }

    revalidatePath("/configuracoes");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao salvar usuário." };
  }
}

export async function deleteUser(id: string) {
  const auth = await requireServerPermission("usuarios:gerenciar");
  if (!auth.success) return auth;
  const session = auth.session;

  if (session.id === id) {
    return {
      success: false,
      message: "Você não pode excluir sua própria conta.",
    };
  }

  try {

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser || targetUser.ownerId !== session.ownerId) {
      return { success: false, message: "Usuário não pertence à sua equipe." };
    }


    await prisma.$transaction([
      prisma.evento.updateMany({
        where: { criadoPorId: id },
        data: { criadoPorId: session.ownerId },
      }),
      prisma.evento.updateMany({
        where: { aprovadoPorId: id },
        data: { aprovadoPorId: session.ownerId },
      }),
      prisma.notaFiscal.updateMany({
        where: { uploadedById: id },
        data: { uploadedById: session.ownerId },
      }),
      prisma.evidencia.updateMany({
        where: { userId: id },
        data: { userId: session.ownerId },
      }),
      prisma.user.delete({ where: { id } }),
    ]);

    revalidatePath("/configuracoes");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao excluir usuário." };
  }
}

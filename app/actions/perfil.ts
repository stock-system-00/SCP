"use server";

import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function updateProfile(data: {
  nome?: string;
  email?: string;
  password?: string;
}) {
  const session = await getSession();
  if (!session) {
    return { success: false, message: "Não autorizado" };
  }

  try {
    const updateData: any = {};
    if (data.nome) updateData.nome = data.nome;
    if (data.email) updateData.email = data.email;
    if (data.password) {
      updateData.passwordHash = await hashPassword(data.password);
    }

    await prisma.user.update({
      where: { id: session.id },
      data: updateData,
    });

    revalidatePath("/perfil");
    return { success: true, message: "Perfil atualizado com sucesso" };
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    return { success: false, message: "Erro ao atualizar perfil (Email em uso?)" };
  }
}

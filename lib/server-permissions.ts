import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";

export async function checkServerPermission(permission: Permission) {
  const session = await getSession();
  
  if (!session) {
    return { session: null, hasAccess: false };
  }


  if (session.role === "dono") {
    return { session, hasAccess: true };
  }

  try {

    const config = await prisma.configuracao.findUnique({
      where: { donoId: session.ownerId },
      select: { permissoes: true }
    });

    const customPermissions = (config?.permissoes as Record<string, Permission[]>) || undefined;

    const hasAccess = hasPermission(session.role, permission, customPermissions);

    return { session, hasAccess };
  } catch (error) {
    console.error("Erro ao verificar permissões no servidor:", error);
    return { session, hasAccess: false };
  }
}

export async function requireServerPermission(permission: Permission) {
  const { session, hasAccess } = await checkServerPermission(permission);
  
  if (!session) {
    return { success: false as const, message: "Não autorizado. Sessão inválida." };
  }

  if (!hasAccess) {
    return { success: false as const, message: `Acesso negado. Requer permissão: ${permission}` };
  }

  return { success: true as const, session };
}

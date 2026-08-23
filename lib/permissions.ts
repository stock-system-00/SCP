

import { UserRole } from "./types";

export type Permission =

  | "eventos:criar"
  | "eventos:ver_todos"
  | "eventos:aprovar"
  | "eventos:editar"
  | "eventos:exportar"
  | "eventos:excluir"
  | "eventos:menu"


  | "motivos:ver"
  | "motivos:criar"
  | "motivos:editar"
  | "motivos:excluir"


  | "catalogo:ver"
  | "catalogo:criar"
  | "catalogo:editar"
  | "catalogo:status"
  | "catalogo:importar"
  | "catalogo:excluir"


  | "categorias:ver"
  | "categorias:criar"
  | "categorias:editar"
  | "categorias:excluir"


  | "galeria:ver"
  | "galeria:upload"
  | "galeria:excluir"


  | "notas:ver"
  | "notas:upload"
  | "notas:excluir"


  | "relatorios:ver"
  | "evolucoes:ver"
  | "vendas:ver"
  | "notas:importar"
  | "iris:ver"
  | "perfil:ver"
  | "dashboard:ver"
  | "configuracoes:ver"
  | "usuarios:gerenciar";

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  funcionario: [
    "eventos:menu",
    "eventos:criar",
    "catalogo:ver",
    "catalogo:status",
    "catalogo:criar",
    "categorias:ver",
    "categorias:criar",
    "categorias:editar",
    "notas:importar",
    "perfil:ver",
  ],
  gestor: [
    "eventos:menu",
    "eventos:criar",
    "eventos:ver_todos",
    "eventos:aprovar",
    "eventos:editar",
    "eventos:excluir",
    "eventos:exportar",
    "catalogo:ver",
    "catalogo:criar",
    "catalogo:status",
    "catalogo:editar",
    "catalogo:excluir",
    "catalogo:importar",
    "categorias:ver",
    "categorias:criar",
    "categorias:editar",
    "categorias:excluir",
    "galeria:ver",
    "galeria:upload",
    "galeria:excluir",
    "notas:ver",
    "notas:upload",
    "notas:excluir",
    "notas:importar",
    "relatorios:ver",
    "evolucoes:ver",
    "vendas:ver",
    "perfil:ver",
    "dashboard:ver",
    "motivos:ver",
    "motivos:criar",
    "motivos:editar",
    "motivos:excluir",
  ],
  fiscal: [
    "eventos:criar",
    "eventos:ver_todos",
    "eventos:exportar",
    "catalogo:ver",
    "catalogo:criar",
    "catalogo:status",
    "catalogo:editar",
    "catalogo:importar",
    "catalogo:excluir",
    "categorias:ver",
    "categorias:criar",
    "categorias:editar",
    "categorias:excluir",
    "galeria:ver",
    "galeria:upload",
    "notas:ver",
    "notas:upload",
    "notas:importar",
    "relatorios:ver",
    "evolucoes:ver",
    "vendas:ver",
    "dashboard:ver",
  ],
  dono: [
    "eventos:menu",
    "eventos:criar",
    "eventos:ver_todos",
    "eventos:aprovar",
    "eventos:editar",
    "eventos:excluir",
    "eventos:exportar",
    "catalogo:ver",
    "catalogo:criar",
    "catalogo:status",
    "catalogo:editar",
    "catalogo:excluir",
    "catalogo:importar",
    "categorias:ver",
    "categorias:criar",
    "categorias:editar",
    "categorias:excluir",
    "galeria:ver",
    "galeria:upload",
    "galeria:excluir",
    "notas:ver",
    "notas:upload",
    "notas:excluir",
    "relatorios:ver",
    "evolucoes:ver",
    "vendas:ver",
    "notas:importar",
    "iris:ver",
    "perfil:ver",
    "dashboard:ver",
    "configuracoes:ver",
    "usuarios:gerenciar",
    "motivos:ver",
    "motivos:criar",
    "motivos:editar",
    "motivos:excluir",
  ],
};

export function hasPermission(
  role: UserRole, 
  permission: Permission, 
  customPermissions?: Record<string, Permission[]>
): boolean {
  if (role === "dono") return true;
  
  if (customPermissions && customPermissions[role]) {
    return customPermissions[role].includes(permission);
  }

  return DEFAULT_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: UserRole, customPermissions?: Record<string, Permission[]>): Permission[] {
  if (customPermissions && customPermissions[role]) {
    return customPermissions[role];
  }
  return DEFAULT_ROLE_PERMISSIONS[role] ?? [];
}

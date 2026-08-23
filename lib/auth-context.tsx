
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, NavItem, UserRole } from "@/lib/types";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  loginAction,
  logoutAction,
  getClientSession,
  switchActiveLoja,
} from "@/app/actions/auth";
import { getSettings } from "@/app/actions/configuracoes";
import { toast } from "sonner";
import { useRouter } from "next/navigation";


interface NavItemWithPermission extends NavItem {
  permission: Permission;
}

const ALL_NAV_ITEMS: NavItemWithPermission[] = [
  {
    title: "Visão Geral",
    href: "/dashboard",
    icon: "LayoutDashboard",
    permission: "dashboard:ver",
  },
  {
    title: "Registrar Perda",
    href: "/eventos/novo",
    icon: "PlusCircle",
    permission: "eventos:criar",
  },
  {
    title: "Eventos",
    href: "/eventos",
    icon: "ClipboardCheck",
    permission: "eventos:menu",
  },
  {
    title: "Catálogo",
    href: "/catalogo",
    icon: "Package",
    permission: "catalogo:ver",
  },
  {
    title: "Categorias",
    href: "/categorias",
    icon: "List",
    permission: "categorias:ver",
  },
  {
    title: "Galeria",
    href: "/galeria",
    icon: "Images",
    permission: "galeria:ver",
  },
  {
    title: "Motivos",
    href: "/motivos",
    icon: "MessageSquareWarning",
    permission: "motivos:ver",
  },
  {
    title: "Relatórios",
    href: "/relatorios",
    icon: "BarChart3",
    permission: "relatorios:ver",
  },
  {
    title: "Meu Perfil",
    href: "/perfil",
    icon: "User",
    permission: "perfil:ver",
  },
  {
    title: "Configurações",
    href: "/configuracoes",
    icon: "Settings",
    permission: "configuracoes:ver",
  },
];

interface AuthContextType {
  user: User | null;
  activeLojaId: string | null;
  isLoading: boolean;
  navItems: NavItem[];
  settings: any;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchLoja: (lojaId: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activeLojaId, setActiveLojaId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const router = useRouter();

  const loadSettings = async () => {
    try {
      const result = await getSettings();
      if (result.success && result.data) {
        setSettings(result.data);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações no contexto");
    }
  };


  useEffect(() => {
    const initAuth = async () => {
      try {
        const sessionUser = await getClientSession();
        if (sessionUser) {
          const safeUser: User = {
            ...sessionUser,
            ativo: sessionUser.ativo ?? true,
            ownerId: sessionUser.ownerId ?? null,
            avatarUrl: sessionUser.avatarUrl ?? undefined,
          };
          setUser(safeUser);
          setActiveLojaId(sessionUser.activeLojaId ?? null);
          await loadSettings();
        }
      } catch (error) {
        console.error("Erro ao restaurar sessão:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);


  useEffect(() => {
    if (user) {


      const isAllowed = (permission: string) => {
        if (user.role === "dono") return true;
        if (settings?.permissoes && settings.permissoes[user.role]) {
          return settings.permissoes[user.role].includes(permission);
        }
        return hasPermission(user.role, permission as Permission);
      };

      const filteredNav = ALL_NAV_ITEMS.filter((item) => {

        if (item.href === "/galeria" && user.role === "funcionario") {
          const temPermissaoBase = isAllowed(item.permission);
          return (
            temPermissaoBase && settings?.permitirFuncionarioGaleria === true
          );
        }

        return isAllowed(item.permission);
      });

      setNavItems(filteredNav);
    } else {
      setNavItems([]);
    }
  }, [user, settings]);


  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      const result = await loginAction(email, password);

      if (result.success && result.user) {
        const userData: User = {
          id: result.user.id,
          nome: result.user.nome,
          email: result.user.email,
          role: result.user.role as UserRole,
          avatarUrl: result.user.avatarUrl ?? undefined,
          ativo: result.user.ativo,
          ownerId: result.user.ownerId,
        };

        setUser(userData);
        await loadSettings();
        toast.success(`Bem-vindo, ${userData.nome.split(" ")[0]}!`);




        if (userData.role === "funcionario") {
          router.push("/eventos/novo");
        } else {
          router.push("/dashboard");
        }
      } else {
        toast.error(result.message || "Falha ao entrar.");
      }
    } catch (error) {
      toast.error("Erro de conexão.");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await logoutAction();
    setUser(null);
    setSettings(null);
    router.push("/login");
  };

  const checkPermission = (permission: string) => {
    if (!user) return false;

    if (user.role === "dono") return true;
    

    if (settings?.permissoes && settings.permissoes[user.role]) {
      return settings.permissoes[user.role].includes(permission);
    }
    

    return hasPermission(user.role, permission as Permission);
  };

  const switchLoja = async (lojaId: string) => {
    setIsLoading(true);
    try {
      const result = await switchActiveLoja(lojaId);
      if (result.success) {
        setActiveLojaId(lojaId);
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Erro ao alternar loja");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeLojaId,
        isLoading,
        navItems,
        settings,
        login,
        logout,
        switchLoja,
        hasPermission: checkPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};

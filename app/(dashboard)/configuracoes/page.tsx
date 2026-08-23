"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, UserRole } from "@/lib/types";
import { getRoleLabel } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { UserFormDialog } from "@/components/configuracoes/user-form-dialog";
import {
  getSettings,
  saveSettings,
  getUsers,
  saveUser,
  deleteUser,
} from "@/app/actions/configuracoes";
import { getMinhasLojas } from "@/app/actions/auth";
import {
  AlertTriangle,
  Building2,
  Users,
  Bell,
  Shield,
  Edit,
  Trash2,
  Plus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

const roleColors: Record<UserRole, string> = {
  funcionario: "bg-blue-500 text-white",
  gestor: "bg-purple-500 text-white",
  fiscal: "bg-orange-500 text-white",
  dono: "bg-emerald-600 text-white",
};

export default function ConfiguracoesPage() {
  const { hasPermission, user: currentUser, isLoading: isAuthLoading } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [lojas, setLojas] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    empresaNome: "",
    exigirFoto: false,
    bloquearAprovados: true,
    limiteDiario: 1000,
    permitirFuncionarioGaleria: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const [showUserDialog, setShowUserDialog] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);

    const usersResult = await getUsers();
    if (usersResult.success && usersResult.data) {
      const mappedUsers: User[] = (usersResult.data as any[]).map((u) => ({
        id: u.id,
        nome: u.nome,
        email: u.email,
        role: u.role as UserRole,
        avatarUrl: u.avatarUrl,
        ativo: u.ativo, // Importante: Mapeando o status do banco
        ownerId: u.ownerId,
        lojasPermitidas: u.lojasPermitidas || [],
      }));
      setUsers(mappedUsers);
    }

    const lojasResult = await getMinhasLojas();
    setLojas(lojasResult || []);

    const settingsResult = await getSettings();
    if (settingsResult.success && settingsResult.data) {
      setSettings(settingsResult.data);
    }

    setIsLoading(false);
  };

  const handleSaveSettings = async () => {
    const result = await saveSettings(settings);
    if (result.success) {
      toast.success("Configurações salvas com sucesso!");
    } else {
      toast.error(result.message);
    }
  };

  const handleSaveUser = async (userData: {
    id?: string;
    nome: string;
    email: string;
    role: UserRole;
    password?: string;
    avatarUrl?: string;
    ativo?: boolean;
    lojasPermitidas?: string[];
  }) => {
    if (!userData.nome || !userData.email) {
      toast.error("Nome e Email são obrigatórios");
      return;
    }

    const result = await saveUser(userData as any);

    if (result.success) {
      toast.success(
        userToEdit ? "Usuário atualizado!" : "Usuário criado com sucesso!",
      );
      loadData();
      setShowUserDialog(false);
      setUserToEdit(null);
    } else {
      toast.error(result.message);
    }
  };

  const handleEditUser = (user: User) => {
    setUserToEdit(user);
    setShowUserDialog(true);
  };

  const handleDeleteUser = async () => {
    if (userToDelete) {
      if (userToDelete === currentUser?.id) {
        toast.error("Você não pode excluir sua própria conta.");
        setUserToDelete(null);
        return;
      }

      const result = await deleteUser(userToDelete);

      if (result.success) {
        toast.success("Usuário removido.");
        loadData();
      } else {
        toast.error(result.message);
      }
      setUserToDelete(null);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasPermission("configuracoes:ver")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-muted-foreground">
          Você não tem permissão para ver as configurações.
        </p>
      </div>
    );
  }

  return (
    <>
      <PageHeader 
        title="Configurações" 
        description="Gerencie as configurações do sistema"
      />

      <div className="flex-1 flex flex-col p-0 md:p-4 min-h-0 overflow-y-auto space-y-4 md:space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <Tabs defaultValue="geral" className="space-y-6">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="permissoes">Acessos</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Dados da Empresa
              </CardTitle>
              <CardDescription>
                Informações básicas da organização
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="py-4 flex justify-center">
                  <Loader2 className="animate-spin h-6 w-6" />
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="empresa">Nome da Empresa</Label>
                      <Input
                        id="empresa"
                        value={settings.empresaNome}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            empresaNome: e.target.value,
                          })
                        }
                        placeholder="Supermercado Exemplo Ltda"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ (Opcional)</Label>
                      <Input id="cnpj" placeholder="00.000.000/0000-00" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleSaveSettings}>
                      Salvar Alterações
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Políticas de Segurança e Operação
              </CardTitle>
              <CardDescription>
                Regras para registro, edição e acesso de funcionários
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exigir foto em eventos de perda</Label>
                  <p className="text-sm text-muted-foreground">
                    Impede finalizar uma perda se houver itens sem foto.
                  </p>
                </div>
                <Switch
                  checked={settings.exigirFoto}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, exigirFoto: checked })
                  }
                />
              </div>
              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Bloquear edição após aprovação</Label>
                  <p className="text-sm text-muted-foreground">
                    Impede alterações em eventos já aprovados por gestores.
                  </p>
                </div>
                <Switch
                  checked={settings.bloquearAprovados}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, bloquearAprovados: checked })
                  }
                />
              </div>
              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label>Permitir funcionários na Galeria</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Se ativo, funcionários poderão acessar a aba Galeria e
                    adicionar fotos avulsas.
                  </p>
                </div>
                <Switch
                  checked={settings.permitirFuncionarioGaleria}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      permitirFuncionarioGaleria: checked,
                    })
                  }
                />
              </div>

              <div className="flex justify-end mt-4">
                <Button variant="outline" onClick={handleSaveSettings}>
                  Atualizar Políticas
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Usuários do Sistema
                </CardTitle>
                <CardDescription>
                  Gerencie quem tem acesso e suas funções
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setUserToEdit(null);
                  setShowUserDialog(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Usuário
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-card hover:bg-card border-0 text-[11px] uppercase tracking-wider">
                    <TableHead className="bg-card font-medium">Usuário</TableHead>
                    <TableHead className="bg-card font-medium">Email</TableHead>
                    <TableHead className="bg-card font-medium">Perfil</TableHead>
                    <TableHead className="bg-card font-medium">Status</TableHead>
                    <TableHead className="bg-card font-medium w-25">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const initials = user.nome
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);

                    const isSelf = user.id === currentUser?.id;

                    return (
                      <TableRow
                        key={user.id}
                        className={!user.ativo ? "opacity-60 bg-muted/30" : ""}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              {user.avatarUrl ? (
                                <AvatarImage
                                  src={user.avatarUrl}
                                  alt={user.nome}
                                />
                              ) : null}
                              <AvatarFallback className={roleColors[user.role]}>
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium">{user.nome}</span>
                              {!user.ativo && (
                                <span className="text-[10px] text-destructive font-semibold">
                                  ACESSO BLOQUEADO
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getRoleLabel(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.ativo ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setUserToDelete(user.id)}
                              disabled={isSelf}
                              title={
                                isSelf
                                  ? "Você não pode excluir sua própria conta"
                                  : "Excluir usuário"
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissoes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Permissões de Acesso
              </CardTitle>
              <CardDescription>
                Defina as páginas que cada tipo de usuário pode acessar no menu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {["gestor", "funcionario"].map((role) => {
                const currentPerms =
                  settings.permissoes?.[role] ||
                  (role === "gestor"
                    ? [
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
                      ]
                    : [
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
                      ]);

                const togglePermission = (permission: string) => {
                  const currentRolePerms = [...currentPerms];
                  const hasPerm = currentRolePerms.includes(permission);
                  
                  let newPerms;
                  if (hasPerm) {
                    newPerms = currentRolePerms.filter(p => p !== permission);
                  } else {
                    newPerms = [...currentRolePerms, permission];
                  }

                  setSettings({
                    ...settings,
                    permissoes: {
                      ...(settings.permissoes || {}),
                      [role]: newPerms
                    }
                  });
                };

                const permissionOptions = [
                  { id: "dashboard:ver", label: "Dashboard / Visão Geral" },
                  { id: "evolucoes:ver", label: "Evoluções" },
                  { id: "relatorios:ver", label: "Relatórios" },
                  { id: "eventos:criar", label: "Registrar Perda" },
                  { id: "catalogo:ver", label: "Catálogo" },
                  { id: "categorias:ver", label: "Categorias" },
                  { id: "motivos:ver", label: "Motivos" },
                  { id: "eventos:menu", label: "Eventos" },
                  { id: "galeria:ver", label: "Galeria" },
                  { id: "vendas:ver", label: "Vendas" },
                  { id: "notas:importar", label: "Importação de Nota Fiscal" },
                  { id: "iris:ver", label: "Íris IA" },
                  { id: "perfil:ver", label: "Perfil" },
                ];

                return (
                  <div key={role} className="space-y-4">
                    <h3 className="text-lg font-medium capitalize flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${role === 'gestor' ? 'bg-purple-500' : 'bg-blue-500'}`} />
                      {role}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-4">
                      {permissionOptions.map((opt) => (
                        <div key={opt.id} className="flex items-center space-x-2">
                          <Switch
                            id={`${role}-${opt.id}`}
                            checked={currentPerms.includes(opt.id)}
                            onCheckedChange={() => togglePermission(opt.id)}
                          />
                          <Label htmlFor={`${role}-${opt.id}`}>{opt.label}</Label>
                        </div>
                      ))}
                    </div>
                    <Separator />
                  </div>
                );
              })}
              <div className="flex justify-end mt-4">
                <Button onClick={handleSaveSettings}>
                  Salvar Permissões
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <UserFormDialog
        open={showUserDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowUserDialog(false);
            setUserToEdit(null);
          }
        }}
        userToEdit={userToEdit}
        onSave={handleSaveUser}
        lojas={lojas}
        currentUser={currentUser}
      />

      <AlertDialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação removerá o usuário permanentemente e ele perderá o
              acesso ao sistema. Para apenas bloquear o acesso, edite o usuário
              e desative-o.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </>
  );
}

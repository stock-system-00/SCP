"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, User, Settings } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { updateProfile } from "@/app/actions/perfil";

export default function PerfilPage() {
  const { user, hasPermission, isLoading: isAuthLoading } = useAuth();
  
  const [nome, setNome] = useState(user?.nome || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasPermission("perfil:ver")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-muted-foreground">
          Você não tem permissão para ver ou editar perfis.
        </p>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateProfile({
      nome: nome !== user?.nome ? nome : undefined,
      email: email !== user?.email ? email : undefined,
      password: password ? password : undefined,
    });

    if (result.success) {
      toast.success(result.message);
      setPassword(""); // Limpa a senha após salvar
    } else {
      toast.error(result.message);
    }
    setIsSaving(false);
  };

  return (
    <>
      <PageHeader 
        title="Meu Perfil" 
        description="Gerencie suas informações pessoais e credenciais"
      />

      <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações da Conta
            </CardTitle>
            <CardDescription>
              Atualize seu nome, email ou senha de acesso.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome completo"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha (opcional)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Deixe em branco para manter a atual"
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar Alterações
              </Button>
            </div>
          </CardContent>
        </Card>

        {user?.role === "dono" && (
          <Card className="max-w-2xl mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações do Sistema
              </CardTitle>
              <CardDescription>
                Acesse as configurações globais do sistema e defina permissões.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/configuracoes">
                  Acessar Configurações
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

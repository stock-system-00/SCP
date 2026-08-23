"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { User, UserRole } from "@/lib/types";
import { Loader2, Check } from "lucide-react";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userToEdit: User | null;
  onSave: (data: {
    id?: string;
    nome: string;
    email: string;
    role: UserRole;
    password?: string;
    avatarUrl?: string;
    ativo?: boolean;
    lojasPermitidas?: string[];
  }) => void;
  lojas?: any[];
  currentUser?: any;
}

export function UserFormDialog({
  open,
  onOpenChange,
  userToEdit,
  onSave,
  lojas,
  currentUser,
}: UserFormDialogProps) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("funcionario");
  const [password, setPassword] = useState("");
  const [ativo, setAtivo] = useState(true); // Estado do status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLojas, setSelectedLojas] = useState<string[]>([]);

  // Carrega os dados quando for edição
  useEffect(() => {
    if (userToEdit) {
      setNome(userToEdit.nome);
      setEmail(userToEdit.email);
      setRole(userToEdit.role);
      setAtivo(userToEdit.ativo !== undefined ? userToEdit.ativo : true);
      setPassword("");
      // @ts-ignore
      if (userToEdit.lojasPermitidas) {
        // @ts-ignore
        setSelectedLojas(userToEdit.lojasPermitidas.map((l: any) => l.id || l));
      } else {
        setSelectedLojas([]);
      }
    } else {
      // Reseta para novo usuário
      setNome("");
      setEmail("");
      setRole("funcionario");
      setAtivo(true);
      setPassword("");
      setSelectedLojas([]);
    }
  }, [userToEdit, open]);

  const toggleLoja = (lojaId: string) => {
    setSelectedLojas((prev) =>
      prev.includes(lojaId)
        ? prev.filter((id) => id !== lojaId)
        : [...prev, lojaId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const userData = {
      id: userToEdit?.id,
      nome,
      email,
      role,
      password: password || undefined,
      avatarUrl: userToEdit?.avatarUrl || userToEdit?.avatar,
      ativo, // Envia o status
      lojasPermitidas: selectedLojas,
    };

    await onSave(userData);
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>
            {userToEdit ? "Editar Usuário" : "Novo Usuário"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome Completo</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: João Silva"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail de Acesso</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="joao@empresa.com"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Tipo de Usuário</Label>
            <Select
              value={role}
              onValueChange={(val) => setRole(val as UserRole)}
              disabled={role === "dono"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="funcionario">Funcionário</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
                {}
                {role === "dono" && (
                  <SelectItem value="dono">Proprietário</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {}
          {userToEdit && role !== "dono" && (
            <div className="flex items-center justify-between border p-3 rounded-md">
              <div className="space-y-0.5">
                <Label className="text-base">Acesso Ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Desative para bloquear o login
                </p>
              </div>
              <Switch checked={ativo} onCheckedChange={setAtivo} />
            </div>
          )}

          {/* Seleção de Lojas Permitidas (só para quem não é dono) */}
          {role !== "dono" && lojas && lojas.length > 0 && (
            <div className="grid gap-2 border p-3 rounded-md">
              <Label className="text-base mb-1">Filiais Permitidas</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Selecione as filiais que este usuário poderá acessar. 
                Se não selecionar nenhuma, ele terá acesso a todas as lojas da rede por padrão.
              </p>
              <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-2">
                {lojas.map((loja) => (
                  <label
                    key={loja.id}
                    className="flex items-center space-x-2 cursor-pointer group"
                  >
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
                        selectedLojas.includes(loja.id)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-input"
                      }`}
                    >
                      {selectedLojas.includes(loja.id) && (
                        <Check className="h-3 w-3" />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selectedLojas.includes(loja.id)}
                      onChange={() => toggleLoja(loja.id)}
                    />
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">
                      {loja.nome}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="password">
              {userToEdit ? "Nova Senha (Opcional)" : "Senha Inicial"}
            </Label>
            <Input
              id="password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={userToEdit ? "Manter atual" : "Padrão: 1234"}
            />
            {!userToEdit && !password && (
              <p className="text-[10px] text-muted-foreground">
                Se vazio, será "1234".
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

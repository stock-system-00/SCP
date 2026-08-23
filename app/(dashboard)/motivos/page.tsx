
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";

import {
  getMotivos,
  createMotivo,
  updateMotivo,
  deleteMotivo,
} from "@/app/actions/motivos";
import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  AlertTriangle,
  MessageSquareWarning,
  Loader2,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

const hideScrollClass =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";


type MotivoData = {
  id: string;
  nome: string;
};

export default function MotivosPage() {
  const { hasPermission } = useAuth();
  const [motivos, setMotivos] = useState<MotivoData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Estados para Dialog de Criar/Editar
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMotivo, setEditingMotivo] = useState<MotivoData | null>(null);
  const [formData, setFormData] = useState({ nome: "" });
  const [isSaving, setIsSaving] = useState(false);

  // Estado para Exclusão
  const [motivoToDelete, setMotivoToDelete] = useState<string | null>(null);

  // Carregar dados
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const result = await getMotivos();
    if (result.success && result.data) {
      setMotivos(result.data);
    } else {
      toast.error("Erro ao carregar motivos.");
    }
    setIsLoading(false);
  };

  const filteredMotivos = useMemo(() => {
    if (!searchQuery) return motivos;
    return motivos.filter((m) =>
      m.nome.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [motivos, searchQuery]);

  // --- Handlers ---

  const handleOpenDialog = (motivo?: MotivoData) => {
    if (motivo) {
      setEditingMotivo(motivo);
      setFormData({ nome: motivo.nome });
    } else {
      setEditingMotivo(null);
      setFormData({ nome: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("O texto do motivo é obrigatório.");
      return;
    }

    setIsSaving(true);

    if (editingMotivo) {
      // Editar
      const result = await updateMotivo(editingMotivo.id, formData.nome);
      if (result.success) {
        toast.success("Motivo atualizado!");
        loadData();
        setIsDialogOpen(false);
      } else {
        toast.error(result.message);
      }
    } else {
      // Criar
      const result = await createMotivo(formData.nome);
      if (result.success) {
        toast.success("Motivo criado com sucesso!");
        loadData();
        setIsDialogOpen(false);
      } else {
        toast.error(result.message);
      }
    }

    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (motivoToDelete) {
      const result = await deleteMotivo(motivoToDelete);
      if (result.success) {
        toast.success("Motivo excluído.");
        loadData();
        setMotivoToDelete(null);
      } else {
        toast.error(result.message);
      }
    }
  };

  if (!hasPermission("motivos:ver")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Motivos de Perda"
        description="Padronize as justificativas para os registros de perda."
      >
        {hasPermission("motivos:criar") && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline-block">
              {motivos.length}/15
            </span>
            <Button
              onClick={() => handleOpenDialog()}
              disabled={motivos.length >= 15}
            >
              <Plus className="mr-2 h-4 w-4" /> Novo Motivo
            </Button>
          </div>
        )}
      </PageHeader>

      <main className={`flex flex-col flex-1 space-y-6 px-4 py-5 md:px-8 md:py-6 overflow-hidden ${hideScrollClass}`}>

        {}
        <div className="flex items-center shrink-0  z-10 py-1">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar motivo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {}
        <div className="flex-1 overflow-y-auto border rounded-md p-6 bg-card shadow-sm">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMotivos.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {filteredMotivos.map((motivo) => (
                <div
                  key={motivo.id}
                  className="group flex items-center gap-2 pl-4 pr-2 py-2 rounded-full border bg-background hover:border-primary/50 transition-colors shadow-xs"
                >
                  <span className="font-medium text-sm flex items-center gap-2">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    {motivo.nome}
                  </span>

                  {}
                  {(hasPermission("motivos:editar") ||
                    hasPermission("motivos:excluir")) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full ml-1 text-muted-foreground hover:text-foreground"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {hasPermission("motivos:editar") && (
                            <DropdownMenuItem
                              onClick={() => handleOpenDialog(motivo)}
                            >
                              <Edit className="mr-2 h-3 w-3" /> Editar Texto
                            </DropdownMenuItem>
                          )}
                          {hasPermission("motivos:excluir") && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setMotivoToDelete(motivo.id)}
                            >
                              <Trash2 className="mr-2 h-3 w-3" /> Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquareWarning className="h-12 w-12 mb-4 opacity-20" />
              <p>Nenhum motivo encontrado.</p>
              <p className="text-sm">
                Crie motivos padrão como "Validade", "Avaria", etc.
              </p>
            </div>
          )}
        </div>

        {}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingMotivo ? "Editar Motivo" : "Novo Motivo"}
              </DialogTitle>
              <DialogDescription>
                {editingMotivo
                  ? "Altere o texto do motivo padrão."
                  : "Crie um novo motivo para padronizar os registros."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="nome">Descrição do Motivo</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  placeholder="Ex: Validade Vencida"
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  disabled={isSaving}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {}
        <AlertDialog
          open={!!motivoToDelete}
          onOpenChange={(open) => !open && setMotivoToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir motivo?</AlertDialogTitle>
              <AlertDialogDescription>
                Isso removerá o motivo da lista de sugestões. Registros passados
                não serão alterados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  );
}

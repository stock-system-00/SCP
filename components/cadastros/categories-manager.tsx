"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import {
  getCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
} from "@/app/actions/categorias";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  FolderTree,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";


type CategoriaData = {
  id: string;
  nome: string;
  status: "ativa" | "inativa";
  itemCount?: number;
};

export function CategoriesManager() {
  const { hasPermission } = useAuth();
  const [categorias, setCategorias] = useState<CategoriaData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Dialogs
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoriaData | null>(
    null,
  );
  const [formData, setFormData] = useState({ nome: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Carregar dados
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const result = await getCategorias();
    if (result.success) {
      const formattedData = (result.data as any[]).map((c) => ({
        id: c.id,
        nome: c.nome,
        status: c.status as "ativa" | "inativa",
        itemCount: 0,
      }));
      setCategorias(formattedData);
    } else {
      toast.error("Erro ao carregar categorias.");
    }
    setIsLoading(false);
  };

  const filteredCategorias = useMemo(() => {
    if (!searchQuery) return categorias;
    return categorias.filter((c) =>
      c.nome.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [categorias, searchQuery]);


  const handleOpenDialog = (categoria?: CategoriaData) => {
    if (categoria) {
      setEditingCategory(categoria);
      setFormData({ nome: categoria.nome });
    } else {
      setEditingCategory(null);
      setFormData({ nome: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("O nome da categoria é obrigatório.");
      return;
    }

    setIsSaving(true);

    if (editingCategory) {
      const result = await updateCategoria(
        editingCategory.id,
        formData.nome.trim(),
      );
      if (result.success) {
        toast.success("Categoria atualizada!");
        setIsDialogOpen(false);
        loadData();
      } else {
        toast.error(result.message || "Erro ao atualizar.");
      }
    } else {
      const result = await createCategoria(formData.nome.trim());
      if (result.success) {
        toast.success("Categoria criada!");
        setIsDialogOpen(false);
        loadData();
      } else {
        toast.error(result.message || "Erro ao criar.");
      }
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (categoryToDelete) {
      const result = await deleteCategoria(categoryToDelete);
      if (result.success) {
        toast.success("Categoria excluída.");
        setCategoryToDelete(null);
        loadData();
      } else {
        toast.error(result.message || "Erro ao excluir.");
      }
    }
  };

  if (!hasPermission("categorias:ver")) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4 text-muted-foreground">
        <AlertTriangle className="h-10 w-10" />
        <span className="text-sm">Acesso Restrito</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar categorias..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {hasPermission("categorias:criar") && (
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" /> Nova Categoria
          </Button>
        )}
      </div>

      {}
      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[50%]">Nome</TableHead>
              <TableHead className="text-center w-24">Status</TableHead>
              <TableHead className="text-right w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  <div className="flex justify-center items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredCategorias.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <FolderTree className="h-8 w-8 opacity-20" />
                    <p>Nenhuma categoria encontrada.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredCategorias.map((cat) => (
                <TableRow
                  key={cat.id}
                  className="group hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="font-medium py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <FolderTree className="h-4 w-4" />
                      </div>
                      <span className="truncate">{cat.nome}</span>
                    </div>
                  </TableCell>

                  <TableCell className="text-center py-3">
                    <Badge
                      variant={cat.status === "ativa" ? "secondary" : "outline"}
                      className="text-[10px] uppercase font-bold tracking-wider"
                    >
                      {cat.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right py-3">
                    <div className="flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      {hasPermission("categorias:editar") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-primary hover:bg-primary/10"
                          onClick={() => handleOpenDialog(cat)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {hasPermission("categorias:excluir") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setCategoryToDelete(cat.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-100">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
            <DialogDescription>
              Organize seus produtos agrupando-os por categorias.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome da Categoria</Label>
              <Input
                id="name"
                value={formData.nome}
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
                placeholder="Ex: Bebidas, Laticínios..."
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                disabled={isSaving}
                className="col-span-3"
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
        open={!!categoryToDelete}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Itens vinculados a esta categoria
              poderão ficar sem classificação.
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
    </div>
  );
}

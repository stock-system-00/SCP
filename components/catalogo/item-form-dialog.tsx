"use client";

import { useState, useEffect, useRef } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Item } from "@/lib/types";
import { getCategorias } from "@/app/actions/categorias";
import { Upload, Image as ImageIcon, X, Barcode, Loader2, Link2, Trash2, Plus } from "lucide-react";
import { getItemFornecedores, deleteItemFornecedor, createItemFornecedor } from "@/app/actions/catalogo";
import { toast } from "sonner";

interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
  onSave: (itemData: Partial<Item>) => Promise<void> | void;
}

export function ItemFormDialog({
  open,
  onOpenChange,
  item,
  onSave,
}: ItemFormDialogProps) {
  const isEditing = !!item;
  const fileInputRef = useRef<HTMLInputElement>(null);


  const [formData, setFormData] = useState<Partial<Item>>({});


  const [isSaving, setIsSaving] = useState(false);


  const [categorias, setCategorias] = useState<string[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);


  const [imageTab, setImageTab] = useState<"url" | "upload">("upload");
  const [previewUrl, setPreviewUrl] = useState<string>("");

  // Estados de Fornecedores Vinculados
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [loadingFornecedores, setLoadingFornecedores] = useState(false);
  const [novoCodigo, setNovoCodigo] = useState("");
  const [addingFornecedor, setAddingFornecedor] = useState(false);

  // Carregar categorias ao montar
  useEffect(() => {
    if (open) {
      loadCategorias();
    }
  }, [open]);

  const loadCategorias = async () => {
    setLoadingCategorias(true);
    try {
      const result = await getCategorias();
      if (result.success && result.data) {
        // Mapeia para pegar apenas o nome
        // O tipo vem do Prisma, garantimos que tem 'nome'
        const nomesCategorias = result.data.map(
          (c: { nome: string }) => c.nome,
        );
        setCategorias(nomesCategorias);
      }
    } catch (error) {
      console.error("Erro ao carregar categorias", error);
    }
    setLoadingCategorias(false);
  };


  useEffect(() => {
    if (open) {
      if (item) {
        setFormData(item);
        setPreviewUrl(item.imagemUrl || "");
        setImageTab(item.imagemUrl?.startsWith("blob:") ? "upload" : "url");
        loadFornecedores(item.id);
      } else {
        setFormData({ unidade: "UN", status: "ativo" });
        setPreviewUrl("");
        setImageTab("upload");
        setFornecedores([]);
      }
    }
  }, [open, item]);

  const loadFornecedores = async (itemId: string) => {
    setLoadingFornecedores(true);
    const res = await getItemFornecedores(itemId);
    if (res.success && res.data) {
      setFornecedores(res.data);
    }
    setLoadingFornecedores(false);
  };

  const handleUnlink = async (fornecedorId: string) => {
    const res = await deleteItemFornecedor(fornecedorId);
    if (res.success) {
      toast.success("Vínculo removido com sucesso!");
      setFornecedores(prev => prev.filter(f => f.id !== fornecedorId));
    } else {
      toast.error(res.message || "Erro ao desvincular.");
    }
  };

  const handleAddFornecedor = async () => {
    if (!novoCodigo.trim() || !item?.id) return;
    setAddingFornecedor(true);
    const res = await createItemFornecedor(item.id, novoCodigo);
    if (res.success) {
      toast.success("Código adicionado com sucesso!");
      setNovoCodigo("");
      loadFornecedores(item.id);
    } else {
      toast.error(res.message || "Erro ao adicionar código.");
    }
    setAddingFornecedor(false);
  };

  const handleInputChange = (field: keyof Item, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Manipular Upload de Arquivo Local
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Cria o preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Converte para Base64 para salvar
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        handleInputChange("imagemUrl", base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {

    if (!formData.nome || !formData.categoria || !formData.precoVenda) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);


      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none sm:max-w-2xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[95vh] w-screen sm:w-full p-0 sm:p-6 flex flex-col gap-0 rounded-none sm:rounded-lg overflow-hidden border-0 sm:border">
        <DialogHeader className="p-4 sm:p-0 border-b sm:border-none shrink-0 bg-background z-10">
          <DialogTitle>{isEditing ? "Editar Item" : "Novo Item"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados do produto."
              : "Preencha os dados para cadastrar."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-0 grid gap-6 sm:py-4">
          {}
          <div className="space-y-4 border rounded-lg p-4 bg-muted/10">
            <Label>Imagem do Produto</Label>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {}
              <div className="h-32 w-32 shrink-0 rounded-md border border-dashed bg-muted flex items-center justify-center overflow-hidden relative group self-center sm:self-start">
                {previewUrl ? (
                  <>
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                    <button
                      onClick={() => {
                        setPreviewUrl("");
                        handleInputChange("imagemUrl", "");
                      }}
                      className="absolute top-1 right-1 bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                )}
              </div>

              {}
              <div className="flex-1 w-full">
                <Tabs
                  value={imageTab}
                  onValueChange={(v) => setImageTab(v as any)}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">Upload</TabsTrigger>
                    <TabsTrigger value="url">Link Externo</TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" /> Selecionar
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileSelect}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Suporta JPG, PNG e WebP.
                    </p>
                  </TabsContent>

                  <TabsContent value="url" className="mt-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://exemplo.com/foto.jpg"
                        value={formData.imagemUrl || ""}
                        onChange={(e) => {
                          const url = e.target.value;
                          handleInputChange("imagemUrl", url);
                          setPreviewUrl(url);
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Cole o link direto da imagem.
                    </p>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigoInterno">Código Interno *</Label>
              <Input
                id="codigoInterno"
                value={formData.codigoInterno || ""}
                onChange={(e) =>
                  handleInputChange("codigoInterno", e.target.value)
                }
                placeholder="Ex: 12345"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigoBarras">Código de Barras</Label>
              <div className="relative">
                <Barcode className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="codigoBarras"
                  className="pl-9"
                  value={formData.codigoBarras || ""}
                  onChange={(e) =>
                    handleInputChange("codigoBarras", e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Produto *</Label>
            <Input
              id="nome"
              value={formData.nome || ""}
              onChange={(e) => handleInputChange("nome", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria *</Label>
              <Select
                value={formData.categoria}
                onValueChange={(v) => handleInputChange("categoria", v)}
                disabled={loadingCategorias}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingCategorias ? "Carregando..." : "Selecione"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade *</Label>
              <Select
                value={formData.unidade}
                onValueChange={(v) => handleInputChange("unidade", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UN">UN (Unidade)</SelectItem>
                  <SelectItem value="KG">KG (Quilograma)</SelectItem>
                  <SelectItem value="CX">CX (Caixa)</SelectItem>
                  <SelectItem value="L">L (Litro)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="custo">Custo Unitário (R$) *</Label>
              <Input
                id="custo"
                type="number"
                step="0.01"
                value={formData.custo || ""}
                onChange={(e) =>
                  handleInputChange("custo", parseFloat(e.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="precoVenda">Preço de Venda (R$) *</Label>
              <Input
                id="precoVenda"
                type="number"
                step="0.01"
                value={formData.precoVenda || ""}
                onChange={(e) =>
                  handleInputChange("precoVenda", parseFloat(e.target.value))
                }
              />
            </div>
          </div>
          
          <div className="space-y-2 -mt-2">
            <Label htmlFor="custoMedio">Custo Médio Ponderado (R$)</Label>
            <Input
              id="custoMedio"
              type="number"
              step="0.01"
              value={formData.custoMedio || "0.00"}
              disabled
              className="bg-muted text-muted-foreground font-medium"
            />
          </div>

          {}
          {isEditing && (
            <div className="border-t pt-4 mt-2">
              <Label className="mb-2 block flex items-center gap-2 text-muted-foreground"><Link2 size={16} /> Códigos de Fornecedor (XML)</Label>
              {loadingFornecedores ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Carregando vínculos...</div>
              ) : fornecedores.length === 0 ? (
                <p className="text-sm text-muted-foreground italic bg-surface-2 p-3 rounded-lg border border-dashed">Nenhum código de fornecedor vinculado a este produto.</p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 mt-2">
                  {fornecedores.map(f => (
                    <div key={f.id} className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground text-xs font-mono font-medium px-2.5 py-1 rounded-full border">
                      {f.codigoFornecedor}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleUnlink(f.id);
                        }}
                        className="hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5 transition-colors focus:outline-none"
                        title="Remover vínculo"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2 mb-3">
                Esses códigos são utilizados para reconhecer os itens automaticamente na importação de notas fiscais.
              </p>
              
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="Novo código"
                  value={novoCodigo}
                  onChange={(e) => setNovoCodigo(e.target.value)}
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddFornecedor();
                    }
                  }}
                />
                <Button 
                  type="button" 
                  onClick={handleAddFornecedor} 
                  disabled={!novoCodigo.trim() || addingFornecedor}
                  size="sm"
                  className="h-8"
                >
                  {addingFornecedor ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Adicionar</>}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 sm:p-0 border-t sm:border-none bg-background shrink-0 mt-auto z-10">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
              </>
            ) : isEditing ? (
              "Salvar Alterações"
            ) : (
              "Criar Item"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

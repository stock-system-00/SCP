"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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


import { Item } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { parseItemsCSV } from "@/lib/csv-parser";


import {
  getItens,
  deleteItem,
  deleteItensEmLote,
  toggleItemStatus,
  createItem,
  updateItem,
  importarItens,
  updateItemCustoInline,
  CreateItemData,
} from "@/app/actions/catalogo";
import { getCategorias } from "@/app/actions/categorias";
import { ItemFormDialog } from "@/components/catalogo/item-form-dialog";

import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Package,
  Upload,
  AlertTriangle,
  Barcode,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Trash2,
  Power,
  Loader2,
  Download,
  SlidersHorizontal,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

const ITEMS_PER_PAGE = 15;

const hideScrollClass =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

interface ColumnVisibility {
  codigo: boolean;
  categoria: boolean;
  unidade: boolean;
  custo: boolean;
  preco: boolean;
  status: boolean;
}

const DEFAULT_COLUMNS: ColumnVisibility = {
  codigo: true,
  categoria: true,
  unidade: true,
  custo: true,
  preco: true,
  status: true,
};

function InlineCustoCell({
  item,
  canEdit,
  onUpdateCusto,
}: {
  item: Item;
  canEdit: boolean;
  onUpdateCusto: (id: string, novoCusto: number) => Promise<boolean>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const displayFormatted = formatCurrency(item.custo || 0);

  useEffect(() => {
    if (isEditing) {
      const initial =
        item.custo && item.custo > 0
          ? item.custo.toFixed(2).replace(".", ",")
          : "0,00";
      setValue(initial);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isEditing, item.custo]);

  const handleSave = async () => {
    setIsEditing(false);
    const clean = value.replace(/[^\d.,]/g, "").replace(",", ".");
    const num = parseFloat(clean);
    const finalVal = isNaN(num) || num < 0 ? 0 : Math.round(num * 100) / 100;

    if (finalVal === (item.custo || 0)) {
      return;
    }

    await onUpdateCusto(item.id, finalVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setIsEditing(false);
    }
  };

  if (!canEdit) {
    return (
      <span className="font-mono text-sm text-slate-300 select-none">
        {displayFormatted}
      </span>
    );
  }

  if (isEditing) {
    return (
      <div className="w-full flex justify-end">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-20 bg-transparent text-right font-mono text-sm text-foreground border-b border-primary/70 focus:outline-none p-0 m-0"
        />
      </div>
    );
  }

  return (
    <div className="w-full flex justify-end">
      <span
        onClick={() => setIsEditing(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setIsEditing(true);
        }}
        className="font-mono text-sm text-slate-300 hover:text-primary transition-colors cursor-pointer select-none py-0.5 px-1 rounded hover:bg-white/5"
        title="Clique para editar o custo"
      >
        {displayFormatted}
      </span>
    </div>
  );
}

export default function CatalogoPage() {
  const { hasPermission } = useAuth();


  const [items, setItems] = useState<Item[]>([]);
  const [categoriasList, setCategoriasList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);


  const [searchQuery, setSearchQuery] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todas");
  const [statusFilter, setStatusFilter] = useState<
    "todos" | "ativo" | "inativo"
  >("ativo");
  const [custoFilter, setCustoFilter] = useState<
    "todos" | "sem_custo" | "com_custo"
  >("todos");

  const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>(DEFAULT_COLUMNS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("scp_catalogo_colunas_v1");
      if (saved) {
        setVisibleColumns((prev) => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch {
      // fallback
    }
  }, []);

  const toggleColumn = (key: keyof ColumnVisibility, value: boolean) => {
    setVisibleColumns((prev) => {
      const updated = { ...prev, [key]: value };
      try {
        localStorage.setItem("scp_catalogo_colunas_v1", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };


  const [showNewItemDialog, setShowNewItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Seleção e Exclusão em Lote
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);


  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);


    const catResult = await getCategorias();
    if (catResult.success && catResult.data) {
      setCategoriasList(catResult.data.map((c: any) => c.nome));
    }


    const itemResult = await getItens();
    if (itemResult.success) {
      const mappedItems: Item[] = (itemResult.data as any[]).map((i) => ({
        id: i.id,
        nome: i.nome,
        codigoBarras: i.codigoBarras || "",
        codigoInterno: i.codigoInterno || "",
        categoria: i.categoria?.nome || "Sem Categoria",
        unidade: i.unidade,
        custo: Number(i.custo) || 0,
        custoMedio: Number(i.custoMedio) || 0,
        precoVenda: Number(i.precoVenda),
        status: i.status as "ativo" | "inativo",
        imagemUrl: i.imagemUrl,
      }));
      setItems(mappedItems);
      const validIds = new Set(mappedItems.map((item) => item.id));
      setSelectedItemIds((prev) => prev.filter((id) => validIds.has(id)));
    } else {
      toast.error("Erro ao carregar itens do catálogo.");
    }

    setIsLoading(false);
  };

  const filteredItems = useMemo(() => {
    let filtered = items;
    if (statusFilter !== "todos") {
      filtered = filtered.filter((i) => i.status === statusFilter);
    }
    if (categoriaFilter === "sem_categoria") {
      filtered = filtered.filter(
        (i) => !i.categoria || i.categoria.trim() === "" || i.categoria === "Sem Categoria"
      );
    } else if (categoriaFilter !== "todas") {
      filtered = filtered.filter((i) => i.categoria === categoriaFilter);
    }
    if (custoFilter === "sem_custo") {
      filtered = filtered.filter((i) => !i.custo || Number(i.custo) === 0);
    } else if (custoFilter === "com_custo") {
      filtered = filtered.filter((i) => Boolean(i.custo && Number(i.custo) > 0));
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.nome.toLowerCase().includes(query) ||
          i.codigoInterno.toLowerCase().includes(query) ||
          (i.codigoBarras && i.codigoBarras.includes(query)),
      );
    }
    return filtered;
  }, [items, statusFilter, categoriaFilter, custoFilter, searchQuery]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const paginatedItemIds = useMemo(
    () => paginatedItems.map((i) => i.id),
    [paginatedItems]
  );
  const isAllCurrentPageSelected =
    paginatedItems.length > 0 &&
    paginatedItemIds.every((id) => selectedItemIds.includes(id));
  const isSomeCurrentPageSelected =
    paginatedItemIds.some((id) => selectedItemIds.includes(id)) &&
    !isAllCurrentPageSelected;

  const handleToggleSelectAllPage = () => {
    if (isAllCurrentPageSelected) {
      setSelectedItemIds((prev) =>
        prev.filter((id) => !paginatedItemIds.includes(id))
      );
    } else {
      setSelectedItemIds((prev) =>
        Array.from(new Set([...prev, ...paginatedItemIds]))
      );
    }
  };

  const handleToggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    setSelectedItemIds(filteredItems.map((i) => i.id));
  };

  const handleClearSelection = () => {
    setSelectedItemIds([]);
  };

  const handleBatchDelete = async () => {
    if (selectedItemIds.length === 0) return;
    setIsBatchDeleting(true);
    try {
      const result = await deleteItensEmLote(selectedItemIds);
      if (result.success) {
        toast.success(
          result.message || `${selectedItemIds.length} itens excluídos com sucesso!`
        );
        setSelectedItemIds([]);
        setShowBatchDeleteDialog(false);
        await loadData();
      } else {
        toast.error(result.message || "Erro ao excluir itens em lote.");
      }
    } catch (error) {
      console.error("Erro ao excluir itens em lote:", error);
      toast.error("Erro inesperado ao excluir itens selecionados.");
    } finally {
      setIsBatchDeleting(false);
    }
  };

  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const stats = useMemo(
    () => ({
      total: items.length,
      ativos: items.filter((i) => i.status === "ativo").length,
      inativos: items.filter((i) => i.status === "inativo").length,
      categorias: new Set(items.map((i) => i.categoria)).size,
      semCusto: items.filter((i) => !i.custo || Number(i.custo) === 0).length,
    }),
    [items],
  );

  const handleUpdateCustoInline = async (id: string, novoCusto: number) => {
    try {
      const res = await updateItemCustoInline(id, novoCusto);
      if (res.success) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, custo: novoCusto } : item))
        );
        toast.success("Preço de custo atualizado!");
        return true;
      } else {
        toast.error(res.message || "Erro ao atualizar custo.");
        return false;
      }
    } catch (error) {
      console.error("Erro ao atualizar custo inline:", error);
      toast.error("Erro inesperado ao salvar custo.");
      return false;
    }
  };


  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    toast.info("Lendo arquivo CSV...");

    try {

      const parsedItems = await parseItemsCSV(file);

      if (parsedItems.length === 0) {
        toast.warning("O arquivo parece estar vazio ou inválido.");
        setIsImporting(false);
        return;
      }

      toast.loading(`Importando ${parsedItems.length} itens para o banco...`);


      const result = await importarItens(parsedItems);

      if (result.success) {
        toast.dismiss();
        const msg = [];
        if (result.criados && result.criados > 0) {
          msg.push(`${result.criados} ${result.criados === 1 ? "item cadastrado" : "itens cadastrados"}`);
        }
        if (result.atualizados && result.atualizados > 0) {
          msg.push(`${result.atualizados} ${result.atualizados === 1 ? "atualizado" : "atualizados"}`);
        }
        toast.success(
          msg.length > 0
            ? `${msg.join(" e ")} com sucesso!`
            : "Nenhuma alteração necessária.",
        );
        loadData();
      } else {
        toast.dismiss();
        toast.error(result.message || "Erro ao importar itens.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar o arquivo.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownloadTemplate = () => {
    const headers = "codigoInterno;nome;categoria;unidade;codigoBarras;custo;precoVenda\n";
    const example = "001;PRODUTO EXEMPLO;GERAL;UN;7890000000000;10,50;20,00\n002;OUTRO PRODUTO;GERAL;UN;;15,00;30,00\n";
    
    const blob = new Blob(["\uFEFF" + headers + example], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modelo_importacao_itens.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportarCatalogo = () => {
    if (items.length === 0) {
      toast.warning("Nenhum item disponível para exportação.");
      return;
    }

    const headers = "codigoInterno;nome;categoria;unidade;codigoBarras;custo;precoVenda;status\n";
    const escapeCsv = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return "";
      const str = String(val).replace(/"/g, '""');
      return str.includes(";") || str.includes("\n") || str.includes('"') ? `"${str}"` : str;
    };

    const formatMoneyBr = (val: number | undefined) => {
      if (val === undefined || isNaN(val)) return "0,00";
      return val.toFixed(2).replace(".", ",");
    };

    const itemsParaExportar =
      filteredItems.length > 0 && filteredItems.length < items.length
        ? filteredItems
        : items;

    const rows = itemsParaExportar
      .map((item) => {
        return [
          escapeCsv(item.codigoInterno),
          escapeCsv(item.nome),
          escapeCsv(item.categoria),
          escapeCsv(item.unidade),
          escapeCsv(item.codigoBarras || ""),
          formatMoneyBr(item.custo),
          formatMoneyBr(item.precoVenda),
          escapeCsv(item.status),
        ].join(";");
      })
      .join("\n");

    const blob = new Blob(["\uFEFF" + headers + rows + "\n"], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dataStr = new Date().toISOString().slice(0, 10);
    link.download = `catalogo_produtos_${dataStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`${itemsParaExportar.length} itens exportados com sucesso!`);
  };

  const handleSaveItem = async (itemData: Partial<Item>) => {
    const catResult = await getCategorias();
    const categoriaEncontrada = catResult.data?.find(
      (c: any) => c.nome === itemData.categoria,
    );

    if (!categoriaEncontrada) {
      toast.error("Categoria inválida. Selecione uma categoria existente.");
      return;
    }

    const payload: CreateItemData = {
      nome: itemData.nome || "",
      codigoBarras: itemData.codigoBarras,
      codigoInterno: itemData.codigoInterno,
      unidade: itemData.unidade || "UN",
      preco: itemData.precoVenda || 0,
      custo: itemData.custo || 0,
      categoriaId: categoriaEncontrada.id,
      fotoUrl: itemData.imagemUrl,
    };

    if (editingItem) {
      const result = await updateItem(editingItem.id, payload);
      if (result.success) {
        toast.success("Item atualizado!");
        loadData();
      } else {
        toast.error(result.message);
      }
    } else {
      const result = await createItem(payload);
      if (result.success) {
        toast.success("Item criado com sucesso!");
        loadData();
      } else {
        toast.error(result.message);
      }
    }

    setShowNewItemDialog(false);
    setEditingItem(null);
  };

  const handleToggleStatus = async (item: Item) => {
    const result = await toggleItemStatus(item.id);

    if (result.success) {
      toast.success(`Status do item alterado.`);
      loadData();
    } else {
      toast.error(result.message);
    }
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      const result = await deleteItem(itemToDelete);

      if (result.success) {
        toast.success("Item removido com sucesso");
        setSelectedItemIds((prev) => prev.filter((id) => id !== itemToDelete));
        setItemToDelete(null);
        loadData();
      } else {
        toast.error(result.message);
      }
    }
  };

  if (!hasPermission("catalogo:ver")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
      </div>
    );
  }

  const totalVisibleColumns =
    (hasPermission("catalogo:excluir") ? 1 : 0) +
    1 +
    (visibleColumns.codigo ? 1 : 0) +
    (visibleColumns.categoria ? 1 : 0) +
    (visibleColumns.unidade ? 1 : 0) +
    (visibleColumns.custo ? 1 : 0) +
    (visibleColumns.preco ? 1 : 0) +
    (visibleColumns.status ? 1 : 0) +
    1;

  return (
    <>
      <PageHeader
        title="Catálogo de Itens"
        description="Gerencie os produtos disponíveis"
      >
        <div className="flex gap-2">
          {}
          {hasPermission("catalogo:importar") && (
            <>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
                className="hidden md:inline-flex"
                title="Baixar Modelo de Planilha CSV"
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar Modelo
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="hidden md:inline-flex"
              >
                {isImporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {isImporting ? "Importando..." : "Importar CSV"}
              </Button>
            </>
          )}

          <Button
            variant="outline"
            onClick={handleExportarCatalogo}
            className="hidden md:inline-flex"
            title="Exportar todos os produtos do catálogo para CSV"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar Catálogo
          </Button>

          {hasPermission("catalogo:excluir") && selectedItemIds.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setShowBatchDeleteDialog(true)}
              className="animate-in fade-in-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir em Lote ({selectedItemIds.length})
            </Button>
          )}

          {hasPermission("catalogo:criar") && (
            <Button onClick={() => setShowNewItemDialog(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo Item
            </Button>
          )}
        </div>
      </PageHeader>

      <main className={`flex-1 flex flex-col space-y-4 px-4 py-5 md:px-8 md:py-6 overflow-hidden pb-20 md:pb-6 ${hideScrollClass}`}>
        <div className="hidden md:grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 shrink-0">
          <div className="border rounded-lg p-3 bg-card shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold">
                Total
              </p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
            <Package className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <div className="border rounded-lg p-3 bg-card shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold">
                Ativos
              </p>
              <p className="text-xl font-bold text-success">{stats.ativos}</p>
            </div>
            <Eye className="h-5 w-5 text-success/50" />
          </div>
          <div className="border rounded-lg p-3 bg-card shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold">
                Inativos
              </p>
              <p className="text-xl font-bold text-muted-foreground">
                {stats.inativos}
              </p>
            </div>
            <EyeOff className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <div className="border rounded-lg p-3 bg-card shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold">
                Categorias
              </p>
              <p className="text-xl font-bold">{stats.categorias}</p>
            </div>
            <Grid3X3 className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <button
            type="button"
            onClick={() => {
              setCustoFilter((prev) => (prev === "sem_custo" ? "todos" : "sem_custo"));
              setCurrentPage(1);
            }}
            className={`border rounded-lg p-3 bg-card shadow-sm flex items-center justify-between text-left transition-all hover:border-primary/50 cursor-pointer ${
              custoFilter === "sem_custo"
                ? "ring-1 ring-primary border-primary bg-primary/5"
                : ""
            }`}
            title="Filtrar itens sem preço de custo"
          >
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold">
                Sem Custo
              </p>
              <p className="text-xl font-bold text-slate-300">
                {stats.semCusto}
              </p>
            </div>
            <DollarSign className="h-5 w-5 text-muted-foreground/50" />
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0 z-10 py-1">
          <div className="flex flex-col gap-3 sm:flex-row flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar item..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={categoriaFilter}
              onValueChange={(v) => {
                setCategoriaFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="sem_categoria">Sem Categoria</SelectItem>
                {categoriasList.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as any);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={custoFilter}
              onValueChange={(v: "todos" | "sem_custo" | "com_custo") => {
                setCustoFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Custo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Custos</SelectItem>
                <SelectItem value="sem_custo">Sem Custo ({stats.semCusto})</SelectItem>
                <SelectItem value="com_custo">Com Custo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Colunas
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 p-2">
                <div className="text-xs font-semibold px-2 py-1.5 text-muted-foreground uppercase">
                  Exibir Colunas
                </div>
                <DropdownMenuSeparator />
                {[
                  { id: "codigo" as const, label: "Código" },
                  { id: "categoria" as const, label: "Categoria" },
                  { id: "unidade" as const, label: "Unidade" },
                  { id: "custo" as const, label: "Custo" },
                  { id: "preco" as const, label: "Preço Venda" },
                  { id: "status" as const, label: "Status" },
                ].map((col) => (
                  <label
                    key={col.id}
                    className="flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-accent transition-colors"
                  >
                    <Checkbox
                      checked={visibleColumns[col.id]}
                      onCheckedChange={(checked) =>
                        toggleColumn(col.id, Boolean(checked))
                      }
                    />
                    <span>{col.label}</span>
                  </label>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {selectedItemIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-card/90 border border-primary/30 rounded-xl shadow-md backdrop-blur-md shrink-0 animate-in fade-in-50 slide-in-from-top-1">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge
                variant="secondary"
                className="font-semibold text-xs py-1 px-3 bg-primary/15 text-primary border-primary/30"
              >
                {selectedItemIds.length}{" "}
                {selectedItemIds.length === 1 ? "item selecionado" : "itens selecionados"}
              </Badge>

              {selectedItemIds.length < filteredItems.length && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-muted-foreground hover:text-foreground"
                  onClick={handleSelectAllFiltered}
                >
                  Selecionar todos os {filteredItems.length} itens da busca
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-muted-foreground hover:text-foreground"
                onClick={handleClearSelection}
              >
                Desmarcar todos
              </Button>
            </div>

            {hasPermission("catalogo:excluir") && (
              <Button
                variant="destructive"
                size="sm"
                className="h-8 shadow-sm font-medium"
                onClick={() => setShowBatchDeleteDialog(true)}
                disabled={isBatchDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir Selecionados ({selectedItemIds.length})
              </Button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-hidden border border-border/50 rounded-2xl relative bg-card/40 backdrop-blur-md shadow-sm">
          <div className="absolute inset-0 overflow-y-auto">
            <table className="w-full caption-bottom text-sm border-collapse">
              <TableHeader className="sticky top-0 z-20 bg-card border-b border-border">
                <TableRow className="border-none hover:bg-card">
                  {hasPermission("catalogo:excluir") && (
                    <TableHead className="w-12 px-3 bg-card text-center">
                      <Checkbox
                        checked={
                          isAllCurrentPageSelected
                            ? true
                            : isSomeCurrentPageSelected
                            ? "indeterminate"
                            : false
                        }
                        onCheckedChange={handleToggleSelectAllPage}
                        aria-label="Selecionar todos os itens da página"
                      />
                    </TableHead>
                  )}
                  <TableHead className="w-[30%] text-slate-300 font-medium bg-card">Item</TableHead>
                  {visibleColumns.codigo && (
                    <TableHead className="text-slate-300 font-medium bg-card">Código</TableHead>
                  )}
                  {visibleColumns.categoria && (
                    <TableHead className="text-slate-300 font-medium bg-card">Categoria</TableHead>
                  )}
                  {visibleColumns.unidade && (
                    <TableHead className="text-slate-300 font-medium bg-card">Unidade</TableHead>
                  )}
                  {visibleColumns.custo && (
                    <TableHead className="w-28 text-right text-slate-300 font-medium bg-card">Custo</TableHead>
                  )}
                  {visibleColumns.preco && (
                    <TableHead className="w-28 text-right text-slate-300 font-medium bg-card">Preço</TableHead>
                  )}
                  {visibleColumns.status && (
                    <TableHead className="w-24 text-center text-slate-300 font-medium bg-card">Status</TableHead>
                  )}
                  <TableHead className="w-12.5 text-slate-300 bg-card"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={totalVisibleColumns} className="h-32 text-center">
                      <div className="flex justify-center items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin" /> Carregando
                        itens...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedItems.length > 0 ? (
                  paginatedItems.map((item) => (
                    <TableRow
                      key={item.id}
                      className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                        item.status === "inativo" ? "opacity-60" : ""
                      } ${selectedItemIds.includes(item.id) ? "bg-primary/10 hover:bg-primary/15" : ""}`}
                    >
                      {hasPermission("catalogo:excluir") && (
                        <TableCell className="w-12 px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedItemIds.includes(item.id)}
                            onCheckedChange={() => handleToggleSelectItem(item.id)}
                            aria-label={`Selecionar ${item.nome}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="py-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {item.nome}
                          </p>
                          {item.codigoBarras && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Barcode className="h-3 w-3" />{" "}
                              {item.codigoBarras}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      {visibleColumns.codigo && (
                        <TableCell className="py-2 font-mono text-xs">
                          {item.codigoInterno}
                        </TableCell>
                      )}
                      {visibleColumns.categoria && (
                        <TableCell className="py-2 text-xs">
                          {item.categoria}
                        </TableCell>
                      )}
                      {visibleColumns.unidade && (
                        <TableCell className="py-2 text-xs">
                          {item.unidade}
                        </TableCell>
                      )}
                      {visibleColumns.custo && (
                        <TableCell className="w-28 py-2 text-right">
                          <InlineCustoCell
                            item={item}
                            canEdit={hasPermission("catalogo:editar")}
                            onUpdateCusto={handleUpdateCustoInline}
                          />
                        </TableCell>
                      )}
                      {visibleColumns.preco && (
                        <TableCell className="w-28 py-2 text-right text-sm font-medium text-slate-200">
                          {formatCurrency(item.precoVenda)}
                        </TableCell>
                      )}
                      {visibleColumns.status && (
                        <TableCell className="py-2 text-center">
                          <Badge
                            variant={
                              item.status === "ativo" ? "outline" : "secondary"
                            }
                            className={`text-[10px] h-5 ${item.status === 'ativo' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/10 text-slate-400'}`}
                          >
                            {item.status === "ativo" ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell className="py-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-xl hover:bg-white/10"
                            >
                              <MoreVertical className="h-4 w-4 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {hasPermission("catalogo:editar") && (
                              <DropdownMenuItem
                                onClick={() => setEditingItem(item)}
                              >
                                <Edit className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                            )}

                            {hasPermission("catalogo:status") && (
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(item)}
                              >
                                <Power className="mr-2 h-4 w-4" />
                                {item.status === "ativo" ? "Desativar" : "Ativar"}
                              </DropdownMenuItem>
                            )}

                            {hasPermission("catalogo:excluir") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setItemToDelete(item.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={totalVisibleColumns} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Search className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">
                          Nenhum item encontrado
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between shrink-0 pt-2 border-t mt-auto">
          <p className="text-xs text-muted-foreground">
            {paginatedItems.length} de {filteredItems.length} itens
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-xs font-medium px-2">
              Pág {currentPage} de {Math.max(1, totalPages)}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ItemFormDialog
          open={showNewItemDialog || !!editingItem}
          onOpenChange={(open) => {
            if (!open) {
              setShowNewItemDialog(false);
              setEditingItem(null);
            }
          }}
          item={editingItem}
          onSave={handleSaveItem}
        />

        <AlertDialog
          open={!!itemToDelete}
          onOpenChange={(open) => !open && setItemToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Essa ação excluirá permanentemente o item do catálogo e não poderá
                ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                Excluir Item
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={showBatchDeleteDialog}
          onOpenChange={(open) => !isBatchDeleting && setShowBatchDeleteDialog(open)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Excluir {selectedItemIds.length}{" "}
                {selectedItemIds.length === 1 ? "item" : "itens"} em lote?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 pt-2 text-sm text-foreground/80">
                  <p>
                    Você está prestes a excluir permanentemente{" "}
                    <strong className="text-destructive font-semibold">
                      {selectedItemIds.length}{" "}
                      {selectedItemIds.length === 1 ? "produto" : "produtos"}
                    </strong>{" "}
                    do catálogo da sua filial.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Esta ação não poderá ser desfeita e removerá os produtos das listagens.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isBatchDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleBatchDelete();
                }}
                disabled={isBatchDeleting}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium"
              >
                {isBatchDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  `Excluir Definitivamente (${selectedItemIds.length})`
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  );
}

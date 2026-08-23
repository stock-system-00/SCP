"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Search, Package, X, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Item } from "@/lib/types";

import { getItens } from "@/app/actions/catalogo";
import { cn } from "@/lib/utils";


function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

interface ItemSearchProps {
  onSelect: (item: Item | null) => void;
  selectedItem: Item | null;
  className?: string;
}

export function ItemSearch({
  onSelect,
  selectedItem,
  className,
}: ItemSearchProps) {
  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [allItems, setAllItems] = useState<Item[]>([]);

  // Carrega itens UMA VEZ ao montar (do Banco de Dados)
  useEffect(() => {
    async function fetchItems() {
      try {
        const result = await getItens();
        if (result.success && result.data) {
          // Mapeia para garantir compatibilidade de tipos se necessário
          const mappedItems: Item[] = (result.data as any[]).map((i) => ({
            id: i.id,
            nome: i.nome,
            codigoInterno: i.codigoInterno || "",
            codigoBarras: i.codigoBarras || "",
            categoria: i.categoria?.nome || "",
            unidade: i.unidade,
            custo: Number(i.custo) || 0,
            precoVenda: Number(i.precoVenda) || 0,
            status: i.status,
            imagemUrl: i.fotoUrl, // Importante: Mapear fotoUrl para imagemUrl
          }));
          setAllItems(mappedItems);
        }
      } catch (error) {
        console.error("Erro ao carregar itens para busca:", error);
      }
    }
    fetchItems();
  }, []);

  // Lógica de Debounce (espera usuário parar de digitar)
  useEffect(() => {
    // Se estiver vazio, limpa imediatamente
    if (!inputValue.trim()) {
      setDebouncedQuery("");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue);
      setIsLoading(false);
    }, 500); // 500ms de delay

    return () => clearTimeout(timer);
  }, [inputValue]);

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  const filteredItems = useMemo(() => {
    if (!debouncedQuery) return [];

    const normalizedQuery = normalizeText(debouncedQuery);

    return allItems
      .filter((item) => {
        if (item.status !== "ativo") return false;

        const normNome = normalizeText(item.nome);
        const normCod = normalizeText(item.codigoInterno);
        const normBarra = item.codigoBarras
          ? normalizeText(item.codigoBarras)
          : "";

        return (
          normNome.includes(normalizedQuery) ||
          normCod.includes(normalizedQuery) ||
          normBarra.includes(normalizedQuery)
        );
      })
      .slice(0, 50); // Limita a 50 resultados para não travar a renderização
  }, [debouncedQuery, allItems]);

  const handleSelect = (item: Item) => {
    onSelect(item);
    setInputValue("");
    setDebouncedQuery("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setInputValue("");
    setDebouncedQuery("");
  };

  // --- MODO: ITEM SELECIONADO ---
  if (selectedItem) {
    return (
      <div className={cn("relative flex items-center h-10", className)}>
        <div className="flex h-full w-full items-center justify-between rounded-md border border-primary/30 bg-primary/10 px-3 text-sm">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-3 w-3" />
            </div>
            <span className="truncate font-medium">{selectedItem.nome}</span>
            <span className="text-muted-foreground text-xs hidden sm:inline-block">
              ({selectedItem.codigoInterno})
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 ml-2 hover:bg-destructive/10 hover:text-destructive rounded-full"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }


  return (
    <div className={cn("relative h-10", className)} ref={containerRef}>
      <div className="relative h-full">
        {isLoading ? (
          <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}

        <Input
          placeholder="Digite para buscar (ex: pão)..."
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-9 h-full bg-background"
        />
      </div>

      {isOpen && inputValue.length > 0 && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 rounded-md border bg-popover shadow-md overflow-hidden">
          {}
          <div className="max-h-60 overflow-y-auto overscroll-contain py-1">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Buscando...
              </div>
            ) : filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors border-b last:border-0 border-border/30"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted border text-muted-foreground">
                    {item.imagemUrl ? (
                      <img
                        src={item.imagemUrl}
                        alt=""
                        className="h-full w-full object-cover rounded"
                      />
                    ) : (
                      <Package className="h-4 w-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm leading-tight">
                      {item.nome}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="font-mono bg-muted px-1 rounded">
                        {item.codigoInterno}
                      </span>
                      {item.codigoBarras && (
                        <span className="truncate max-w-25">
                          {item.codigoBarras}
                        </span>
                      )}
                    </div>
                  </div>

                  <Badge
                    variant="secondary"
                    className="text-[10px] h-5 px-1.5 shrink-0"
                  >
                    {item.unidade}
                  </Badge>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhum item encontrado para "{debouncedQuery}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

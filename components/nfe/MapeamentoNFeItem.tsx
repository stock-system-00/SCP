"use client";

import React, { useState } from "react";
import { Check, ChevronsUpDown, PackageSearch, AlertCircle, Link2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { mapItemToCatalog, unmapItemFromCatalog } from "@/app/actions/nfe-import";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface CatalogoItem {
  id: string;
  nome: string;
  codigoInterno: string;
}

export function MapeamentoNFeItem({
  nfeItem,
  catalogo,
  isPendente
}: {
  nfeItem: any;
  catalogo: CatalogoItem[];
  isPendente: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isMapping, setIsMapping] = useState(false);

  const handleMap = async (catalogoItemId: string) => {
    setOpen(false);
    setIsMapping(true);

    try {
      const res = await mapItemToCatalog(nfeItem.id, catalogoItemId, nfeItem.codigoFornecedor);
      if (res.success) {
        toast.success(`Item "${nfeItem.descricaoFornecedor}" vinculado com sucesso!`);
      } else {
        toast.error(res.error || "Erro ao vincular item.");
      }
    } catch (err) {
      toast.error("Erro inesperado ao vincular item.");
    } finally {
      setIsMapping(false);
    }
  };

  const handleUnmap = async () => {
    if (!nfeItem.item) return;
    setIsMapping(true);

    try {
      const res = await unmapItemFromCatalog(nfeItem.id, nfeItem.item.id, nfeItem.codigoFornecedor);
      if (res.success) {
        toast.success(`Vínculo removido com sucesso!`);
      } else {
        toast.error(res.error || "Erro ao desvincular item.");
      }
    } catch (err) {
      toast.error("Erro inesperado ao desvincular item.");
    } finally {
      setIsMapping(false);
    }
  };

  const formater = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className={cn(
      "p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors",
      isPendente ? "bg-orange-500/5 hover:bg-orange-500/10" : "bg-transparent hover:bg-surface-2"
    )}>
      {}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          {isPendente && (
            <AlertCircle size={16} className="text-orange-500" />
          )}
          <span className="font-semibold text-foreground text-sm">
            {nfeItem.descricaoFornecedor}
          </span>
          <span className="text-xs text-muted-foreground bg-surface-2 px-2 py-0.5 rounded-md border font-mono">
            {nfeItem.codigoFornecedor}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground ml-6">
          <span>Qtd: <b className="text-foreground">{Number(nfeItem.quantidade).toFixed(2)} {nfeItem.unidade}</b></span>
          <span>Custo Un.: <b className="text-foreground">{formater.format(Number(nfeItem.valorUnitario))}</b></span>
          <span>Custo Total: <b className="text-foreground">{formater.format(Number(nfeItem.valorTotal))}</b></span>
        </div>
      </div>

      {}
      <div className="flex-shrink-0 w-full md:w-auto md:min-w-[300px]">
        {isMapping ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 border rounded-xl bg-surface opacity-70">
            <Loader2 size={16} className="animate-spin" /> Vinculando...
          </div>
        ) : isPendente ? (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                role="combobox"
                aria-expanded={open}
                className="w-full flex items-center justify-between gap-2 p-2.5 px-4 text-sm text-left border rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
              >
                <div className="flex items-center gap-2 truncate">
                  <Link2 size={16} />
                  <span className="truncate">Vincular a um produto interno...</span>
                </div>
                <ChevronsUpDown size={16} className="opacity-50 flex-shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] md:w-[400px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Pesquisar catálogo por nome ou código..." />
                <CommandList>
                  <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                  <CommandGroup>
                    {catalogo.map((catItem) => (
                      <CommandItem
                        key={catItem.id}
                        value={catItem.nome + " " + catItem.codigoInterno}
                        onSelect={() => handleMap(catItem.id)}
                        className="flex flex-col items-start py-2 cursor-pointer"
                      >
                        <span className="font-medium">{catItem.nome}</span>
                        <span className="text-xs text-muted-foreground">Código: {catItem.codigoInterno}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        ) : (
          <div className="w-full flex items-center gap-3 p-2 px-4 text-sm text-left border rounded-xl bg-surface-2 text-foreground relative group">
            <PackageSearch size={18} className="text-emerald-500 shrink-0" />
            <div className="truncate flex-1">
              <p className="font-medium truncate line-clamp-1">{nfeItem.item?.nome}</p>
              <p className="text-xs text-muted-foreground">Código Interno: {nfeItem.item?.codigoInterno}</p>
            </div>

            <button
              onClick={handleUnmap}
              className="absolute right-2 opacity-0 group-hover:opacity-100 transition-all p-1.5 hover:bg-red-500 hover:text-white rounded-md"
              title="Desvincular item"
            >
              <Link2 size={16} className="rotate-45" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

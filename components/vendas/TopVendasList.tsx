"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Loader2, LayoutGrid, List } from "lucide-react";
import { brl, num } from "@/lib/format";
import { useIsMobile } from "@/components/ui/use-mobile";
import { getTopVendasGerais } from "@/app/actions/dashboard";

export type TopVendaItem = {
  itemId: string;
  codigoInterno: string;
  nome: string;
  unidade: string;
  quantidade: number;
  receita: number;
};

function Content({ ranking, isLoading }: { ranking: TopVendaItem[], isLoading: boolean }) {
  const [topN, setTopN] = useState(10);
  const [viewMode, setViewMode] = useState<"table" | "block">("table");
  const displayedRanking = ranking.slice(0, topN);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex flex-wrap items-center justify-between p-4 border-b shrink-0 gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Mostrar:</span>
          <Select value={topN.toString()} onValueChange={(val) => setTopN(Number(val))}>
            <SelectTrigger className="h-8 w-[90px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Top 5</SelectItem>
              <SelectItem value="10">Top 10</SelectItem>
              <SelectItem value="15">Top 15</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-1 rounded-md border p-1 bg-muted/20">
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-sm transition-colors ${viewMode === "table" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            title="Visualização em tabela"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("block")}
            className={`p-1.5 rounded-sm transition-colors ${viewMode === "block" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            title="Visualização em blocos"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4 h-full min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Carregando ranking...</p>
          </div>
        ) : displayedRanking.length === 0 ? (
           <div className="py-12 text-center text-sm text-muted-foreground">Nenhuma venda registrada.</div>
        ) : viewMode === "table" ? (
          <div className="overflow-x-hidden w-full">
            <Table className="text-sm w-full table-fixed">
              <TableHeader>
                <TableRow className="bg-muted/50 text-[11px] uppercase tracking-wider hover:bg-muted/50 border-0">
                  <TableHead className="w-8 px-1 text-center font-medium">#</TableHead>
                  <TableHead className="w-16 font-medium text-left hidden sm:table-cell">Cód.</TableHead>
                  <TableHead className="font-medium text-left">Produto</TableHead>
                  <TableHead className="w-20 font-medium text-right px-1">Qtd.</TableHead>
                  <TableHead className="w-[85px] sm:w-28 font-medium text-right pr-4">Receita (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="tabular-nums">
                {displayedRanking.map((item, idx) => (
                    <TableRow key={item.itemId}>
                      <TableCell className="text-center px-1 py-2.5 font-medium text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="py-2.5 text-muted-foreground font-mono text-xs truncate hidden sm:table-cell">
                        {item.codigoInterno}
                      </TableCell>
                      <TableCell className="py-2.5 max-w-0 truncate font-medium text-xs sm:text-sm" title={item.nome}>
                        {item.nome}
                      </TableCell>
                      <TableCell className="py-2.5 px-1 text-right font-medium whitespace-nowrap">
                        {num(item.quantidade)}
                      </TableCell>
                      <TableCell className="py-2.5 text-right pr-4 text-positive whitespace-nowrap">
                        {brl(item.receita)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
             {displayedRanking.map((item, idx) => (
                <div key={item.itemId} className="flex flex-col p-4 rounded-xl border bg-card shadow-sm gap-3">
                   <div className="flex justify-between items-start gap-3">
                      <div className="flex items-start gap-2">
                        <span className="flex shrink-0 items-center justify-center h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-[11px] font-bold text-amber-600 dark:text-amber-500 mt-0.5">{idx + 1}</span>
                        <span className="text-xs font-mono text-muted-foreground break-all leading-relaxed">{item.codigoInterno}</span>
                      </div>
                      <span className="text-sm font-semibold text-positive shrink-0 whitespace-nowrap">{brl(item.receita)}</span>
                   </div>
                   <h4 className="text-sm font-medium leading-relaxed">{item.nome}</h4>
                   <div className="flex justify-between items-end mt-auto pt-2 border-t border-border/50">
                     <span className="text-xs text-muted-foreground">Qtd. Vendida</span>
                     <span className="text-sm font-bold">{num(item.quantidade)} <span className="text-[11px] text-muted-foreground font-medium">{item.unidade}</span></span>
                   </div>
                </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function TopVendasList() {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  
  const { data, isLoading } = useSWR(
    open ? "top_vendas" : null,
    async () => {
      const result = await getTopVendasGerais();
      if (!result.success) throw new Error(result.error);
      return result.data as TopVendaItem[];
    },
    { revalidateOnFocus: false }
  );

  const ranking = data || [];

  const TriggerButton = (
    <Button variant="outline" size="sm" className="gap-2 text-amber-600 dark:text-amber-500 border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-medium">
      <Trophy className="h-4 w-4" />
      <span className="hidden sm:inline">Mais Vendidos</span>
      <span className="sm:hidden">Top</span>
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{TriggerButton}</DrawerTrigger>
        <DrawerContent className="h-[85vh] flex flex-col">
          <DrawerHeader className="border-b pb-4 shrink-0 text-left">
            <DrawerTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Produtos Mais Vendidos
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden">
            <Content ranking={ranking} isLoading={isLoading} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{TriggerButton}</DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-amber-500" />
            Produtos Mais Vendidos
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden flex flex-col">
          <Content ranking={ranking} isLoading={isLoading} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

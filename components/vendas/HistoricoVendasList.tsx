"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileSpreadsheet, Search, Trash2 } from "lucide-react";
import { deleteVenda } from "@/app/actions/import-vendas";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

interface VendaResumo {
  id: string;
  data: Date;
  dataImportacao: Date;
  totalItens: number;
  valorTotal: number;
}

export function HistoricoVendasList({ vendas }: { vendas: VendaResumo[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const itemsPerPage = 10;

  // Filtro
  const filteredVendas = vendas.filter(v => {
    if (!searchTerm) return true;
    const dateStr = format(new Date(v.data), "dd/MM/yyyy");
    return dateStr.includes(searchTerm);
  });


  const totalPages = Math.ceil(filteredVendas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVendas = filteredVendas.slice(startIndex, startIndex + itemsPerPage);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const [vendaToDelete, setVendaToDelete] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!vendaToDelete) return;
    
    setIsDeleting(vendaToDelete);
    try {
      const result = await deleteVenda(vendaToDelete);
      if (result.success) {
        toast.success("Importação excluída com sucesso!");
      } else {
        toast.error(result.error || "Erro ao excluir importação.");
      }
    } catch (error) {
      toast.error("Erro inesperado ao excluir importação.");
    } finally {
      setIsDeleting(null);
      setVendaToDelete(null);
    }
  };

  return (
    <div className="bg-surface border rounded-2xl shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 md:p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Histórico de Importações</h3>
          <p className="text-sm text-muted-foreground">Vendas processadas anteriormente</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Buscar por data (dd/mm)..." 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
          />
        </div>
      </div>

      <div className="">
        {paginatedVendas.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
            <FileSpreadsheet className="w-10 h-10 mb-3 opacity-20" />
            <p>Nenhuma importação encontrada.</p>
          </div>
        ) : (
          <>
            {}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-surface-2/50 text-muted-foreground border-b">
                  <tr>
                    <th className="px-6 py-4 font-medium">Data das Vendas</th>
                    <th className="px-6 py-4 font-medium">Importado em</th>
                    <th className="px-6 py-4 font-medium text-right">Qtd. Itens Diferentes</th>
                    <th className="px-6 py-4 font-medium text-right">Valor Total</th>
                    <th className="px-6 py-4 font-medium text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedVendas.map((v) => (
                    <tr key={v.id} className="hover:bg-surface-2 transition-colors group cursor-pointer" onClick={() => window.location.href = `/vendas/${v.id}`}>
                      <td className="px-6 py-4 font-medium whitespace-nowrap">
                        {format(new Date(v.data), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {format(new Date(v.dataImportacao), "dd/MM/yy 'às' HH:mm")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {v.totalItens}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(v.valorTotal)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link 
                            href={`/vendas/${v.id}`}
                            className="text-primary hover:underline font-medium"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Ver Detalhes
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setVendaToDelete(v.id);
                            }}
                            disabled={isDeleting === v.id}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Excluir Importação"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {}
            <div className="md:hidden flex flex-col gap-4 p-4 bg-background/50">
              {paginatedVendas.map((v) => (
                <Link 
                  key={v.id} 
                  href={`/vendas/${v.id}`}
                  className="block group"
                >
                  <div className="bg-surface border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary/50 active:scale-[0.98] active:bg-surface-2 transition-all flex flex-col gap-2 relative">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-lg">{format(new Date(v.data), "dd 'de' MMMM, yyyy", { locale: ptBR })}</h4>
                        <p className="text-xs text-muted-foreground">Importado em {format(new Date(v.dataImportacao), "dd/MM/yy 'às' HH:mm")}</p>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setVendaToDelete(v.id);
                        }}
                        disabled={isDeleting === v.id}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 -mt-1 -mr-1 z-10 relative"
                        title="Excluir Importação"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Itens Diferentes</span>
                        <span className="font-semibold">{v.totalItens}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Valor Total</span>
                        <span className="font-semibold text-green-600 dark:text-green-400 text-lg">{formatCurrency(v.valorTotal)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t flex items-center justify-between text-sm text-muted-foreground bg-surface/50">
          <div>
            Página {currentPage} de {totalPages}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 border rounded-lg hover:bg-surface disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border rounded-lg hover:bg-surface disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {}
      <AlertDialog open={!!vendaToDelete} onOpenChange={(open) => !open && setVendaToDelete(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Importação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Você removerá permanentemente os dados de vendas deste dia. 
              Isso pode impactar diretamente seus relatórios financeiros e de estoque.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Sim, Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

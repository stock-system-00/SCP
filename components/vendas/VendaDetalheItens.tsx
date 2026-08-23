"use client";

import React, { useState } from "react";
import { Search, ChevronLeft, ChevronRight, PackageOpen } from "lucide-react";

interface VendaItemDetalhe {
  id: string;
  item: {
    nome: string;
    codigoInterno: string;
  };
  quantidade: number;
  valorLiquido: number;
  precoMedio: number;
}

export function VendaDetalheItens({ itens }: { itens: VendaItemDetalhe[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 15;

  const filtered = itens.filter(i => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return i.item.nome.toLowerCase().includes(term) || i.item.codigoInterno.toLowerCase().includes(term);
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="bg-surface border rounded-2xl shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="font-semibold">Produtos Vendidos</h3>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar produto ou código..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        {paginated.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
            <PackageOpen className="w-10 h-10 mb-3 opacity-20" />
            <p>Nenhum produto encontrado.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-2/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Cód.</th>
                <th className="px-6 py-4 font-medium">Produto</th>
                <th className="px-6 py-4 font-medium text-right">Qtd</th>
                <th className="px-6 py-4 font-medium text-right">Preço Médio</th>
                <th className="px-6 py-4 font-medium text-right">Valor Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginated.map((row) => (
                <tr key={row.id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-6 py-3 text-muted-foreground">{row.item.codigoInterno}</td>
                  <td className="px-6 py-3 font-medium">{row.item.nome}</td>
                  <td className="px-6 py-3 text-right">{row.quantidade}</td>
                  <td className="px-6 py-3 text-right text-muted-foreground">{formatCurrency(row.precoMedio)}</td>
                  <td className="px-6 py-3 text-right font-medium text-green-600 dark:text-green-400">
                    {formatCurrency(row.valorLiquido)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </div>
  );
}

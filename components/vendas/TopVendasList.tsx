"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy } from "lucide-react";
import { brl, num } from "@/lib/format";

export type TopVendaItem = {
  itemId: string;
  codigoInterno: string;
  nome: string;
  unidade: string;
  quantidade: number;
  receita: number;
};

interface TopVendasListProps {
  ranking: TopVendaItem[];
}

export function TopVendasList({ ranking }: TopVendasListProps) {
  const [topN, setTopN] = useState(10);

  const displayedRanking = ranking.slice(0, topN);

  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          Produtos Mais Vendidos
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">Mostrar:</span>
          <Select value={topN.toString()} onValueChange={(val) => setTopN(Number(val))}>
            <SelectTrigger className="h-8 w-[100px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Top 5</SelectItem>
              <SelectItem value="10">Top 10</SelectItem>
              <SelectItem value="20">Top 20</SelectItem>
              <SelectItem value="50">Top 50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="text-sm w-full">
            <TableHeader>
              <TableRow className="bg-card text-[11px] uppercase tracking-wider hover:bg-card border-0">
                <TableHead className="w-12 text-center bg-card font-medium">#</TableHead>
                <TableHead className="bg-card font-medium text-left">Código</TableHead>
                <TableHead className="bg-card font-medium text-left">Produto</TableHead>
                <TableHead className="bg-card font-medium text-right">Qtd. Vendida</TableHead>
                <TableHead className="bg-card font-medium text-right pr-4">Receita (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="tabular-nums">
              {displayedRanking.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    Nenhuma venda registrada.
                  </TableCell>
                </TableRow>
              ) : (
                displayedRanking.map((item, idx) => (
                  <TableRow key={item.itemId}>
                    <TableCell className="text-center py-2.5 font-medium text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="py-2.5 text-muted-foreground font-mono text-xs">
                      {item.codigoInterno}
                    </TableCell>
                    <TableCell className="py-2.5 max-w-[200px] truncate">
                      {item.nome}
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-medium">
                      {num(item.quantidade)} <span className="text-[10px] text-muted-foreground font-normal">{item.unidade}</span>
                    </TableCell>
                    <TableCell className="py-2.5 text-right pr-4 text-positive">
                      {brl(item.receita)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

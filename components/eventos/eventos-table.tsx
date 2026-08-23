
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreVertical, Eye, Trash2, Lock } from "lucide-react";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Evento, EventoStatus } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

interface EventosTableProps {
  data: Evento[];
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onViewDetails: (evento: Evento) => void;
}

export function EventosTable({
  data,
  onStatusChange,
  onDelete,
  onViewDetails,
}: EventosTableProps) {
  const { hasPermission, settings } = useAuth();

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border border-dashed rounded-lg bg-muted/5">
        Nenhum item corresponde aos filtros.
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-card hover:bg-card border-0 text-[11px] uppercase tracking-wider">
            <TableHead className="bg-card font-medium">Data</TableHead>
            <TableHead className="bg-card font-medium">Código</TableHead>
            <TableHead className="bg-card font-medium">Produto</TableHead>
            <TableHead className="bg-card font-medium text-right">Qtd.</TableHead>
            <TableHead className="bg-card font-medium text-right">Total</TableHead>
            <TableHead className="bg-card font-medium w-40">Status</TableHead>
            <TableHead className="bg-card font-medium w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((evento) => {
            const isLocked =
              settings?.bloquearAprovados && evento.status === "aprovado";

            return (
              <TableRow key={evento.id}>
                <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                  {formatDate(evento.dataHora)}
                </TableCell>
                <TableCell
                  className="font-mono text-xs text-muted-foreground cursor-pointer transition-colors hover:text-foreground"
                  title="Clique para copiar"
                  onClick={() => {
                    if (evento.item?.codigoInterno) {
                      navigator.clipboard.writeText(evento.item.codigoInterno);
                      toast.success("Código copiado!");
                    }
                  }}
                >
                  {evento.item?.codigoInterno}
                </TableCell>
                <TableCell className="font-medium text-sm">
                  {evento.item?.nome}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {evento.quantidade} {evento.unidade}
                </TableCell>
                <TableCell className="text-right text-sm font-medium">
                  {formatCurrency(
                    (evento.custoSnapshot || 0) * evento.quantidade,
                  )}
                </TableCell>
                <TableCell>
                  <Select
                    value={
                      evento.status === "enviado" ||
                        evento.status === "rascunho"
                        ? "pendente"
                        : evento.status
                    }
                    onValueChange={(v) =>
                      onStatusChange(
                        evento.id,
                        v === "pendente" ? "enviado" : v,
                      )
                    }
                    disabled={isLocked || !hasPermission("eventos:editar")}
                  >
                    <SelectTrigger
                      className={`h-8 w-full ${getStatusColor(
                        evento.status as EventoStatus,
                      )} border-transparent text-xs ${isLocked ? "opacity-70 cursor-not-allowed" : ""
                        }`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    {hasPermission("eventos:editar") && (
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="aprovado">Aprovado</SelectItem>
                        <SelectItem value="rejeitado">Rejeitado</SelectItem>
                      </SelectContent>
                    )}
                  </Select>
                </TableCell>
                <TableCell>
                  {hasPermission("eventos:excluir") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${isLocked
                          ? "opacity-50 cursor-not-allowed text-muted-foreground"
                          : "text-destructive hover:text-destructive hover:bg-destructive/10"
                        }`}
                      disabled={isLocked}
                      onClick={() => !isLocked && onDelete(evento.id)}
                      title="Excluir evento"
                    >
                      {isLocked ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

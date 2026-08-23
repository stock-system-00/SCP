
"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
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
import { Evento, EventoStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import {
  getEventos,
  updateEventoStatus,
  deleteEvento,
  toggleNfeEmitidaLote,
} from "@/app/actions/eventos";

import {
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";
import { isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Button } from "@/components/ui/button";


import { EventosToolbar } from "@/components/eventos/eventos-toolbar";
import {
  EventosGrid,
  LoteDiario,
  BatchStatus,
} from "@/components/eventos/eventos-grid";
import { EventosTable } from "@/components/eventos/eventos-table";
import { PageHeader } from "@/components/PageHeader";

type ViewMode = "pastas" | "lista-completa";

const hideScrollClass =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

export default function EventosPage() {
  const { hasPermission } = useAuth();

  const [loteSelecionado, setLoteSelecionado] = useState<LoteDiario | null>(
    null,
  );
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [globalSearch, setGlobalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [eventoToDelete, setEventoToDelete] = useState<string | null>(null);

  const fetcher = async () => {
    const result = await getEventos();
    if (!result.success) throw new Error((result as any).error || (result as any).message || "Erro ao carregar");
    
    const mappedEventos: Evento[] = (result.data as any[]).map((ev) => ({
      id: ev.id,
      dataHora: ev.dataHora,
      motivo: ev.motivo,
      status: ev.status as EventoStatus,
      quantidade: Number(ev.quantidade),
      unidade: ev.unidade,
      custoSnapshot: Number(ev.custoSnapshot),
      precoVendaSnapshot: Number(ev.precoVendaSnapshot),
      item: ev.item
        ? {
            id: ev.item.id,
            nome: ev.item.nome,
            codigoInterno: ev.item.codigoInterno,
            codigoBarras: ev.item.codigoBarras,
            categoria: ev.item.categoria?.nome || "Sem Categoria",
            unidade: ev.item.unidade,
            custo: Number(ev.item.custo),
            precoVenda: Number(ev.item.precoVenda),
            status: ev.item.status,
            imagemUrl: ev.item.imagemUrl,
          }
        : undefined,
      criadoPor: ev.criadoPor,
      evidencias: ev.evidencias,
      nfeEmitida: ev.nfeEmitida,
    }));
    return mappedEventos;
  };

  const { data: eventosDoBanco = [], error, isLoading, mutate } = useSWR<Evento[]>(
    "eventos_list",
    fetcher,
    { revalidateOnFocus: true }
  );

  useEffect(() => {
    if (error) toast.error("Erro ao carregar eventos.");
  }, [error]);



  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange, globalSearch, statusFilter, loteSelecionado]);

  const eventosFiltradosGlobalmente = useMemo(() => {
    return eventosDoBanco.filter((evento) => {
      if (dateRange?.from) {
        const eventoDate = new Date(evento.dataHora);
        const start = startOfDay(dateRange.from);
        const end = endOfDay(dateRange.to || dateRange.from);
        if (!isWithinInterval(eventoDate, { start, end })) return false;
      }
      if (globalSearch) {
        const s = globalSearch.toLowerCase();
        const matches =
          (evento.item?.nome || "").toLowerCase().includes(s) ||
          (evento.item?.codigoInterno || "").toLowerCase().includes(s) ||
          evento.criadoPor?.nome.toLowerCase().includes(s);
        if (!matches) return false;
      }
      if (statusFilter !== "todos") {
        const targetStatus =
          statusFilter === "pendente" ? "enviado" : statusFilter;
        if (targetStatus === "enviado" && evento.status === "rascunho")
          return true;
        if (evento.status !== targetStatus) return false;
      }
      return true;
    });
  }, [eventosDoBanco, dateRange, globalSearch, statusFilter]);

  const lotesDiarios = useMemo(() => {
    const grupos: Record<string, Evento[]> = {};

    eventosFiltradosGlobalmente.forEach((evento) => {
      const dataFormatada = formatDate(evento.dataHora);
      if (!grupos[dataFormatada]) grupos[dataFormatada] = [];
      grupos[dataFormatada].push(evento);
    });

    return Object.entries(grupos)
      .map(([data, eventos]) => {
        let status: BatchStatus = "pendente";
        const todosOk = eventos.every((e) =>
          ["aprovado", "exportado"].includes(e.status),
        );
        const temRejeitado = eventos.some((e) => e.status === "rejeitado");

        if (todosOk) status = "aprovado";
        else if (temRejeitado) status = "rejeitado";

        const isNfeEmitida = eventos.some((e) => e.nfeEmitida);

        return {
          data,
          dataOriginal: new Date(eventos[0].dataHora),
          eventos,
          totalCusto: eventos.reduce(
            (acc, e) => acc + (e.custoSnapshot || 0) * e.quantidade,
            0,
          ),
          status,
          autor: eventos[0].criadoPor?.nome || "Sistema",
          nfeEmitida: isNfeEmitida,
        } as LoteDiario;
      })
      .sort((a, b) => b.dataOriginal.getTime() - a.dataOriginal.getTime());
  }, [eventosFiltradosGlobalmente]);

  const dadosPaginados = useMemo(() => {
    let dados: any[] = [];
    const itemsPerPage = !loteSelecionado ? 10 : 15;

    if (loteSelecionado) {
      dados = eventosFiltradosGlobalmente.filter(
        (e) => formatDate(e.dataHora) === loteSelecionado.data,
      );
    } else {
      dados = lotesDiarios;
    }

    const totalItems = dados.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    return {
      currentItems: dados.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage,
      ),
      totalPages,
      totalItems,
    };
  }, [
    loteSelecionado,
    lotesDiarios,
    eventosFiltradosGlobalmente,
    currentPage,
  ]);

  const handleStatusChange = async (eventoId: string, novoStatus: string) => {
    const statusTyped = novoStatus as EventoStatus;
    const optimisicData = eventosDoBanco.map((ev) =>
      ev.id === eventoId ? { ...ev, status: statusTyped } : ev
    );
    
    mutate(optimisicData, false);

    const result = await updateEventoStatus(eventoId, statusTyped);
    if (!result.success) {
      toast.error(result.message);
      mutate();
    } else {
      toast.success("Status atualizado");
      mutate(optimisicData, true);
    }
  };

  const handleAprovarLoteInteiro = async () => {
    if (!loteSelecionado) return;
    const ids = loteSelecionado.eventos.map((e) => e.id);
    const optimisicData = eventosDoBanco.map((ev) =>
      ids.includes(ev.id) ? { ...ev, status: "aprovado" as EventoStatus } : ev
    );
    
    mutate(optimisicData, false);

    await Promise.all(ids.map((id) => updateEventoStatus(id, "aprovado")));
    toast.success("Lote aprovado!");
    mutate(optimisicData, true);
  };

  const confirmDelete = async () => {
    if (eventoToDelete) {
      const optimisicData = eventosDoBanco.filter((ev) => ev.id !== eventoToDelete);
      mutate(optimisicData, false);

      const result = await deleteEvento(eventoToDelete);
      if (!result.success) {
        toast.error(result.message);
        mutate();
      } else {
        toast.success("Evento excluído com sucesso.");
        mutate(optimisicData, true);
      }
      setEventoToDelete(null);
    }
  };

  const handleToggleNfe = async (lote: LoteDiario) => {
    const eventoIds = lote.eventos.map((e) => e.id);
    const newStatus = !lote.nfeEmitida;
    
    const optimisicData = eventosDoBanco.map((ev) =>
      eventoIds.includes(ev.id) ? { ...ev, nfeEmitida: newStatus } : ev
    );

    mutate(optimisicData, false);

    const result = await toggleNfeEmitidaLote(eventoIds, newStatus);
    if (!result.success) {
      toast.error(result.message);
      mutate();
    } else {
      toast.success(newStatus ? "Nota Fiscal marcada como emitida." : "Nota Fiscal desmarcada.");
      mutate(optimisicData, true);
    }
  };

  if (!hasPermission("eventos:ver_todos")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
      </div>
    );
  }

  const handleDownloadCSV = () => {
    if (!loteSelecionado) return;
    const eventos = dadosPaginados.currentItems as Evento[];
    if (eventos.length === 0) return;

    const headers = ["Data", "Codigo", "Produto", "Qtd", "Total", "Status", "NFe Emitida"];
    
    const rows = eventos.map((ev) => [
      formatDate(ev.dataHora),
      ev.item?.codigoInterno || "",
      `"${ev.item?.nome || ""}"`,
      `${ev.quantidade} ${ev.unidade}`,
      ((ev.custoSnapshot || 0) * ev.quantidade).toFixed(2).replace('.', ','),
      ev.status.toUpperCase(),
      ev.nfeEmitida ? "SIM" : "NAO"
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map(r => r.join(";"))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `perdas-${loteSelecionado.data.replace(/\//g, "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loteSelecionado) {
    const eventosDoLote = dadosPaginados.currentItems as Evento[];
    const todosOk =
      eventosDoLote.length > 0 &&
      eventosDoLote.every((e) => ["aprovado", "exportado"].includes(e.status));

    return (
      <>
        <PageHeader 
          title={loteSelecionado.data} 
          description={`Autor: ${loteSelecionado.autor}`}
        >
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLoteSelecionado(null)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadCSV}
            >
              Baixar CSV
            </Button>
            {!todosOk && hasPermission("eventos:aprovar") && (
              <Button
                size="sm"
                onClick={handleAprovarLoteInteiro}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Aprovar Tudo
              </Button>
            )}
        </PageHeader>
        <main className={`flex-1 flex flex-col space-y-4 px-4 py-5 md:px-8 md:py-6 overflow-hidden ${hideScrollClass}`}>

        {}
        <div className="flex-1 min-h-0 border rounded-md bg-card relative overflow-hidden shadow-sm">
          <div
            className={`absolute inset-0 overflow-y-auto p-2 ${hideScrollClass}`}
          >
            <EventosTable
              data={eventosDoLote}
              onStatusChange={handleStatusChange}
              onDelete={setEventoToDelete}
              onViewDetails={(ev) => console.log("Detalhes", ev)}
            />
          </div>
        </div>
        {}

        <PaginationControls
          currentPage={currentPage}
          totalPages={dadosPaginados.totalPages}
          totalItems={dadosPaginados.totalItems}
          onPageChange={setCurrentPage}
        />

        <AlertDialogDelete
          open={!!eventoToDelete}
          onOpenChange={(open: boolean) => !open && setEventoToDelete(null)}
          onConfirm={confirmDelete}
        />
      </main>
      </>
    );
  }

  return (
    <>
      <PageHeader 
        title="Eventos e Lotes" 
        description="Gestão de aprovação e conferência."
      />
      <main className={`flex-1 flex flex-col space-y-4 px-4 py-5 md:px-8 md:py-6 overflow-hidden ${hideScrollClass}`}>
      <EventosToolbar
        globalSearch={globalSearch}
        setGlobalSearch={setGlobalSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        dateRange={dateRange}
        setDateRange={setDateRange}
      />

      <div className="flex-1 min-h-0 border rounded-md bg-card relative overflow-hidden shadow-sm">
        <div
          className={`absolute inset-0 overflow-y-auto ${hideScrollClass} p-2`}
        >
          {isLoading ? (
            <div className="flex justify-center items-center h-full gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" /> Carregando...
            </div>
          ) : (
            <EventosGrid
              lotes={dadosPaginados.currentItems as LoteDiario[]}
              onSelect={setLoteSelecionado}
              onToggleNfe={handleToggleNfe}
            />
          )}
        </div>
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={dadosPaginados.totalPages}
        totalItems={dadosPaginados.totalItems}
        onPageChange={setCurrentPage}
      />

      <AlertDialogDelete
        open={!!eventoToDelete}
        onOpenChange={(open: boolean) => !open && setEventoToDelete(null)}
        onConfirm={confirmDelete}
      />
      </main>
    </>
  );
}



interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: PaginationControlsProps) {
  return (
    <div className="flex items-center justify-between py-2 border-t mt-auto shrink-0">
      <div className="text-xs text-muted-foreground">
        Mostrando {totalItems} registros
      </div>
      <div className="space-x-2 flex items-center">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-xs font-medium w-16 text-center">
          {currentPage} / {Math.max(1, totalPages)}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface AlertDialogDeleteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

function AlertDialogDelete({
  open,
  onOpenChange,
  onConfirm,
}: AlertDialogDeleteProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
          <AlertDialogDescription>
            Isso excluirá o registro permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive hover:bg-destructive/90"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

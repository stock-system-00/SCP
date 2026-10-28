"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

import { Evidencia } from "@/lib/types";
import {
  formatDate,
  formatDateTime,
  getStatusLabel,
  getStatusColor,
  compressImage,
} from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { UploadDialog } from "@/components/galeria/upload-dialog";
import {
  getEvidencias,
  getPastasGaleria,
  createEvidenciaAvulsa,
  deleteEvidencia,
  deleteEvidenciasMes,
  updateEvidencia,
} from "@/app/actions/galeria";

import {
  Search,
  Calendar,
  AlertTriangle,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Trash2,
  Camera,
  Folder,
  FolderOpen,
  ArrowLeft,
  Loader2,
  Edit,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

export interface EvidenciaDisplay {
  id: string;
  url: string;
  dataUpload: string;
  motivo?: string;
  itemId?: string;
  user?: { nome: string };
  evento?: {
    id: string;
    status: string;
    quantidade: number;
    unidade: string;
    motivo?: string;
    item?: {
      id: string;
      nome: string;
      codigoInterno: string;
    };
  };
}

const MESES = [
  { numero: 1, nome: "Janeiro", sigla: "Jan" },
  { numero: 2, nome: "Fevereiro", sigla: "Fev" },
  { numero: 3, nome: "Março", sigla: "Mar" },
  { numero: 4, nome: "Abril", sigla: "Abr" },
  { numero: 5, nome: "Maio", sigla: "Mai" },
  { numero: 6, nome: "Junho", sigla: "Jun" },
  { numero: 7, nome: "Julho", sigla: "Jul" },
  { numero: 8, nome: "Agosto", sigla: "Ago" },
  { numero: 9, nome: "Setembro", sigla: "Set" },
  { numero: 10, nome: "Outubro", sigla: "Out" },
  { numero: 11, nome: "Novembro", sigla: "Nov" },
  { numero: 12, nome: "Dezembro", sigla: "Dez" },
];

export default function GaleriaPage() {
  const { hasPermission } = useAuth();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  // Filtro de ano e controle de pastas
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  const [selectedFolderMonth, setSelectedFolderMonth] = useState<number | null>(null);

  // Informações de pastas (quantidades de fotos por mês)
  const [folderCounts, setFolderCounts] = useState<Record<number, number>>({});
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);

  // Evidências do mês aberto (carregadas sob demanda)
  const [evidencias, setEvidencias] = useState<EvidenciaDisplay[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);

  // Filtros internos dentro da pasta aberta
  const [selectedDate, setSelectedDate] = useState<string>("todas");
  const [selectedMotivo, setSelectedMotivo] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState("");

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 32;

  // Controle do Modal de Visualização
  const [selectedPhoto, setSelectedPhoto] = useState<EvidenciaDisplay | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Modais e Upload
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [photoToEdit, setPhotoToEdit] = useState<EvidenciaDisplay | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<EvidenciaDisplay | null>(null);
  
  // Estado para exclusão em massa da pasta (mês)
  const [folderToDelete, setFolderToDelete] = useState<{ numero: number; nome: string; count: number } | null>(null);
  const [folderDeleteInput, setFolderDeleteInput] = useState("");
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar dados das pastas para o ano selecionado
  useEffect(() => {
    loadFolders(selectedYear);
  }, [selectedYear]);

  // Se houver pasta aberta, recarregar fotos quando o mês mudar
  useEffect(() => {
    if (selectedFolderMonth !== null) {
      loadPhotosForMonth(selectedYear, selectedFolderMonth);
    } else {
      setEvidencias([]);
    }
  }, [selectedFolderMonth, selectedYear]);

  const loadFolders = async (ano: number) => {
    setIsLoadingFolders(true);
    try {
      const res = await getPastasGaleria(ano);
      if (res.success) {
        if (res.anos && res.anos.length > 0) {
          setAvailableYears(res.anos);
        }
        setFolderCounts(res.contagemPorMes || {});
      } else {
        toast.error("Erro ao carregar pastas.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar pastas da galeria.");
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const loadPhotosForMonth = async (ano: number, mes: number) => {
    setIsLoadingPhotos(true);
    setSelectedDate("todas");
    setSelectedMotivo("todos");
    setSearchQuery("");
    setCurrentPage(1);

    try {
      const result = await getEvidencias({ ano, mes });
      if (result.success && result.data) {
        const mappedData: EvidenciaDisplay[] = (result.data as any[]).map(
          (ev) => ({
            id: ev.id,
            url: ev.url,
            dataUpload: ev.dataUpload,
            motivo: ev.motivo,
            itemId: ev.evento?.itemId,
            user: ev.user,
            evento: ev.evento
              ? {
                  id: ev.evento.id,
                  status: ev.evento.status,
                  quantidade: Number(ev.evento.quantidade),
                  unidade: ev.evento.unidade,
                  motivo: ev.evento.motivo,
                  item: ev.evento.item
                    ? {
                        id: ev.evento.item.id,
                        nome: ev.evento.item.nome,
                        codigoInterno: ev.evento.item.codigoInterno,
                      }
                    : undefined,
                }
              : undefined,
          }),
        );
        setEvidencias(mappedData);
      } else {
        toast.error("Erro ao carregar fotos deste mês.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar fotos.");
    } finally {
      setIsLoadingPhotos(false);
    }
  };

  // Abrir pasta
  const handleOpenFolder = (mes: number) => {
    setSelectedFolderMonth(mes);
  };

  // Voltar para visualização de pastas
  const handleBackToFolders = () => {
    setSelectedFolderMonth(null);
  };

  // Recarregar tudo após alteração (upload / exclusão / edição)
  const refreshCurrentView = async () => {
    await loadFolders(selectedYear);
    if (selectedFolderMonth !== null) {
      await loadPhotosForMonth(selectedYear, selectedFolderMonth);
    }
  };

  // --- AÇÕES DE UPLOAD ---
  const handleQuickUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.loading("Processando...", { id: "quick-upload" });

      compressImage(file).then(async (base64String) => {
        const result = await createEvidenciaAvulsa({
          url: base64String,
          motivo: "Upload Rápido",
        });

        toast.dismiss("quick-upload");
        if (result.success) {
          toast.success("Foto adicionada com sucesso!");
          refreshCurrentView();
        } else {
          toast.error("Erro ao salvar foto.");
        }
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDetailedSave = async (
    data: Partial<Evidencia> & { eventoId?: string; dataPersonalizada?: Date },
  ) => {
    // MODO EDIÇÃO
    if (photoToEdit) {
      const result = await updateEvidencia(photoToEdit.id, {
        motivo: data.motivo,
        eventoId: data.eventoId,
        dataPersonalizada: data.dataPersonalizada,
      });

      if (result.success) {
        toast.success("Foto atualizada com sucesso!");
        refreshCurrentView();
        setShowUploadDialog(false);
        setPhotoToEdit(null);
      } else {
        toast.error(result.message || "Erro ao atualizar.");
      }
      return;
    }

    // MODO CRIAÇÃO (Novo Upload)
    if (!data.url) return;

    const result = await createEvidenciaAvulsa({
      url: data.url,
      motivo: data.motivo,
      eventoId: data.eventoId,
      dataPersonalizada: data.dataPersonalizada,
    });

    if (result.success) {
      toast.success("Foto registrada com sucesso!");
      refreshCurrentView();
      setShowUploadDialog(false);
    } else {
      toast.error(result.message || "Erro ao salvar.");
    }
  };

  // --- AÇÃO DE EXCLUSÃO ---
  const confirmDelete = async () => {
    if (!photoToDelete) return;

    const result = await deleteEvidencia(photoToDelete.id);

    if (result.success) {
      toast.success("Foto removida.");
      refreshCurrentView();
      if (selectedPhoto?.id === photoToDelete.id) {
        setIsViewerOpen(false);
        setSelectedPhoto(null);
      }
    } else {
      toast.error(result.message);
    }

    setPhotoToDelete(null);
  };

  // --- AÇÃO DE EXCLUSÃO DE TODAS AS FOTOS DO MÊS ---
  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;

    if (folderDeleteInput.trim().toLowerCase() !== folderToDelete.nome.trim().toLowerCase()) {
      toast.error(`Digite "${folderToDelete.nome}" exatamente para confirmar a exclusão.`);
      return;
    }

    setIsDeletingFolder(true);
    try {
      const res = await deleteEvidenciasMes(selectedYear, folderToDelete.numero);
      if (res.success) {
        toast.success(`Todas as fotos de ${folderToDelete.nome}/${selectedYear} foram excluídas.`);
        setFolderToDelete(null);
        setFolderDeleteInput("");
        if (selectedFolderMonth === folderToDelete.numero) {
          // Se estava dentro da pasta apagada, volta para as pastas ou atualiza
          setEvidencias([]);
        }
        await refreshCurrentView();
      } else {
        toast.error(res.message || "Erro ao excluir fotos da pasta.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado ao excluir fotos da pasta.");
    } finally {
      setIsDeletingFolder(false);
    }
  };

  // --- FILTROS (dentro da pasta aberta) ---
  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    evidencias.forEach((ev) => dates.add(formatDate(ev.dataUpload)));
    return Array.from(dates).sort((a, b) => {
      const [da, ma, ya] = a.split("/");
      const [db, mb, yb] = b.split("/");
      return (
        new Date(`${yb}-${mb}-${db}`).getTime() -
        new Date(`${ya}-${ma}-${da}`).getTime()
      );
    });
  }, [evidencias]);

  const uniqueMotivos = useMemo(() => {
    const motivos = new Set<string>();
    evidencias.forEach((ev) => {
      if (ev.evento?.motivo) motivos.add(ev.evento.motivo);
      else if (ev.motivo) motivos.add(ev.motivo);
    });
    return Array.from(motivos).sort();
  }, [evidencias]);

  const filteredEvidencias = useMemo(() => {
    let filtered = evidencias;

    if (selectedDate !== "todas") {
      filtered = filtered.filter(
        (ev) => formatDate(ev.dataUpload) === selectedDate,
      );
    }

    if (selectedMotivo !== "todos") {
      filtered = filtered.filter(
        (ev) => ev.evento?.motivo === selectedMotivo || ev.motivo === selectedMotivo,
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ev) =>
          (ev.evento?.item?.nome || "").toLowerCase().includes(query) ||
          (ev.evento?.item?.codigoInterno || "").toLowerCase().includes(query) ||
          (ev.motivo || "").toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [evidencias, selectedDate, selectedMotivo, searchQuery]);

  const totalPages = Math.ceil(filteredEvidencias.length / ITEMS_PER_PAGE);
  const paginatedEvidencias = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEvidencias.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredEvidencias, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [totalPages, currentPage]);

  // --- NAVEGAÇÃO DO VIEWER ---
  const handlePhotoClick = (photo: EvidenciaDisplay, index: number) => {
    setSelectedPhoto(photo);
    setPhotoIndex(index);
    setIsViewerOpen(true);
  };

  const handlePrevPhoto = () => {
    const newIndex =
      photoIndex > 0 ? photoIndex - 1 : filteredEvidencias.length - 1;
    setSelectedPhoto(filteredEvidencias[newIndex]);
    setPhotoIndex(newIndex);
  };

  const handleNextPhoto = () => {
    const newIndex =
      photoIndex < filteredEvidencias.length - 1 ? photoIndex + 1 : 0;
    setSelectedPhoto(filteredEvidencias[newIndex]);
    setPhotoIndex(newIndex);
  };

  const openEditDialog = (photo: EvidenciaDisplay) => {
    setPhotoToEdit(photo);
    setShowUploadDialog(true);
    setIsViewerOpen(false);
  };

  const currentMonthInfo = MESES.find((m) => m.numero === selectedFolderMonth);

  if (!hasPermission("galeria:ver")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Galeria"
        description="Fotos e evidências organizadas em pastas mensais com carregamento sob demanda."
      >
        {hasPermission("galeria:upload") && (
          <div className="flex gap-2">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleQuickUpload}
            />

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="mr-2 h-4 w-4" />
              Foto Rápida
            </Button>

            <Button
              onClick={() => {
                setPhotoToEdit(null);
                setShowUploadDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Detalhado
            </Button>
          </div>
        )}
      </PageHeader>

      <main className="flex-1 flex flex-col space-y-6 px-4 py-5 md:px-8 md:py-6 overflow-hidden">
        {/* BARRA SUPERIOR: Barra de Navegação de Pastas / Filtros */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
          <div className="flex items-center gap-3">
            {selectedFolderMonth !== null ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToFolders}
                className="gap-2 font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar às Pastas
              </Button>
            ) : null}

            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground">
                Ano:
              </span>
              <Select
                value={String(selectedYear)}
                onValueChange={(val) => {
                  setSelectedYear(Number(val));
                  setSelectedFolderMonth(null); // Volta pra tela de pastas ao trocar o ano
                }}
              >
                <SelectTrigger className="w-28 h-9 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((ano) => (
                    <SelectItem key={ano} value={String(ano)}>
                      {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedFolderMonth !== null && currentMonthInfo && (
              <div className="flex items-center gap-2 pl-2 border-l">
                <FolderOpen className="h-5 w-5 text-primary" />
                <span className="text-sm font-bold text-foreground">
                  {currentMonthInfo.nome} / {selectedYear}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {evidencias.length} {evidencias.length === 1 ? "foto" : "fotos"}
                </Badge>
                {hasPermission("galeria:excluir") && evidencias.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive gap-1 ml-2 text-xs"
                    onClick={() => {
                      setFolderToDelete({
                        numero: currentMonthInfo.numero,
                        nome: currentMonthInfo.nome,
                        count: evidencias.length,
                      });
                      setFolderDeleteInput("");
                    }}
                    title="Excluir todas as fotos deste mês"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir Pasta
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* MODO 1: VISUALIZAÇÃO DE PASTAS POR MÊS */}
        {selectedFolderMonth === null ? (
          <div className="flex-1 overflow-y-auto">
            {isLoadingFolders ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando pastas...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Selecione uma pasta mensal para visualizar e carregar as fotos correspondentes:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {MESES.map((mes) => {
                    const count = folderCounts[mes.numero] || 0;
                    const isCurrent =
                      selectedYear === currentYear && mes.numero === currentMonth;

                    return (
                      <div
                        key={mes.numero}
                        onClick={() => handleOpenFolder(mes.numero)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            handleOpenFolder(mes.numero);
                          }
                        }}
                        className={`group relative text-left p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between h-36 cursor-pointer select-none ${
                          isCurrent
                            ? "bg-primary/10 border-primary/50 hover:bg-primary/15 ring-2 ring-primary/20 shadow-sm"
                            : "bg-card hover:bg-muted/40 border-border hover:border-foreground/20 hover:shadow-sm"
                        }`}
                      >
                        {/* Ações superiores da pasta */}
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                          {hasPermission("galeria:excluir") && count > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFolderToDelete({
                                  numero: mes.numero,
                                  nome: mes.nome,
                                  count,
                                });
                                setFolderDeleteInput("");
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-all"
                              title={`Excluir todas as fotos de ${mes.nome}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Ícone da pasta */}
                        <div className="flex items-center">
                          <div
                            className={`p-2.5 rounded-lg transition-transform group-hover:scale-110 ${
                              isCurrent
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-muted text-muted-foreground group-hover:text-foreground"
                            }`}
                          >
                            <Folder className="h-6 w-6" />
                          </div>
                        </div>

                        {/* Informações da pasta */}
                        <div className="mt-2">
                          <h3
                            className={`font-semibold text-sm leading-tight transition-colors ${
                              isCurrent
                                ? "text-primary group-hover:text-primary"
                                : "text-foreground group-hover:text-primary"
                            }`}
                          >
                            {mes.nome}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {count} {count === 1 ? "foto" : "fotos"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* MODO 2: VISUALIZAÇÃO DAS FOTOS DA PASTA ABERTA */
          <div className="flex-1 flex flex-col overflow-hidden space-y-4">
            {/* Filtros dentro da pasta */}
            <div className="flex flex-col gap-4 sm:flex-row z-10 py-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por item ou motivo..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9"
                />
              </div>

              <Select
                value={selectedMotivo}
                onValueChange={(v) => {
                  setSelectedMotivo(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrar por motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os motivos</SelectItem>
                  {uniqueMotivos.map((motivo) => (
                    <SelectItem key={motivo} value={motivo}>
                      {motivo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedDate}
                onValueChange={(v) => {
                  setSelectedDate(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <Calendar className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filtrar por data" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as datas</SelectItem>
                  {uniqueDates.map((date) => (
                    <SelectItem key={date} value={date}>
                      {date}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grid de fotos ou loading */}
            {isLoadingPhotos ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando fotos da pasta...</p>
              </div>
            ) : paginatedEvidencias.length > 0 ? (
              <div className="flex-1 overflow-y-auto">
                <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 pb-10">
                  {paginatedEvidencias.map((evidencia, index) => (
                    <button
                      key={evidencia.id}
                      type="button"
                      onClick={() => handlePhotoClick(evidencia, index)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (hasPermission("galeria:excluir")) {
                          setPhotoToDelete(evidencia);
                        } else {
                          toast.error("Sem permissão para excluir fotos.");
                        }
                      }}
                      className="group relative aspect-square w-full overflow-hidden rounded-md ring-1 ring-border/50 shadow-sm"
                    >
                      <img
                        src={evidencia.url || "/placeholder.svg"}
                        alt={`Evidência ${index + 1}`}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />

                      <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100 flex items-center justify-center">
                        <ZoomIn className="h-6 w-6 text-white" />
                      </div>

                      <span
                        className={`absolute bottom-1 right-1 h-2 w-2 rounded-full ${
                          evidencia.evento ? "bg-green-500" : "bg-yellow-500"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg bg-muted/5">
                <div className="bg-muted/50 p-4 rounded-full mb-4">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Nenhuma foto nesta pasta</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  {searchQuery || selectedMotivo !== "todos" || selectedDate !== "todas"
                    ? "Tente alterar os filtros de busca acima."
                    : "Use os botões de Foto Rápida ou Adicionar Detalhado para cadastrar fotos neste mês."}
                </p>
              </div>
            )}

            {/* Paginação */}
            {!isLoadingPhotos && filteredEvidencias.length > 0 && (
              <div className="flex items-center justify-between shrink-0 pt-2 border-t mt-auto">
                <p className="text-xs text-muted-foreground">
                  {paginatedEvidencias.length} de {filteredEvidencias.length} fotos
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
            )}
          </div>
        )}

        {/* Modal de visualização de foto ampliada */}
        <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
          <DialogContent className="w-screen h-[100dvh] max-w-none sm:max-w-4xl sm:h-auto sm:max-h-[90vh] p-0 gap-0 overflow-hidden bg-black/95 border-none [&>button]:hidden rounded-none sm:rounded-lg">
            <DialogTitle className="sr-only">Visualizar Evidência</DialogTitle>

            <div className="relative w-full h-full flex flex-col">
              <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-50 bg-gradient-to-b from-black/90 via-black/60 to-transparent pt-6 sm:pt-4">
                <div className="drop-shadow-md">
                  <h2 className="text-white font-semibold text-sm drop-shadow-lg">
                    {selectedPhoto?.evento?.item?.nome || "Foto Avulsa"}
                  </h2>
                  <p className="text-white/90 text-xs font-medium drop-shadow-lg mt-0.5">
                    {selectedPhoto && formatDateTime(selectedPhoto.dataUpload)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-white hover:bg-white/20"
                  onClick={() => setIsViewerOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden sm:min-h-[400px] sm:max-h-[70vh]">
                {selectedPhoto && (
                  <img
                    src={selectedPhoto.url || "/placeholder.svg"}
                    alt="Evidência Detalhada"
                    className="max-h-full max-w-full object-contain"
                  />
                )}

                {filteredEvidencias.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 rounded-full h-10 w-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevPhoto();
                      }}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 rounded-full h-10 w-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextPhoto();
                      }}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </>
                )}
              </div>

              <div className="bg-background p-4 border-t flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {selectedPhoto?.evento ? (
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">
                            {selectedPhoto.evento.item?.codigoInterno}
                          </Badge>
                          <Badge
                            className={getStatusColor(
                              selectedPhoto.evento.status as any,
                            )}
                          >
                            {getStatusLabel(selectedPhoto.evento.status as any)}
                          </Badge>
                        </div>
                        <p className="text-sm">
                          Qtd:{" "}
                          <strong>
                            {selectedPhoto.evento.quantidade}{" "}
                            {selectedPhoto.evento.unidade}
                          </strong>
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm text-muted-foreground">Motivo:</span>
                          <Badge
                            variant="outline"
                            className={
                              selectedPhoto.evento.motivo?.toLowerCase() === "devolução"
                                ? "bg-amber-100/50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-700"
                                : "text-muted-foreground"
                            }
                          >
                            {selectedPhoto.evento.motivo}
                          </Badge>
                        </div>
                      </>
                    ) : (
                      <div>
                        <Badge variant="secondary" className="mb-1">
                          Avulso
                        </Badge>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm text-muted-foreground">Motivo:</span>
                          <Badge
                            variant="outline"
                            className={
                              selectedPhoto?.motivo?.toLowerCase() === "devolução"
                                ? "bg-amber-100/50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-700"
                                : "text-muted-foreground"
                            }
                          >
                            {selectedPhoto?.motivo || "-"}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() =>
                        selectedPhoto && openEditDialog(selectedPhoto)
                      }
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    {hasPermission("galeria:excluir") && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          setPhotoToDelete(selectedPhoto);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de upload e edição detalhada */}
        <UploadDialog
          open={showUploadDialog}
          onOpenChange={setShowUploadDialog}
          onSave={handleDetailedSave}
          editMode={!!photoToEdit}
          initialData={photoToEdit}
        />

        {/* Confirmação de exclusão individual */}
        <AlertDialog
          open={!!photoToDelete}
          onOpenChange={(open) => !open && setPhotoToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir foto?</AlertDialogTitle>
              <AlertDialogDescription>
                Essa ação removerá a foto da galeria permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmação com trava de segurança para exclusão em massa da pasta do mês */}
        <AlertDialog
          open={!!folderToDelete}
          onOpenChange={(open) => {
            if (!open && !isDeletingFolder) {
              setFolderToDelete(null);
              setFolderDeleteInput("");
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Excluir todas as fotos do mês?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 pt-2 text-foreground/80 text-sm">
                  <p>
                    Você está prestes a excluir permanentemente{" "}
                    <strong className="text-destructive font-semibold">
                      todas as {folderToDelete?.count}{" "}
                      {folderToDelete?.count === 1 ? "foto" : "fotos"}
                    </strong>{" "}
                    do mês de{" "}
                    <strong className="text-foreground font-semibold">
                      {folderToDelete?.nome} de {selectedYear}
                    </strong>
                    . Esta ação não pode ser desfeita.
                  </p>
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-xs text-destructive">
                    Para confirmar com segurança, digite exatamente{" "}
                    <span className="font-bold underline">"{folderToDelete?.nome}"</span> no
                    campo abaixo:
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="py-2">
              <Input
                placeholder={`Digite "${folderToDelete?.nome}" para confirmar`}
                value={folderDeleteInput}
                onChange={(e) => setFolderDeleteInput(e.target.value)}
                autoFocus
                disabled={isDeletingFolder}
                className="font-medium"
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    folderDeleteInput.trim().toLowerCase() ===
                      folderToDelete?.nome.trim().toLowerCase() &&
                    !isDeletingFolder
                  ) {
                    confirmDeleteFolder();
                  }
                }}
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingFolder}>
                Cancelar
              </AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={confirmDeleteFolder}
                disabled={
                  isDeletingFolder ||
                  folderDeleteInput.trim().toLowerCase() !==
                    folderToDelete?.nome.trim().toLowerCase()
                }
              >
                {isDeletingFolder ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  "Excluir Todas as Fotos"
                )}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  );
}

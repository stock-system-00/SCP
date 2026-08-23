
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
  createEvidenciaAvulsa,
  deleteEvidencia,
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
  MoreVertical,
  Loader2,
  Edit,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export default function GaleriaPage() {
  const { hasPermission } = useAuth();


  const [evidencias, setEvidencias] = useState<EvidenciaDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);


  const [selectedDate, setSelectedDate] = useState<string>("todas");
  const [searchQuery, setSearchQuery] = useState("");

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 32;

  // Controle do Modal de Visualização
  const [selectedPhoto, setSelectedPhoto] = useState<EvidenciaDisplay | null>(
    null,
  );
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Modais e Upload
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  // Estado para EDIÇÃO (vincular foto avulsa) - Usaremos o mesmo dialog de upload, mas em modo edição
  const [photoToEdit, setPhotoToEdit] = useState<EvidenciaDisplay | null>(null);

  const [photoToDelete, setPhotoToDelete] = useState<EvidenciaDisplay | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar dados
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const result = await getEvidencias();

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
      toast.error("Erro ao carregar galeria.");
    }
    setIsLoading(false);
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
          toast.success("Foto adicionada à galeria");
          loadData();
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
        loadData();
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
      loadData();
      setShowUploadDialog(false);
    } else {
      toast.error(result.message || "Erro ao salvar.");
    }
  };

  // --- AÇÃO DE EXCLUSÃO ---
  const confirmDelete = async () => {
    if (!photoToDelete) return;

    // Removemos a restrição de não poder excluir fotos de eventos,
    // pois o usuário pode ter errado a foto.

    const result = await deleteEvidencia(photoToDelete.id);

    if (result.success) {
      toast.success("Foto removida.");
      loadData();
      if (selectedPhoto?.id === photoToDelete.id) {
        setIsViewerOpen(false);
        setSelectedPhoto(null);
      }
    } else {
      toast.error(result.message);
    }

    setPhotoToDelete(null);
  };

  // --- FILTROS ---
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

  const filteredEvidencias = useMemo(() => {
    let filtered = evidencias;

    if (selectedDate !== "todas") {
      filtered = filtered.filter(
        (ev) => formatDate(ev.dataUpload) === selectedDate,
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ev) =>
          (ev.evento?.item?.nome || "").toLowerCase().includes(query) ||
          (ev.evento?.item?.codigoInterno || "")
            .toLowerCase()
            .includes(query) ||
          (ev.motivo || "").toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [evidencias, selectedDate, searchQuery]);

  const totalPages = Math.ceil(filteredEvidencias.length / ITEMS_PER_PAGE);
  const paginatedEvidencias = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEvidencias.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredEvidencias, currentPage]);

  useMemo(() => {
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
    // Fecha o viewer se estiver aberto para editar
    setIsViewerOpen(false);
  };

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
        description="Visualize evidências de eventos e fotos avulsas."
      >

        {}
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
        {}
        <div className="flex flex-col gap-4 sm:flex-row  z-10 py-1">
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
          <Select value={selectedDate} onValueChange={(v) => { setSelectedDate(v); setCurrentPage(1); }}>
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

        {}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : paginatedEvidencias.length > 0 ? (
          <div className="flex-1 overflow-y-auto">
            <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 pb-10">
              {paginatedEvidencias.map((evidencia, index) => (
                <button
                  key={evidencia.id}
                  type="button"
                  onClick={() => handlePhotoClick(evidencia, index)}
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
                    className={`absolute bottom-1 right-1 h-2 w-2 rounded-full ${evidencia.evento ? "bg-green-500" : "bg-yellow-500"}`}
                  />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg bg-muted/5">
            <div className="bg-muted/50 p-4 rounded-full mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Nenhuma foto encontrada</h3>
          </div>
        )}

        {}
        {!isLoading && filteredEvidencias.length > 0 && (
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

        {}
        <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
          <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-black/95 border-none [&>button]:hidden">
            <DialogTitle className="sr-only">Visualizar Evidência</DialogTitle>

            <div className="relative w-full h-full flex flex-col">
              {}
              <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-50 bg-linear-to-b from-black/80 to-transparent">
                <div>
                  <h2 className="text-white font-medium text-sm">
                    {selectedPhoto?.evento?.item?.nome || "Foto Avulsa"}
                  </h2>
                  <p className="text-white/70 text-xs">
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

              {}
              <div className="relative flex-1 bg-black min-h-[50vh] max-h-[80vh] flex items-center justify-center">
                {selectedPhoto && (
                  <img
                    src={selectedPhoto.url || "/placeholder.svg"}
                    alt="Evidência Detalhada"
                    className="max-h-full max-w-full object-contain"
                  />
                )}

                {}
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

              {}
              <div className="bg-background p-4 border-t flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  {}
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
                        <p className="text-sm text-muted-foreground">
                          Motivo: {selectedPhoto.evento.motivo}
                        </p>
                      </>
                    ) : (
                      <div>
                        <Badge variant="secondary" className="mb-1">
                          Avulso
                        </Badge>
                        <p className="text-sm">
                          Motivo: {selectedPhoto?.motivo || "-"}
                        </p>
                      </div>
                    )}
                  </div>

                  {}
                  <div className="flex gap-2">
                    {}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        selectedPhoto && openEditDialog(selectedPhoto)
                      }
                    >
                      <Edit className="mr-2 h-4 w-4" />{" "}
                      {selectedPhoto?.evento
                        ? "Ver Detalhes"
                        : "Completar Cadastro"}
                    </Button>

                    {hasPermission("galeria:excluir") && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setPhotoToDelete(selectedPhoto);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {}
        <UploadDialog
          open={showUploadDialog}
          onOpenChange={setShowUploadDialog}
          onSave={handleDetailedSave}

          editMode={!!photoToEdit}
          initialData={photoToEdit}
        />

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
      </main>
    </>
  );
}

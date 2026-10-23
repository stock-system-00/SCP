"use client";

import React, { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Upload,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCode,
  Trash2,
  Loader2,
  ExternalLink,
  Layers,
  RotateCcw,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { importSingleNFeBatchItem, BatchItemResult } from "@/app/actions/nfe-import";

interface QueueItem {
  id: string;
  file: File;
  status: "idle" | "processing" | "imported" | "skipped_duplicate" | "error";
  result?: BatchItemResult;
  errorMessage?: string;
}

export function BatchImportNFeModal() {
  const [open, setOpen] = useState(false);
  const [filesQueue, setFilesQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "imported" | "skipped" | "error">("all");
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<boolean>(false);
  const router = useRouter();

  // Resetar estado ao abrir
  const handleOpenModal = () => {
    setFilesQueue([]);
    setIsProcessing(false);
    setActiveTab("all");
    abortControllerRef.current = false;
    setOpen(true);
  };

  // Adicionar arquivos à lista e remover duplicatas selecionadas no mesmo lote
  const addFilesToQueue = useCallback((newFiles: FileList | File[]) => {
    const xmlFiles = Array.from(newFiles).filter(
      (f) => f.name.toLowerCase().endsWith(".xml") || f.type === "text/xml"
    );

    if (xmlFiles.length === 0) {
      toast.error("Nenhum arquivo XML válido foi selecionado.");
      return;
    }

    setFilesQueue((prev) => {
      // Evitar duplicatas exatas dentro do mesmo lote selecionado (mesmo nome e tamanho)
      const existingKeys = new Set(prev.map((item) => `${item.file.name}_${item.file.size}`));
      const uniqueNewItems: QueueItem[] = [];

      for (const file of xmlFiles) {
        const key = `${file.name}_${file.size}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          uniqueNewItems.push({
            id: Math.random().toString(36).substring(2, 9),
            file,
            status: "idle",
          });
        }
      }

      const totalDups = xmlFiles.length - uniqueNewItems.length;
      if (totalDups > 0) {
        toast.info(`${totalDups} arquivo(s) idênticos foram descartados do lote.`);
      }

      return [...prev, ...uniqueNewItems];
    });
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const removeFileFromQueue = (id: string) => {
    setFilesQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearQueue = () => {
    setFilesQueue([]);
  };

  // Iniciar processamento com controle de concorrência (2 requisições paralelas)
  const startBatchImport = async () => {
    if (filesQueue.length === 0) return;

    setIsProcessing(true);
    abortControllerRef.current = false;

    const concurrency = 2;
    const queueCopy = [...filesQueue];
    let nextIndex = 0;

    const processItem = async (index: number) => {
      if (abortControllerRef.current) return;
      const current = queueCopy[index];

      // Marcar como processando
      setFilesQueue((prev) =>
        prev.map((item) => (item.id === current.id ? { ...item, status: "processing" } : item))
      );

      const formData = new FormData();
      formData.append("file", current.file);
      formData.append("fileName", current.file.name);

      try {
        const result = await importSingleNFeBatchItem(formData);

        setFilesQueue((prev) =>
          prev.map((item) => {
            if (item.id === current.id) {
              return {
                ...item,
                status: result.status,
                result,
                errorMessage: result.status === "error" ? result.message : undefined,
              };
            }
            return item;
          })
        );
      } catch (err: any) {
        setFilesQueue((prev) =>
          prev.map((item) => {
            if (item.id === current.id) {
              return {
                ...item,
                status: "error",
                errorMessage: err.message || "Falha na comunicação com o servidor.",
              };
            }
            return item;
          })
        );
      }
    };

    // Worker pool
    const workers = Array.from({ length: Math.min(concurrency, queueCopy.length) }, async () => {
      while (nextIndex < queueCopy.length && !abortControllerRef.current) {
        const currentIndex = nextIndex++;
        await processItem(currentIndex);
      }
    });

    await Promise.all(workers);

    setIsProcessing(false);
    router.refresh();
    toast.success("Processamento do lote finalizado!");
  };

  const handleCancelProcessing = () => {
    abortControllerRef.current = true;
    setIsProcessing(false);
    toast.warning("Importação interrompida pelo usuário.");
  };

  // Contadores
  const totalCount = filesQueue.length;
  const processedCount = filesQueue.filter((item) => item.status !== "idle" && item.status !== "processing").length;
  const importedCount = filesQueue.filter((item) => item.status === "imported").length;
  const skippedCount = filesQueue.filter((item) => item.status === "skipped_duplicate").length;
  const errorCount = filesQueue.filter((item) => item.status === "error").length;

  const progressPercent = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;
  const isFinished = processedCount === totalCount && totalCount > 0 && !isProcessing;

  // Filtragem da lista para exibição
  const filteredItems = filesQueue.filter((item) => {
    if (activeTab === "imported") return item.status === "imported";
    if (activeTab === "skipped") return item.status === "skipped_duplicate";
    if (activeTab === "error") return item.status === "error";
    return true;
  });

  return (
    <>
      {/* Botão de acionamento estilizado */}
      <Button
        onClick={handleOpenModal}
        className="rounded-xl flex items-center justify-center gap-2 font-medium shadow-sm transition-all"
      >
        <Layers className="w-4 h-4" />
        Importar XMLs (Lote)
      </Button>

      <Dialog open={open} onOpenChange={(val) => !isProcessing && setOpen(val)}>
        <DialogContent
          className="max-w-3xl w-full p-0 overflow-hidden rounded-2xl flex flex-col max-h-[90vh]"
          showCloseButton={!isProcessing}
        >
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  Importação de NF-e em Lote
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Importe múltiplos XMLs de compras de forma segura. Notas já existentes serão ignoradas sem sobrescrever nada.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* ETAPA 1: Dropzone se ainda não começou o processamento */}
            {!isProcessing && !isFinished && (
              <div>
                <input
                  type="file"
                  multiple
                  accept=".xml"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    isDragging
                      ? "border-primary bg-primary/5 scale-[0.99]"
                      : "border-border hover:border-primary/50 hover:bg-muted/40"
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    Arraste seus arquivos XML aqui ou clique para selecionar
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Você pode selecionar dezenas de arquivos de uma só vez (.xml)
                  </p>
                </div>
              </div>
            )}

            {/* Painel de Status / Barra de Progresso quando estiver processando ou concluído */}
            {(isProcessing || isFinished) && (
              <div className="bg-muted/30 border rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    {isProcessing && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                    {isProcessing ? "Processando lote de NF-e..." : "Processamento concluído!"}
                  </span>
                  <span className="text-xs font-mono font-medium text-muted-foreground">
                    {processedCount} de {totalCount} ({progressPercent}%)
                  </span>
                </div>

                <Progress value={progressPercent} className="h-2.5" />

                {/* Métricas / Contadores */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="bg-background border rounded-xl p-2.5 text-center">
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Total</p>
                    <p className="text-base font-bold text-foreground mt-0.5">{totalCount}</p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 text-center">
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wider">Importadas</p>
                    <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{importedCount}</p>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-center">
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wider">Já Existiam</p>
                    <p className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">{skippedCount}</p>
                  </div>
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-2.5 text-center">
                    <p className="text-[11px] text-destructive font-medium uppercase tracking-wider">Com Erro</p>
                    <p className="text-base font-bold text-destructive mt-0.5">{errorCount}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Aviso Informativo de Integridade */}
            {!isProcessing && !isFinished && filesQueue.length > 0 && (
              <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 p-3.5 rounded-xl text-xs">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Importação Segura e Idempotente</p>
                  <p className="mt-0.5 text-blue-600/90 dark:text-blue-400/90">
                    O SCP verifica número, emitente e loja. Se uma nota já existir no seu banco, ela é marcada como já existente e nenhum dado anterior será sobrescrito ou apagado.
                  </p>
                </div>
              </div>
            )}

            {/* Lista de Arquivos Selecionados / Resultados */}
            {filesQueue.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Arquivos ({filesQueue.length})
                    </span>

                    {/* Filtros em Abas quando houver processamento */}
                    {(isProcessing || isFinished) && (
                      <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg text-xs ml-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab("all")}
                          className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                            activeTab === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Todos ({totalCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("imported")}
                          className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                            activeTab === "imported" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shadow-xs" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Importadas ({importedCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("skipped")}
                          className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                            activeTab === "skipped" ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 shadow-xs" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Ignoradas ({skippedCount})
                        </button>
                        {errorCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveTab("error")}
                            className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                              activeTab === "error" ? "bg-destructive/20 text-destructive shadow-xs" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Erros ({errorCount})
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {!isProcessing && !isFinished && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearQueue}
                      className="text-xs text-muted-foreground hover:text-destructive h-7 px-2"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Limpar lista
                    </Button>
                  )}
                </div>

                {/* Container rolável dos itens */}
                <div className="max-h-64 overflow-y-auto border rounded-xl divide-y bg-background">
                  {filteredItems.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      Nenhum arquivo nesta categoria de filtro.
                    </div>
                  ) : (
                    filteredItems.map((item) => {
                      const isItemProcessing = item.status === "processing";
                      const isItemImported = item.status === "imported";
                      const isItemSkipped = item.status === "skipped_duplicate";
                      const isItemError = item.status === "error";

                      return (
                        <div
                          key={item.id}
                          className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="shrink-0">
                              {isItemProcessing && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                              {isItemImported && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                              {isItemSkipped && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                              {isItemError && <XCircle className="w-4 h-4 text-destructive" />}
                              {item.status === "idle" && <FileCode className="w-4 h-4 text-muted-foreground" />}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground truncate max-w-xs" title={item.file.name}>
                                  {item.file.name}
                                </span>
                                <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
                                  ({(item.file.size / 1024).toFixed(0)} KB)
                                </span>
                              </div>

                              {/* Informações detalhadas da nota quando disponíveis */}
                              {item.result && (
                                <div className="mt-1 flex items-center flex-wrap gap-2 text-[11px]">
                                  {item.result.numero && (
                                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-4">
                                      NF nº {item.result.numero}
                                    </Badge>
                                  )}
                                  {item.result.emitente && (
                                    <span className="text-muted-foreground truncate max-w-[200px]" title={item.result.emitente}>
                                      {item.result.emitente}
                                    </span>
                                  )}
                                  {item.result.valorTotal !== undefined && (
                                    <span className="font-medium text-foreground">
                                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                        item.result.valorTotal
                                      )}
                                    </span>
                                  )}
                                  {item.result.totalItens !== undefined && (
                                    <span className="text-muted-foreground">
                                      • {item.result.totalItens} itens
                                    </span>
                                  )}
                                </div>
                              )}

                              {item.errorMessage && (
                                <p className="text-[11px] text-destructive mt-0.5 truncate" title={item.errorMessage}>
                                  {item.errorMessage}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Badge de Status / Ações à direita */}
                          <div className="flex items-center gap-2 shrink-0">
                            {isItemImported && (
                              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                                Importada
                              </Badge>
                            )}

                            {isItemSkipped && (
                              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]" title="Nota já cadastrada. Mantida intacta.">
                                Já existia (Ignorada)
                              </Badge>
                            )}

                            {isItemError && (
                              <Badge variant="destructive" className="text-[10px]">
                                Falha
                              </Badge>
                            )}

                            {item.status === "idle" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFileFromQueue(item.id)}
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            {/* Link direto para a nota importada */}
                            {item.result?.nfeId && (
                              <a
                                href={`/nfe-importacao/${item.result.nfeId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1 text-[11px] font-medium ml-1"
                              >
                                Ver Nota
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="p-4 border-t bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {filesQueue.length > 0 && !isFinished && (
                <span>{filesQueue.length} arquivo(s) prontos para importar.</span>
              )}
              {isFinished && (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {importedCount} novas notas inseridas no catálogo.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* Botão de Cancelar durante processamento */}
              {isProcessing && (
                <Button variant="outline" size="sm" onClick={handleCancelProcessing} className="rounded-xl">
                  Parar Restante
                </Button>
              )}

              {/* Botões pré-início */}
              {!isProcessing && !isFinished && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="rounded-xl">
                    Fechar
                  </Button>
                  <Button
                    onClick={startBatchImport}
                    disabled={filesQueue.length === 0}
                    className="rounded-xl font-medium"
                    size="sm"
                  >
                    <Upload className="w-4 h-4 mr-1.5" />
                    Iniciar Importação ({filesQueue.length})
                  </Button>
                </>
              )}

              {/* Botões pós-finalização */}
              {isFinished && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilesQueue([]);
                      setIsProcessing(false);
                      setActiveTab("all");
                    }}
                    className="rounded-xl"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Novo Lote
                  </Button>
                  <Button
                    onClick={() => {
                      setOpen(false);
                      router.refresh();
                    }}
                    className="rounded-xl font-medium"
                    size="sm"
                  >
                    Concluir e Ver Histórico
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

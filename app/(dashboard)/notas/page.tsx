"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { NotaFiscal } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

import { getPresignedUploadUrl } from "@/app/actions/storage";
import {
  getNotas,
  createNota,
  deleteNota,
  getDownloadLink,
} from "@/app/actions/notas";
import { getEventos } from "@/app/actions/eventos";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Upload,
  Trash2,
  MoreVertical,
  FileCode,
  File as FileIcon,
  AlertCircle,
  FileText,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Plus,
  Download,
  Loader2,
  CalendarIcon,
} from "lucide-react";
import { toast } from "sonner";
import { UploadZone } from "@/components/notas/upload-zone";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";

export default function NotasFiscaisPage() {
  const { user, hasPermission } = useAuth();
  const [notas, setNotas] = useState<NotaFiscal[]>([]);

  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);


  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [notaToDelete, setNotaToDelete] = useState<string | null>(null);


  const quickUploadInputRef = useRef<HTMLInputElement>(null);
  const [quickUploadTarget, setQuickUploadTarget] = useState<{
    id: string;
    type: "xml" | "pdf";
  } | null>(null);


  const [searchTerm, setSearchTerm] = useState("");
  const [orderBy, setOrderBy] = useState("date_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;


  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Partial<NotaFiscal>>({});

  const [selectedLoteDate, setSelectedLoteDate] = useState<string>("none");


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);


    const notasResult = await getNotas();
    if (notasResult.success && notasResult.data) {
      const mappedNotas: NotaFiscal[] = (notasResult.data as any[]).map(
        (n) => ({
          id: n.id,
          dataUpload: n.dataUpload,
          uploadedBy: n.uploadedBy,
          emitente: n.emitente,
          numero: n.numero,
          serie: n.serie,
          valorTotal: Number(n.valorTotal),
          dataEmissao: n.dataEmissao,
          dataReferencia: n.dataReferencia,
          cnpjEmitente: n.cnpjEmitente,
          chaveAcesso: n.chaveAcesso,
          xmlContent: n.xmlContent,
          pdfUrl: n.pdfUrl,
          xmlUrl: n.xmlUrl,
        }),
      );
      setNotas(mappedNotas);
    }


    const eventosResult = await getEventos();
    if (eventosResult.success && eventosResult.data) {
      const datasSet = new Set<string>();
      (eventosResult.data as any[]).forEach((e) => {
        if (e.status !== "rascunho") {


          const dataIso = new Date(e.dataHora).toISOString().split("T")[0];
          datasSet.add(dataIso);
        }
      });

      setLotesDisponiveis(Array.from(datasSet).sort().reverse());
    }
    setIsLoading(false);
  };

  const uploadToCloud = async (file: File) => {
    const { uploadUrl, publicUrl } = await getPresignedUploadUrl(
      file.name,
      file.type,
      "notas",
    );
    await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    return publicUrl;
  };


  const handleQuickUploadClick = (id: string, type: "xml" | "pdf") => {
    setQuickUploadTarget({ id, type });
    if (quickUploadInputRef.current) {
      quickUploadInputRef.current.value = "";
      quickUploadInputRef.current.accept = type === "xml" ? ".xml" : ".pdf";
      quickUploadInputRef.current.click();
    }
  };

  const processQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !quickUploadTarget || !user) return;
    toast.info("Upload rápido em desenvolvimento.");
    if (quickUploadInputRef.current) quickUploadInputRef.current.value = "";
    setQuickUploadTarget(null);
  };

  // Filtros e Ordenação
  const filteredNotas = useMemo(() => {
    let result = notas.filter((nota) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (nota.emitente || "").toLowerCase().includes(searchLower) ||
        (nota.numero || "").includes(searchLower) ||
        (nota.cnpjEmitente || "").includes(searchLower)
      );
    });

    result.sort((a, b) => {
      const dateA = new Date(a.dataEmissao || a.dataUpload).getTime();
      const dateB = new Date(b.dataEmissao || b.dataUpload).getTime();
      if (orderBy === "date_desc") return dateB - dateA;
      if (orderBy === "date_asc") return dateA - dateB;
      if (orderBy === "val_desc")
        return (b.valorTotal || 0) - (a.valorTotal || 0);
      if (orderBy === "val_asc")
        return (a.valorTotal || 0) - (b.valorTotal || 0);
      return 0;
    });
    return result;
  }, [notas, searchTerm, orderBy]);

  const totalPages = Math.ceil(filteredNotas.length / itemsPerPage);
  const currentNotas = filteredNotas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleFilesSelected = (
    xml: File | null,
    pdf: File | null,
    data: Partial<NotaFiscal>,
  ) => {
    setXmlFile(xml);
    setPdfFile(pdf);
    setParsedData((prev) => ({ ...prev, ...data }));


    if (data.dataEmissao) {

      const dateObj = new Date(data.dataEmissao);
      const dataNota = dateObj.toISOString().split("T")[0];

      if (lotesDisponiveis.includes(dataNota)) {
        setSelectedLoteDate(dataNota);
      }
    }
  };

  const handleSave = async () => {
    if ((!xmlFile && !pdfFile) || !user) return;

    setIsUploading(true);
    toast.info("Processando arquivos...");

    try {
      let uploadedPdfUrl = undefined;
      let uploadedXmlUrl = undefined;
      let xmlTextContent = undefined;

      if (pdfFile) uploadedPdfUrl = await uploadToCloud(pdfFile);
      if (xmlFile) {
        uploadedXmlUrl = await uploadToCloud(xmlFile);
        xmlTextContent = await xmlFile.text();
      }

      let dataFinalEmissao = parsedData.dataEmissao
        ? new Date(parsedData.dataEmissao)
        : undefined;



      let dataRef: Date | undefined = undefined;

      if (selectedLoteDate !== "none") {




        dataRef = new Date(`${selectedLoteDate}T12:00:00.000Z`);
      }

      const result = await createNota({
        fileName: xmlFile?.name || pdfFile?.name || "Nota Fiscal",
        numero: parsedData.numero,
        serie: parsedData.serie,
        emitente: parsedData.emitente,
        cnpjEmitente: parsedData.cnpjEmitente,
        valorTotal: parsedData.valorTotal,

        dataEmissao: dataFinalEmissao,
        dataReferencia: dataRef,
        naturezaOperacao: parsedData.naturezaOperacao,

        chaveAcesso: parsedData.chaveAcesso,
        xmlContent: xmlTextContent,
        pdfUrl: uploadedPdfUrl,
        xmlUrl: uploadedXmlUrl,
        eventoId: undefined,
      });

      if (result.success) {
        toast.success("Nota salva e vinculada com sucesso!");
        loadData();
        setIsUploadOpen(false);
        setXmlFile(null);
        setPdfFile(null);
        setParsedData({});
        setSelectedLoteDate("none");
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao enviar arquivos.");
    } finally {
      setIsUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (notaToDelete) {
      const result = await deleteNota(notaToDelete);
      if (result.success) {
        toast.success("Nota excluída.");
        loadData();
      } else {
        toast.error(result.message);
      }
      setNotaToDelete(null);
    }
  };

  const downloadFile = async (
    urlOrContent: string | undefined,
    filename: string,
  ) => {
    if (!urlOrContent) return;

    let href = urlOrContent;


    if (urlOrContent.startsWith("http")) {
      toast.loading("Gerando link seguro...");

      const signedUrl = await getDownloadLink(urlOrContent);
      toast.dismiss();

      if (signedUrl) {

        window.open(signedUrl, "_blank");
        return;
      } else {
        toast.error(
          "Erro ao gerar link de visualização. O arquivo pode não existir.",
        );
        return;
      }
    } else {

      const blob = new Blob([urlOrContent], { type: "text/xml" });
      href = URL.createObjectURL(blob);
      window.open(href, "_blank");
    }
  };

  if (!hasPermission("notas:ver")) return null;

  return (
    <>
      <PageHeader
        title="Notas Fiscais de Perda"
        description="Gerencie seus documentos (XML e PDF)"
      >

          {hasPermission("notas:upload") && (
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button className="w-full md:w-auto">
                  <Upload className="mr-2 h-4 w-4" /> Nova Nota
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Upload de Documentos</DialogTitle>
                  <DialogDescription>
                    Arraste XML e PDF. Vincule à data do lote para download
                    automático.
                  </DialogDescription>
                </DialogHeader>

                <div className="py-2 space-y-4">
                  <UploadZone
                    onFilesSelected={handleFilesSelected}
                    isUploading={isUploading}
                  />

                  {(xmlFile || pdfFile) && (
                    <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                      <Label
                        htmlFor="lote-data"
                        className="text-blue-600 font-medium"
                      >
                        Vincular ao Lote (Data)
                      </Label>
                      <Select
                        value={selectedLoteDate}
                        onValueChange={setSelectedLoteDate}
                      >
                        <SelectTrigger className="border-blue-200 bg-blue-50">
                          <SelectValue placeholder="Selecione a data do lote..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            Não vincular (Apenas Salvar)
                          </SelectItem>
                          {lotesDisponiveis.map((dataIso) => (
                            <SelectItem key={dataIso} value={dataIso}>
                              {formatDate(dataIso)} - Lote de Perdas
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <DialogFooter className="mt-4 flex flex-row justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsUploadOpen(false)}
                    disabled={isUploading}
                    className="px-6"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={(!xmlFile && !pdfFile) || isUploading}
                    className="px-6"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar Nota"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
      </PageHeader>
      
      <main className="flex-1 flex flex-col space-y-6 px-4 py-5 md:px-8 md:py-6 overflow-hidden">
        <input
          type="file"
          ref={quickUploadInputRef}
          className="hidden"
          onChange={processQuickUpload}
        />
        
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center bg-muted/40 p-3 rounded-lg border">
            <div className="relative w-full sm:w-auto sm:flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por emitente, número..."
                className="pl-9 bg-background"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
              <Select value={orderBy} onValueChange={setOrderBy}>
                <SelectTrigger className="w-full sm:w-45 bg-background">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">Mais recentes</SelectItem>
                  <SelectItem value="date_asc">Mais antigas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32 text-center">Arquivos</TableHead>
                <TableHead>Data de Referência</TableHead>
                <TableHead>Emitente</TableHead>
                <TableHead>Número</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentNotas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Nenhuma nota encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                currentNotas.map((nota) => (
                  <TableRow key={nota.id}>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        {nota.xmlContent && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 bg-blue-50"
                            onClick={() =>
                              downloadFile(
                                (nota.xmlUrl || nota.xmlContent) ?? undefined,
                                `nota-${nota.numero || "sem-numero"}.xml`,
                              )
                            }
                          >
                            <FileCode className="h-4 w-4" />
                          </Button>
                        )}
                        {nota.pdfUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 bg-red-50"
                            onClick={() =>
                              downloadFile(
                                nota.pdfUrl ?? undefined,
                                `nota-${nota.numero || "sem-numero"}.pdf`,
                              )
                            }
                          >
                            <FileIcon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        {nota.dataReferencia
                          ? formatDate(nota.dataReferencia.toString())
                          : nota.dataEmissao
                            ? formatDate(nota.dataEmissao.toString())
                            : "-"}
                        {nota.dataReferencia && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                            Lote
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {nota.emitente || "-"}
                    </TableCell>
                    <TableCell>{nota.numero || "-"}</TableCell>
                    <TableCell className="text-right">
                      {hasPermission("notas:excluir") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setNotaToDelete(nota.id)}
                          className="h-8 w-8 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <AlertDialog
          open={!!notaToDelete}
          onOpenChange={() => setNotaToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Nota Fiscal</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação é irreversível.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  );
}

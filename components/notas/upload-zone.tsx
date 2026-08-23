"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileCode, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotaFiscal } from "@/lib/types";
import { toast } from "sonner";

interface UploadZoneProps {
  onFilesSelected: (
    xml: File | null,
    pdf: File | null,
    parsedData: Partial<NotaFiscal>,
  ) => void;
  isUploading: boolean;
}

export function UploadZone({ onFilesSelected, isUploading }: UploadZoneProps) {
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);


  const parseXML = async (file: File) => {
    try {
      const text = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");

      const infNFe = xmlDoc.getElementsByTagName("infNFe")[0];
      const ide = xmlDoc.getElementsByTagName("ide")[0];
      const emit = xmlDoc.getElementsByTagName("emit")[0];
      const total = xmlDoc.getElementsByTagName("total")[0];

      const dados: Partial<NotaFiscal> = {
        xmlContent: text,
      };

      if (infNFe) {
        dados.chaveAcesso = infNFe.getAttribute("Id")?.replace("NFe", "");
      }
      if (ide) {
        dados.numero = ide.getElementsByTagName("nNF")[0]?.textContent || "";
        dados.serie = ide.getElementsByTagName("serie")[0]?.textContent || "";

        // --- NOVO: Extrair Natureza da Operação ---
        dados.naturezaOperacao =
          ide.getElementsByTagName("natOp")[0]?.textContent || "";

        const dataEmissao =
          ide.getElementsByTagName("dhEmi")[0]?.textContent ||
          ide.getElementsByTagName("dEmi")[0]?.textContent;
        if (dataEmissao) dados.dataEmissao = dataEmissao;
      }
      if (emit) {
        dados.emitente =
          emit.getElementsByTagName("xNome")[0]?.textContent || "";
        dados.cnpjEmitente =
          emit.getElementsByTagName("CNPJ")[0]?.textContent || "";
      }
      if (total) {
        const vNF = total.getElementsByTagName("vNF")[0]?.textContent;
        if (vNF) dados.valorTotal = parseFloat(vNF);
      }

      return dados;
    } catch (e) {
      console.error("Erro ao ler XML", e);
      toast.error("Erro ao ler dados do XML. Preencha manualmente.");
      return {};
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      let newXml = xmlFile;
      let newPdf = pdfFile;
      let parsedData = {};

      for (const file of acceptedFiles) {
        if (file.name.toLowerCase().endsWith(".xml")) {
          newXml = file;
          parsedData = await parseXML(file);
        } else if (file.name.toLowerCase().endsWith(".pdf")) {
          newPdf = file;
        } else {
          toast.warning(`Arquivo ignorado: ${file.name} (Apenas XML ou PDF)`);
        }
      }

      setXmlFile(newXml);
      setPdfFile(newPdf);
      onFilesSelected(newXml, newPdf, parsedData);
    },
    [xmlFile, pdfFile, onFilesSelected],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/xml": [".xml"],
      "application/pdf": [".pdf"],
    },
    disabled: isUploading,
  });

  const removeFile = (type: "xml" | "pdf") => {
    if (type === "xml") {
      setXmlFile(null);
      onFilesSelected(null, pdfFile, {});
    } else {
      setPdfFile(null);
      onFilesSelected(xmlFile, null, {});
    }
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center min-h-40",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
          isUploading && "opacity-50 cursor-not-allowed",
        )}
      >
        <input {...getInputProps()} />
        <div className="bg-primary/10 p-3 rounded-full mb-3">
          <UploadCloud className="h-6 w-6 text-primary" />
        </div>
        {isDragActive ? (
          <p className="text-sm font-medium text-primary">
            Solte os arquivos aqui...
          </p>
        ) : (
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Clique ou arraste arquivos aqui
            </p>
            <p className="text-xs text-muted-foreground">
              Suporta XML da NFe e PDF do Danfe
            </p>
          </div>
        )}
      </div>

      {}
      {(xmlFile || pdfFile) && (
        <div className="grid gap-2">
          {xmlFile && (
            <div className="flex items-center justify-between p-2 border rounded-md bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="bg-blue-100 dark:bg-blue-900/50 p-1.5 rounded">
                  <FileCode className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate max-w-50">
                    {xmlFile.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {(xmlFile.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>
              <button
                onClick={() => removeFile("xml")}
                className="text-muted-foreground hover:text-destructive p-1"
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {pdfFile && (
            <div className="flex items-center justify-between p-2 border rounded-md bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="bg-red-100 dark:bg-red-900/50 p-1.5 rounded">
                  <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate max-w-50">
                    {pdfFile.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {(pdfFile.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>
              <button
                onClick={() => removeFile("pdf")}
                className="text-muted-foreground hover:text-destructive p-1"
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

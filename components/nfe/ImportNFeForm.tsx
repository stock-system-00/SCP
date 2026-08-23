"use client";

import React, { useRef, useState } from "react";
import { importNFeXML } from "@/app/actions/nfe-import";
import { Upload, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ImportNFeForm() {
  const [isUploading, setIsUploading] = useState(false);
  const [duplicateNFe, setDuplicateNFe] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/xml" && !file.name.endsWith(".xml")) {
      toast.error("Por favor, selecione um arquivo XML válido.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await importNFeXML(formData);
      if (res.success) {
        toast.success(`NFe importada com sucesso! ${res.count} itens lidos.`);

        if (res.nfeId) {
          router.push(`/nfe-importacao/${res.nfeId}`);
        }
      } else if (res.error === "DUPLICATED") {
        setDuplicateNFe(res.numero || "Desconhecido");
      } else {
        toast.error(res.error || "Erro ao importar XML");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado ao importar XML.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".xml"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="bg-primary text-primary-foreground px-4 py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 w-full md:w-auto font-medium"
      >
        {isUploading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Importando...
          </>
        ) : (
          <>
            <Upload size={18} />
            Importar XML
          </>
        )}
      </button>

      {}
      <AlertDialog open={!!duplicateNFe} onOpenChange={() => setDuplicateNFe(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertCircle className="w-5 h-5" />
              Nota Fiscal Já Importada
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base pt-2">
              O sistema identificou que a NF-e nº <strong className="text-foreground">{duplicateNFe}</strong> já foi importada anteriormente.
              <br /><br />
              Para evitar duplicidade de itens e custos no seu catálogo, esta importação foi cancelada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogAction onClick={() => setDuplicateNFe(null)} className="w-full sm:w-auto">
              Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

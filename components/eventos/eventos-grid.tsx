"use client";

import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Circle,
  ChevronRightSquare,
  Loader2,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { Evento } from "@/lib/types";
import { useState, useRef } from "react";
import { toast } from "sonner";

export type BatchStatus = "pendente" | "aprovado" | "rejeitado";

export interface LoteDiario {
  data: string;
  dataOriginal: Date;
  eventos: Evento[];
  totalCusto: number;
  status: BatchStatus;
  autor: string;
  nfeEmitida?: boolean;
  nfePdfUrl?: string;
}

interface EventosGridProps {
  lotes: LoteDiario[];
  onSelect: (lote: LoteDiario) => void;
  onUploadNfe: (lote: LoteDiario, base64: string) => Promise<void>;
}

export function EventosGrid({ lotes, onSelect, onUploadNfe }: EventosGridProps) {
  const [updatingDate, setUpdatingDate] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeLoteForUpload, setActiveLoteForUpload] = useState<LoteDiario | null>(null);

  if (lotes.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/5">
        Nenhum lote encontrado.
      </div>
    );
  }

  const handleIconClick = (e: React.MouseEvent, lote: LoteDiario) => {
    e.stopPropagation();
    if (lote.nfePdfUrl) {
      window.open(lote.nfePdfUrl, "_blank");
    } else {
      setActiveLoteForUpload(lote);
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeLoteForUpload) return;
    
    if (file.type !== "application/pdf") {
      toast.error("Por favor, selecione um arquivo PDF.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setUpdatingDate(activeLoteForUpload.data);
      try {
        await onUploadNfe(activeLoteForUpload, base64);
      } catch (error) {
        console.error(error);
      } finally {
        setUpdatingDate(null);
        setActiveLoteForUpload(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        {lotes.map((lote) => (
          <div
            key={lote.data}
            className="group flex items-center justify-between p-3 rounded-md border bg-background hover:bg-muted/40 hover:border-primary/30 transition-all cursor-pointer shadow-sm"
            onClick={() => onSelect(lote)}
          >
            <div className="flex items-center gap-4">
              {}
              <div
                onClick={(e) => handleIconClick(e, lote)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border transition-all cursor-pointer",
                  lote.nfeEmitida
                    ? "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20 hover:scale-105"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:scale-105",
                )}
                title={
                  lote.nfeEmitida
                    ? "Nota Fiscal de Perda: Emitida"
                    : "Marcar Nota Fiscal de Perda como Emitida"
                }
              >
                {updatingDate === lote.data ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : lote.nfeEmitida ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold">{lote.data}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{lote.autor}</span>
                  <span>•</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-4 px-1 text-[10px] border-0 bg-transparent p-0 font-normal",
                      lote.status === "aprovado"
                        ? "text-green-600"
                        : lote.status === "rejeitado"
                          ? "text-red-600"
                          : "text-muted-foreground",
                    )}
                  >
                    {lote.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 md:gap-12">
              <div className="hidden md:block text-right">
                <p className="text-[10px] text-muted-foreground uppercase">
                  Itens
                </p>
                <p className="text-sm font-medium">{lote.eventos.length}</p>
              </div>
              <div className="text-right min-w-20">
                <p className="text-[10px] text-muted-foreground uppercase">
                  Total
                </p>
                <p className="text-sm font-bold">
                  {formatCurrency(lote.totalCusto)}
                </p>
              </div>
              <ChevronRightSquare className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
            </div>
          </div>
        ))}
      </div>

      <input
        type="file"
        accept="application/pdf"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
    </>
  );
}

"use client";

import React, { useState } from "react";
import { UploadCloud, Calendar as CalendarIcon, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { importVendasCSV } from "@/app/actions/import-vendas";
import { toast } from "sonner";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COLUNAS_LOTE = [0, 1, 2, 5, 8];
const COLUNAS_ISOLADO = [0, 2, 3, 4, 7];

type ImportMode = "lote" | "isolado";

export function ImportVendasForm() {
  const [mode, setMode] = useState<ImportMode>("lote");
  const [date, setDate] = useState<Date>();
  const [file, setFile] = useState<File | null>(null);

  const [csvPreview, setCsvPreview] = useState<string[][] | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [dailySummary, setDailySummary] = useState<{ date: string; count: number; total: number }[]>([]);

  const [isUploading, setIsUploading] = useState(false);

  const parseBrazilianDecimal = (val: string) => {
    if (!val) return 0;
    const cleanVal = val.replace(/\./g, "").replace(",", ".");
    const parsed = parseFloat(cleanVal);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleModeChange = (newMode: string) => {
    setMode(newMode as ImportMode);
    resetForm();
  };

  const resetForm = () => {
    setFile(null);
    setCsvPreview(null);
    setTotalRows(0);
    setDailySummary([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      resetForm();

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) return;

        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
        if (lines.length < 2) {
          toast.error("O arquivo parece estar vazio ou não possui dados suficientes.");
          return;
        }

        const separator = lines[0].includes(";") ? ";" : (lines[0].includes("\t") ? "\t" : ",");
        const headerCols = lines[0].split(separator);
        
        if (headerCols.length > 25) {
          toast.error("O arquivo possui muitas colunas e foi recusado por segurança.");
          return;
        }

        const maxPreviewRows = Math.min(10, Math.ceil(lines.length * 0.4));
        const preview = lines.slice(1, maxPreviewRows + 1).map(line => {
          return line.split(separator).map(col => col.trim().replace(/^"|"$/g, ''));
        });

        // Sumarização apenas no modo lote
        if (mode === "lote") {
          const summaryMap: Record<string, { count: number; total: number }> = {};
          
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const cols = line.split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
            if (cols.length < 5) continue;
            
            const dtaEmissao = cols[0]; // A
            const valLiquidoStr = cols[8]; // I

            if (!dtaEmissao) continue;

            if (!summaryMap[dtaEmissao]) summaryMap[dtaEmissao] = { count: 0, total: 0 };
            summaryMap[dtaEmissao].count += 1;
            summaryMap[dtaEmissao].total += parseBrazilianDecimal(valLiquidoStr);
          }

          const summaryArray = Object.keys(summaryMap)
            .map(d => ({ date: d, ...summaryMap[d] }))
            .sort((a, b) => {
              const [d1, m1, y1] = a.date.split('/');
              const [d2, m2, y2] = b.date.split('/');
              return new Date(`${y1}-${m1}-${d1}`).getTime() - new Date(`${y2}-${m2}-${d2}`).getTime();
            });

          setDailySummary(summaryArray);
        }

        setCsvPreview(preview);
        setTotalRows(lines.length - 1); // Desconta cabeçalho
        setFile(selectedFile);
      };

      reader.onerror = () => {
        toast.error("Erro ao ler o arquivo selecionado.");
      };

      reader.readAsText(selectedFile, 'ISO-8859-1');
    }
  };

  const handleImport = async () => {
    if (mode === "isolado" && !date) return;
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);
      
      if (mode === "isolado" && date) {
        formData.append("data", format(date, "yyyy-MM-dd"));
      }

      const result = await importVendasCSV(formData);

      if (result.success) {
        toast.success(`Importação concluída! ${result.count} registros salvos.`);
        resetForm();
      } else {
        toast.error(result.error || "Erro ao importar o arquivo.");
      }
    } catch (error) {
      toast.error("Erro inesperado durante a importação.");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const getColumnLetter = (index: number) => String.fromCharCode(65 + index);
  const activeColumns = mode === "lote" ? COLUNAS_LOTE : COLUNAS_ISOLADO;

  return (
    <div className="space-y-6">
      
      <Tabs defaultValue="lote" onValueChange={handleModeChange} className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 h-12 p-1 bg-surface-2 border">
            <TabsTrigger value="lote" className="rounded-md font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              Múltiplos Dias (Lote)
            </TabsTrigger>
            <TabsTrigger value="isolado" className="rounded-md font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              Dia Único
            </TabsTrigger>
          </TabsList>
        </div>

        {}
        {}
        {}
        <TabsContent value="lote" className="space-y-6 mt-0">
          <div className="bg-surface border rounded-2xl p-6 shadow-sm flex flex-col space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Anexar Relatório em Lote</h3>
                <p className="text-sm text-muted-foreground">Envie o arquivo CSV contendo os dados de 1 ou vários dias misturados.</p>
              </div>
            </div>

            <div className="pt-2 flex-1 flex flex-col">
              <div className="relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-surface-2 transition-colors min-h-[160px]">
                <input
                  key={mode}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />

                {file ? (
                  <div className="flex flex-col items-center text-primary">
                    <FileSpreadsheet className="w-12 h-12 mb-3 opacity-80" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <UploadCloud className="w-12 h-12 mb-3 opacity-50" />
                    <p className="font-medium">Clique ou arraste o arquivo .csv aqui</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>


        {}
        {}
        {}
        <TabsContent value="isolado" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface border rounded-2xl p-6 shadow-sm flex flex-col space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <span className="font-bold">1</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Selecione a Data</h3>
                  <p className="text-sm text-muted-foreground">Qual o dia referente a este relatório?</p>
                </div>
              </div>

              <div className="pt-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal h-12 rounded-xl",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-5 w-5" />
                      {date ? format(date, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => setDate(d)}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className={cn(
              "border rounded-2xl p-6 shadow-sm flex flex-col space-y-4 transition-all duration-300",
              !date ? "bg-surface/50 opacity-60 grayscale-[0.5]" : "bg-surface"
            )}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <span className="font-bold">2</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Anexar Arquivo CSV</h3>
                  <p className="text-sm text-muted-foreground">Envie o arquivo exportado de um dia único.</p>
                </div>
              </div>

              <div className="pt-2 flex-1 flex flex-col">
                <div className="relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-surface-2 transition-colors min-h-[160px]">
                  <input
                    key={mode}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    disabled={!date || isUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />

                  {file ? (
                    <div className="flex flex-col items-center text-primary">
                      <FileSpreadsheet className="w-12 h-12 mb-3 opacity-80" />
                      <p className="font-medium">{file.name}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <UploadCloud className="w-12 h-12 mb-3 opacity-50" />
                      <p className="font-medium">{!date ? "Selecione a data para habilitar" : "Clique ou arraste o arquivo aqui"}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>


      {}
      {csvPreview && (
        <div className="bg-surface border rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Resumo e Pré-visualização
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </h3>
              <p className="text-sm text-muted-foreground">
                Arquivo processado com {totalRows} linhas válidas.
              </p>
            </div>
            {mode === "lote" && (
              <div className="flex items-center text-xs font-semibold bg-emerald-500/10 text-emerald-600 px-3 py-1.5 rounded-full">
                {dailySummary.length} dia(s) identificado(s)
              </div>
            )}
          </div>

          <div className={`grid grid-cols-1 ${mode === 'lote' ? 'md:grid-cols-2' : ''} gap-4 pb-2`}>
            
            {}
            {mode === "lote" && (
              <div className="border rounded-xl overflow-hidden shadow-sm bg-background flex flex-col">
                <div className="bg-muted px-4 py-2 font-semibold text-sm border-b">
                  Totais Diários Lidos da Planilha
                </div>
                <ScrollArea className="flex-1 max-h-[220px]">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-muted/20 border-b sticky top-0">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Data</th>
                        <th className="px-4 py-2 font-semibold text-center">Registros</th>
                        <th className="px-4 py-2 font-semibold text-right">Valor Total Lida</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailySummary.map((day, idx) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-2 font-medium">{day.date}</td>
                          <td className="px-4 py-2 text-center text-muted-foreground">{day.count}</td>
                          <td className="px-4 py-2 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(day.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>
            )}

            {}
            <div className="border rounded-xl overflow-hidden shadow-sm bg-background flex flex-col">
              <div className="bg-muted px-4 py-2 font-semibold text-sm border-b flex justify-between">
                <span>Amostra das Linhas (Preview)</span>
                <span className="font-normal text-muted-foreground text-xs">As colunas claras serão importadas</span>
              </div>
              <ScrollArea className="flex-1 w-full max-h-[220px]">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted/50 border-b">
                    <tr>
                      {csvPreview[0]?.map((_, colIndex) => {
                        const isActive = activeColumns.includes(colIndex);
                        return (
                          <th
                            key={colIndex}
                            className={cn(
                              "px-4 py-3 font-semibold whitespace-nowrap",
                              isActive ? "text-primary border-b-2 border-primary" : "text-muted-foreground/50 opacity-60"
                            )}
                          >
                            {getColumnLetter(colIndex)}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        {row.map((cell, colIndex) => {
                          const isActive = activeColumns.includes(colIndex);
                          return (
                            <td
                              key={colIndex}
                              className={cn(
                                "px-4 py-2 whitespace-nowrap",
                                isActive
                                  ? "text-foreground font-medium"
                                  : "text-muted-foreground/40 bg-muted/10 opacity-50 grayscale"
                              )}
                            >
                              {cell || <span className="italic text-muted-foreground/30">vazio</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 text-primary-700 rounded-xl p-4 flex gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold text-primary">Pronto para importar!</p>
              <p className="opacity-90 mt-1">Verifique os valores acima. Se estiver tudo de acordo com o relatório original, confirme abaixo.</p>
            </div>
          </div>
        </div>
      )}

      {}
      <div className="flex justify-end pt-2">
        <Button
          size="lg"
          onClick={handleImport}
          disabled={!file || (mode === "isolado" && !date) || isUploading}
          className="w-full md:w-auto h-12 px-8 rounded-xl shadow-md transition-transform active:scale-95"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processando Importação...
            </>
          ) : (
            "Confirmar Importação"
          )}
        </Button>
      </div>
    </div>
  );
}

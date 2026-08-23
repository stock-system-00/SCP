
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ItemSearch } from "@/components/forms/item-search";
import { Item } from "@/lib/types";
import { formatCurrency, compressImage } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/lib/auth-context";
import { createEvento, CreateEventoData } from "@/app/actions/eventos";
import { getMotivos, createMotivo } from "@/app/actions/motivos";

import {
  Plus,
  Trash2,
  Camera,
  Send,
  CheckCircle2,
  AlertTriangle,
  ImageIcon,
  Loader2,
  ChevronsUpDown,
  Check,
  Calendar as CalendarIcon,
  ArrowLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { MobileHeaderMenu } from "@/components/MobileHeaderMenu";

const numberInputClass =
  "text-lg h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const customScrollbarClass =
  "overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-thumb]:rounded-full";

interface ItemLancamento {
  tempId: string;
  item: Item;
  quantidade: number;
  unidade: string;
  fotoUrl?: string;
  motivo: string;
}

export default function EventoForm() {
  const router = useRouter();
  const { user, hasPermission, settings } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeItemIdForPhoto, setActiveItemIdForPhoto] = useState<
    string | null
  >(null);

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantidade, setQuantidade] = useState("");

  const [date, setDate] = useState<Date | undefined>(new Date());

  const [motivos, setMotivos] = useState<{ id: string; nome: string }[]>([]);
  const [selectedMotivo, setSelectedMotivo] = useState("");
  const [openMotivo, setOpenMotivo] = useState(false);

  const [itemsList, setItemsList] = useState<ItemLancamento[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [exigirFoto, setExigirFoto] = useState(false);

  useEffect(() => {
    if (settings) {
      setExigirFoto(settings.exigirFoto);
    }
    loadMotivos();
  }, [settings]);

  const loadMotivos = async () => {
    const result = await getMotivos();
    if (result.success && result.data) {
      setMotivos(result.data);
    }
  };

  const handleItemSelect = (item: Item | null) => {
    setSelectedItem(item);
  };

  const handleAddItem = async () => {
    if (!selectedItem || !quantidade || parseFloat(quantidade) <= 0) {
      return;
    }

    const motivoFinal = selectedMotivo.trim() || "Perda Operacional";

    const motivoExistente = motivos.find(
      (m) => m.nome.toLowerCase() === motivoFinal.toLowerCase(),
    );

    if (!motivoExistente && motivoFinal !== "Perda Operacional") {
      createMotivo(motivoFinal).then(() => loadMotivos());
    }

    const novoLancamento: ItemLancamento = {
      tempId: Math.random().toString(36).substr(2, 9),
      item: selectedItem,
      quantidade: parseFloat(quantidade),
      unidade: selectedItem.unidade,
      fotoUrl: undefined,
      motivo: motivoFinal,
    };

    setItemsList([novoLancamento, ...itemsList]);

    setSelectedItem(null);
    setQuantidade("");
    setSelectedMotivo("");

    toast.success("Item adicionado à lista");
  };

  const handleRemoveItem = (tempId: string) => {
    setItemsList(itemsList.filter((i) => i.tempId !== tempId));
  };

  const triggerPhotoInput = (tempId: string) => {
    setActiveItemIdForPhoto(tempId);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeItemIdForPhoto) {
      toast.loading("Processando imagem...", { id: "compress-toast" });

      try {
        const compressedBase64 = await compressImage(file);

        setItemsList((prev) =>
          prev.map((item) => {
            if (item.tempId === activeItemIdForPhoto) {
              return { ...item, fotoUrl: compressedBase64 };
            }
            return item;
          }),
        );
        toast.dismiss("compress-toast");
        toast.success("Foto anexada!");
      } catch (error) {
        toast.dismiss("compress-toast");
        toast.error("Erro ao processar a foto. Tente novamente.");
        console.error(error);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
        setActiveItemIdForPhoto(null);
      }
    }
  };

  const handleSubmit = async () => {
    if (itemsList.length === 0 || !user) return;

    if (exigirFoto) {
      const itensSemFoto = itemsList.filter((i) => !i.fotoUrl);
      if (itensSemFoto.length > 0) {
        toast.error(`Faltam ${itensSemFoto.length} fotos obrigatórias.`);
        return;
      }
    }

    setIsSubmitting(true);
    toast.loading("Enviando dados...", { id: "submit-toast" });

    try {
      const results = [];
      for (const entry of itemsList) {
        const payload: CreateEventoData = {
          itemId: entry.item.id,
          quantidade: entry.quantidade,
          motivo: entry.motivo,
          fotos: entry.fotoUrl ? [entry.fotoUrl] : [],
          dataPersonalizada: date,
        };
        const result = await createEvento(payload);
        results.push(result);
      }

      const errors = results.filter((r) => !r.success);

      toast.dismiss("submit-toast");

      if (errors.length > 0) {
        toast.error(`Erro: ${errors[0].message}`);
        console.error("Erros no envio:", errors);
      } else {
        setShowSuccess(true);
      }
    } catch (error: any) {
      toast.dismiss("submit-toast");
      console.error(error);
      toast.error(`Erro crítico: ${error.message || "Falha na conexão"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    setItemsList([]);
    toast.success("Pronto! Pode lançar os próximos.");
  };

  if (!hasPermission("eventos:criar")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
      </div>
    );
  }

  return (
    <>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="md:hidden pt-4 px-4 pb-2 flex justify-between items-center">
        {hasPermission("dashboard:ver") ? (
          <Button variant="ghost" className="pl-0 gap-2 text-muted-foreground hover:text-foreground h-8" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        ) : (
          <div className="text-lg font-bold text-foreground ml-1">
            Nova Perda
          </div>
        )}
        <MobileHeaderMenu />
      </div>

      <PageHeader
        title="Registrar Perda"
        description="Preencha os detalhes do produto e adicione evidências fotográficas."
      >
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              size="sm"
              className={cn(
                "justify-start text-left font-normal h-8",
                !date && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? (
                format(date, "PPP", { locale: ptBR })
              ) : (
                <span>Data do registro</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              initialFocus
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </PageHeader>

      <main className="flex-1 flex flex-col space-y-4 px-4 py-5 md:px-8 md:py-6 overflow-hidden pb-6 max-w-6xl mx-auto w-full">


        <div className="flex flex-col xl:flex-row gap-3 xl:items-end items-stretch shrink-0 pb-2">
          <div className="flex-1 w-full relative min-w-50">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 ml-1 block">
              Produto
            </label>
            <div className="h-10">
              <ItemSearch
                onSelect={handleItemSelect}
                selectedItem={selectedItem}
                className="w-full h-full"
              />
            </div>
          </div>

          <div className="w-full xl:w-64">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 ml-1 block">
              Motivo
            </label>
            <Popover open={openMotivo} onOpenChange={setOpenMotivo}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openMotivo}
                  className="w-full h-10 justify-between font-normal"
                >
                  {selectedMotivo || "Selecione ou digite..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-62.5 p-0">
                <Command>
                  <CommandInput
                    placeholder="Buscar ou criar motivo..."
                    onValueChange={(val) => {
                      setSelectedMotivo(val);
                    }}
                  />
                  <CommandList>
                    <CommandEmpty>
                      <span className="text-muted-foreground text-xs">
                        "{selectedMotivo}" será criado ao adicionar.
                      </span>
                    </CommandEmpty>
                    <CommandGroup heading="Sugestões">
                      {motivos.map((motivo) => (
                        <CommandItem
                          key={motivo.id}
                          value={motivo.nome}
                          onSelect={(currentValue) => {
                            const originalName =
                              motivos.find(
                                (m) =>
                                  m.nome.toLowerCase() ===
                                  currentValue.toLowerCase(),
                              )?.nome || currentValue;
                            setSelectedMotivo(originalName);
                            setOpenMotivo(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedMotivo === motivo.nome
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {motivo.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2 w-full md:w-auto items-end">
            <div className="flex-1 md:w-24">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 ml-1 block">
                Qtd.
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                className={numberInputClass}
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
              />
            </div>
            <Button
              onClick={handleAddItem}
              disabled={!selectedItem || !quantidade}
              className="h-10 flex-1 md:w-auto px-6"
            >
              Adicionar
            </Button>
          </div>
        </div>

        <div className="flex-1 md:border md:border-border/50 md:rounded-2xl overflow-hidden md:bg-card/40 md:backdrop-blur-md relative flex flex-col md:shadow-sm">
          <div className={`hidden md:block flex-1 ${customScrollbarClass}`}>
            <Table className="border-collapse hidden md:table">
              <TableHeader className="sticky top-0 bg-card/40 backdrop-blur-md z-20 shadow-sm border-b border-white/10">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="w-auto text-slate-300">Produto / Motivo</TableHead>
                  <TableHead className="text-right w-24 text-slate-300">Qtd.</TableHead>
                  <TableHead className="text-center w-20 text-slate-300">Foto</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsList.length > 0 ? (
                  itemsList.map((entry) => (
                    <TableRow key={entry.tempId} className="hover:bg-white/5 border-b border-white/5">
                      <TableCell className="py-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm text-slate-200">
                            {entry.item.nome}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {entry.motivo}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-2 font-medium text-slate-200">
                        {entry.quantidade}{" "}
                        <span className="text-[10px] text-muted-foreground">
                          {entry.unidade}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 rounded-xl ${
                            entry.fotoUrl
                              ? "text-primary bg-primary/10"
                              : "text-muted-foreground/40 hover:bg-white/10 hover:text-primary"
                          } ${exigirFoto && !entry.fotoUrl ? "animate-pulse text-orange-500" : ""}`}
                          onClick={() => triggerPhotoInput(entry.tempId)}
                        >
                          {entry.fotoUrl ? (
                            <ImageIcon className="h-4 w-4" />
                          ) : (
                            <Camera className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="py-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-white/10 hover:text-destructive"
                          onClick={() => handleRemoveItem(entry.tempId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-32 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="bg-muted/30 p-3 rounded-full">
                          <Plus className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                        <span className="text-sm">Lista vazia.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {}
          <div className="md:hidden flex-1 flex flex-col gap-2 py-2 overflow-y-auto">
            {itemsList.length > 0 ? (
              itemsList.map((entry) => (
                <div key={entry.tempId} className="bg-card border border-border/50 rounded-xl p-3 flex flex-col gap-3 shadow-sm relative">
                  <div className="flex justify-between items-start pr-8">
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-foreground leading-tight">
                        {entry.item.nome}
                      </span>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        {entry.motivo}
                      </span>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleRemoveItem(entry.tempId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                  <div className="flex justify-between items-center bg-muted/20 p-2 rounded-lg border border-border/30">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Quantidade</span>
                      <span className="font-bold text-foreground">{entry.quantidade} <span className="text-xs font-normal text-muted-foreground">{entry.unidade}</span></span>
                    </div>
                    
                    <Button
                      variant={entry.fotoUrl ? "secondary" : "outline"}
                      size="sm"
                      className={`h-8 rounded-lg text-xs font-medium gap-1.5 ${
                        entry.fotoUrl
                          ? "text-primary border-primary/20 bg-primary/10 hover:bg-primary/20"
                          : "text-muted-foreground bg-background"
                      } ${exigirFoto && !entry.fotoUrl ? "animate-pulse border-orange-500/50 text-orange-500" : ""}`}
                      onClick={() => triggerPhotoInput(entry.tempId)}
                    >
                      {entry.fotoUrl ? (
                        <><CheckCircle2 className="h-3.5 w-3.5" /> Com foto</>
                      ) : (
                        <><Camera className="h-3.5 w-3.5" /> Adicionar foto</>
                      )}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-32 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <div className="bg-muted/30 p-3 rounded-full">
                  <Plus className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <span className="text-sm">Nenhum item adicionado.</span>
              </div>
            )}
          </div>

          {itemsList.length > 0 && (
            <div className="p-4 md:p-3 bg-background border-t md:bg-white/5 md:border-white/5 flex flex-col gap-3 shrink-0 pb-safe md:pb-3 mt-auto">
              {exigirFoto && itemsList.some((i) => !i.fotoUrl) && (
                <span className="text-xs text-orange-600 bg-orange-500/10 px-2 py-1 rounded-md font-medium flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 mr-1.5" />
                  Fotos pendentes
                </span>
              )}
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="flex-1 h-12 bg-transparent text-foreground"
                  onClick={() => setItemsList([])}
                  disabled={isSubmitting}
                >
                  Limpar
                </Button>
                <Button
                  className="flex-1 h-12 font-bold text-base"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Finalizar"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
          <DialogContent className="sm:max-w-xs text-center">
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-center">Sucesso!</DialogTitle>
              <DialogDescription className="text-center text-xs">
                Registros salvos para {date?.toLocaleDateString("pt-BR")}.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-center">
              <Button onClick={handleSuccessClose} className="w-full" size="sm">
                Ok
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}

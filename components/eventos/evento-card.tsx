
"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Check,
  X,
  MoreVertical,
  Eye,
  Edit,
  Package,
  Clock,
  User,
  ImageIcon,
} from "lucide-react";

import { Evento } from "@/lib/types";
import {
  formatCurrency,
  formatDateTime,
  getStatusColor,
  getStatusLabel,
} from "@/lib/utils";

interface EventoCardProps {
  evento: Evento;
  showActions?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export function EventoCard({
  evento,
  showActions = false,
  onApprove,
  onReject,
}: EventoCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const custoTotal =
    evento.custoSnapshot && evento.quantidade
      ? evento.custoSnapshot * evento.quantidade
      : 0;
  const precoVendaTotal =
    evento.precoVendaSnapshot && evento.quantidade
      ? evento.precoVendaSnapshot * evento.quantidade
      : 0;

  const initials = evento.criadoPor.nome
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            {}
            <div className="relative w-full sm:w-32 h-32 sm:h-auto shrink-0 bg-muted">
              {evento.item?.imagemUrl ? (
                <img
                  src={evento.item.imagemUrl || "/placeholder.svg"}
                  alt={evento.item.nome}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              {evento.evidencias.length > 0 && (
                <button
                  onClick={() => setShowPhotos(true)}
                  className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs font-medium backdrop-blur-sm hover:bg-background"
                >
                  <ImageIcon className="h-3 w-3" />
                  {evento.evidencias.length}
                </button>
              )}
            </div>

            {}
            <div className="flex-1 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">
                      {evento.item?.nome || "Item não vinculado"}
                    </h3>
                    <Badge className={getStatusColor(evento.status)}>
                      {getStatusLabel(evento.status)}
                    </Badge>
                  </div>
                  {evento.item && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {evento.item.codigoInterno} - {evento.item.categoria}
                    </p>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowDetails(true)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver Detalhes
                    </DropdownMenuItem>
                    {showActions && evento.status === "enviado" && (
                      <>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar Vínculo
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onApprove?.(evento.id)}
                          className="text-success"
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Aprovar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onReject?.(evento.id)}
                          className="text-destructive"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Rejeitar
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDateTime(evento.dataHora)}
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  {evento.criadoPor.nome}
                </div>
              </div>

              {}
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <span className="text-lg font-semibold">
                    {evento.quantidade} {evento.unidade}
                  </span>
                  {evento.motivo && (
                    <p className="text-sm text-muted-foreground truncate max-w-50">
                      {evento.motivo}
                    </p>
                  )}
                </div>
                {evento.item && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Custo: {formatCurrency(custoTotal)}
                    </p>
                    <p className="text-sm font-medium text-destructive">
                      Venda: {formatCurrency(precoVendaTotal)}
                    </p>
                  </div>
                )}
              </div>

              {}
              {showActions && evento.status === "enviado" && (
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground bg-transparent"
                    onClick={() => onReject?.(evento.id)}
                  >
                    <X className="mr-1.5 h-4 w-4" />
                    Rejeitar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-success text-success-foreground hover:bg-success/90"
                    onClick={() => onApprove?.(evento.id)}
                  >
                    <Check className="mr-1.5 h-4 w-4" />
                    Aprovar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Evento</DialogTitle>
            <DialogDescription>
              Registrado em {formatDateTime(evento.dataHora)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {evento.item && (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                {evento.item.imagemUrl ? (
                  <img
                    src={evento.item.imagemUrl || "/placeholder.svg"}
                    alt={evento.item.nome}
                    className="h-12 w-12 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium">{evento.item.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {evento.item.codigoInterno}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Quantidade</p>
                <p className="font-medium">
                  {evento.quantidade} {evento.unidade}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge className={getStatusColor(evento.status)}>
                  {getStatusLabel(evento.status)}
                </Badge>
              </div>
              {evento.custoSnapshot && (
                <div>
                  <p className="text-muted-foreground">Custo Total</p>
                  <p className="font-medium">{formatCurrency(custoTotal)}</p>
                </div>
              )}
              {evento.precoVendaSnapshot && (
                <div>
                  <p className="text-muted-foreground">Perda em Venda</p>
                  <p className="font-medium text-destructive">
                    {formatCurrency(precoVendaTotal)}
                  </p>
                </div>
              )}
            </div>

            {evento.motivo && (
              <div>
                <p className="text-sm text-muted-foreground">Motivo</p>
                <p className="text-sm">{evento.motivo}</p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2 border-t">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{evento.criadoPor.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {evento.criadoPor.email}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={showPhotos} onOpenChange={setShowPhotos}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Evidências Fotográficas</DialogTitle>
            <DialogDescription>
              {evento.evidencias.length} foto(s) anexada(s)
            </DialogDescription>
          </DialogHeader>
          {evento.evidencias.length > 0 && (
            <div className="space-y-4">
              <img
                src={
                  evento.evidencias[selectedPhotoIndex].url ||
                  "/placeholder.svg"
                }
                alt={`Evidência ${selectedPhotoIndex + 1}`}
                className="w-full rounded-lg object-cover aspect-video"
              />
              {evento.evidencias.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {evento.evidencias.map((ev, index) => (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedPhotoIndex(index)}
                      className={`shrink-0 rounded-md overflow-hidden ring-2 ${
                        index === selectedPhotoIndex
                          ? "ring-primary"
                          : "ring-transparent"
                      }`}
                    >
                      <img
                        src={ev.url || "/placeholder.svg"}
                        alt={`Thumbnail ${index + 1}`}
                        className="h-16 w-16 object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

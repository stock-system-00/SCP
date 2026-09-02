"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LojaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lojaToEdit: any | null;
  onSave: (data: { id?: string; nome: string; cnpj: string }) => void;
}

export function LojaFormDialog({
  open,
  onOpenChange,
  lojaToEdit,
  onSave,
}: LojaFormDialogProps) {
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");

  useEffect(() => {
    if (open) {
      if (lojaToEdit) {
        setNome(lojaToEdit.nome || "");
        setCnpj(lojaToEdit.cnpj || "");
      } else {
        setNome("");
        setCnpj("");
      }
    }
  }, [open, lojaToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: lojaToEdit?.id,
      nome,
      cnpj,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {lojaToEdit ? "Editar Filial" : "Nova Filial"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Filial *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Loja Centro"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0000-00"
            />
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {lojaToEdit ? "Salvar Alterações" : "Criar Filial"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { CategoriesManager } from "@/components/cadastros/categories-manager";
import { FolderTree } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export default function CategoriasPage() {
  return (
    <>
      <PageHeader
        title="Classificação & Atributos"
        description="Gerencie as categorias para organizar seu catálogo de produtos de forma eficiente."
      />
      <main className="flex-1 space-y-6 px-4 py-5 md:px-8 md:py-6 overflow-y-auto">

        {}
        <div className="space-y-6">
          {}
          <div className="bg-muted/30 p-4 rounded-lg border-l-4 border-l-primary/50 flex flex-col gap-1">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FolderTree className="h-4 w-4" /> Gestão de Categorias
            </h3>
            <p className="text-xs text-muted-foreground">
              Crie grupos como "Bebidas", "Limpeza" ou "Mercearia" para
              facilitar a busca e relatórios.
            </p>
          </div>

          {}
          <CategoriesManager />
        </div>
      </main>
    </>
  );
}

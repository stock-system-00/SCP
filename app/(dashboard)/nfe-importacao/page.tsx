import React from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { ImportNFeForm } from "@/components/nfe/ImportNFeForm";
import { HistoricoNFeList } from "@/components/nfe/HistoricoNFeList";
import { Receipt } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export const metadata = {
  title: "Importação de NFe | Controle",
};

export default async function NFeImportacaoPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const user = await getSession();
  if (!user || !user.ownerId) {
    redirect("/login");
  }

  const page = Number(searchParams?.page) || 1;
  const pageSize = 10;
  const skip = (page - 1) * pageSize;

  const statusFilter = searchParams?.status as string || "todos";


  const whereClause: any = { ownerId: user.ownerId };
  if (statusFilter === "pendente") {
    whereClause.itens = { some: { itemId: null } };
  } else if (statusFilter === "mapeado") {
    whereClause.itens = { every: { itemId: { not: null } } };
  }


  const totalItems = await prisma.nFeCompra.count({
    where: whereClause
  });
  const totalPages = Math.ceil(totalItems / pageSize);


  const historicoRaw = await prisma.nFeCompra.findMany({
    where: whereClause,
    orderBy: { dataImportacao: "desc" },
    skip,
    take: pageSize,
    include: {
      itens: {
        select: { itemId: true }
      }
    }
  });

  const historico = historicoRaw.map(nfe => {
    const totalItens = nfe.itens.length;
    const mapeados = nfe.itens.filter(i => i.itemId !== null).length;
    
    return {
      ...nfe,
      valorTotal: nfe.valorTotal ? Number(nfe.valorTotal) : null,
      mappedCount: mapeados,
      totalCount: totalItens
    };
  });

  return (
    <>
      <PageHeader
        title="Importação de NFe"
        description="Importe arquivos XML das notas fiscais e mapeie os produtos."
      />
      <main className="flex-1 space-y-6 px-4 py-5 md:px-8 md:py-6 overflow-y-auto">
        {}
        <div className="hidden md:block">
          <ImportNFeForm />
        </div>

        {}
        <div className="md:hidden bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-4 rounded-xl text-sm font-medium text-center">
          A importação de XML só está disponível pelo computador.
        </div>

        <div>
          <HistoricoNFeList historico={historico} />
          
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href={page > 1 ? `/nfe-importacao?page=${page - 1}` : "#"} 
                      className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNumber = i + 1;
                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink 
                          href={`/nfe-importacao?page=${pageNumber}`}
                          isActive={pageNumber === page}
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      href={page < totalPages ? `/nfe-importacao?page=${page + 1}` : "#"} 
                      className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

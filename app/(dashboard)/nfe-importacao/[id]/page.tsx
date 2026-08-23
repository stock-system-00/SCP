import React from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, CheckCircle2, AlertCircle, Search, Store } from "lucide-react";
import { MapeamentoNFeItem } from "@/components/nfe/MapeamentoNFeItem";
import { ExcluirNFeButton } from "@/components/nfe/ExcluirNFeButton";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";

export default async function NFeDetalhesPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || !user.ownerId) redirect("/login");

  const resolvedParams = await params;
  const nfe = await prisma.nFeCompra.findUnique({
    where: { id: resolvedParams.id, ownerId: user.ownerId },
    include: {
      itens: {
        include: {
          item: {
            select: {
              id: true,
              nome: true,
              codigoInterno: true
            }
          }
        }
      }
    }
  });

  if (!nfe) redirect("/nfe-importacao");


  const catalogo = await prisma.item.findMany({
    where: { ownerId: user.ownerId, status: "ativo" },
    select: { id: true, nome: true, codigoInterno: true }
  });


  const itens = nfe.itens.map((item: any) => ({
    ...item,
    quantidade: item.quantidade ? Number(item.quantidade) : null,
    valorUnitario: item.valorUnitario ? Number(item.valorUnitario) : null,
    valorTotal: item.valorTotal ? Number(item.valorTotal) : null
  }));

  const pendentes = itens.filter((i: any) => !i.itemId);
  const mapeados = itens.filter((i: any) => i.itemId);

  return (
    <>
      <main className="flex-1 space-y-6 px-4 py-5 md:px-8 md:py-6 overflow-y-auto">
        <div className="flex items-start sm:items-center justify-between gap-4 mb-2 border-b pb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild className="rounded-full shrink-0">
              <Link href="/nfe-importacao">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <PageHeader 
              title="Detalhes da Importação NFe"
              description={`Importado em ${format(new Date(nfe.dataImportacao), "dd/MM/yyyy 'às' HH:mm")}`}
            />
          </div>
          <div className="flex-shrink-0">
            <ExcluirNFeButton id={nfe.id} />
          </div>
        </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface p-4 rounded-2xl border">
          <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold">Data de Emissão</p>
          <p className="font-medium text-foreground">
            {nfe.dataEmissao ? format(new Date(nfe.dataEmissao), "dd/MM/yyyy", { locale: ptBR }) : "-"}
          </p>
        </div>
        <div className="bg-surface p-4 rounded-2xl border">
          <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold">Importado em</p>
          <p className="font-medium text-foreground">
            {format(new Date(nfe.dataImportacao), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="bg-surface p-4 rounded-2xl border">
          <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold">Valor Total</p>
          <p className="font-medium text-foreground">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(nfe.valorTotal || 0))}
          </p>
        </div>
        <div className="bg-surface p-4 rounded-2xl border">
          <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold">Status do Mapeamento</p>
          <div className="flex items-center gap-2">
            {pendentes.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-500 text-xs font-medium">
                <AlertCircle size={14} /> {pendentes.length} Pendentes
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium">
                <CheckCircle2 size={14} /> 100% Mapeado
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-surface border rounded-2xl overflow-hidden">
        <div className="p-4 border-b bg-surface-2/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Store size={20} className="text-primary" />
            Mapeamento de Produtos
          </h2>
          <p className="text-sm text-muted-foreground max-w-md md:text-right">
            Associe os itens da nota aos produtos do seu catálogo. Esta associação será lembrada nas próximas importações.
          </p>
        </div>

        <div className="divide-y">
          {pendentes.map((item: any) => (
            <MapeamentoNFeItem
              key={item.id}
              nfeItem={item}
              catalogo={catalogo}
              isPendente={true}
            />
          ))}
          {mapeados.map((item: any) => (
            <MapeamentoNFeItem
              key={item.id}
              nfeItem={item}
              catalogo={catalogo}
              isPendente={false}
            />
          ))}
        </div>
      </div>
      </main>
    </>
  );
}

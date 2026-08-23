
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { deleteFileFromStorage, getPresignedDownloadUrl } from "./storage";


import { getKeyFromUrl } from "@/lib/utils";


export async function getNotas() {
  const session = await getSession();
  if (!session) return { success: false, data: [] };

  try {
    const notas = await prisma.notaFiscal.findMany({
      where: { ownerId: session.ownerId },
      orderBy: { dataUpload: "desc" },
      include: {
        uploadedBy: {
          select: { nome: true, email: true },
        },
      },
    });

    const formatted = notas.map((nota) => ({
      ...nota,
      valorTotal: Number(nota.valorTotal),
    }));

    return { success: true, data: formatted };
  } catch (error) {
    console.error("Erro ao buscar notas:", error);
    return { success: false, data: [] };
  }
}


export async function createNota(data: any) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {

    if (data.chaveAcesso) {
      const existe = await prisma.notaFiscal.findFirst({
        where: {
          chaveAcesso: data.chaveAcesso,
          ownerId: session.ownerId,
        },
      });
      if (existe) {
        return {
          success: false,
          message:
            "Esta nota fiscal já foi importada anteriormente para sua loja.",
        };
      }
    }

    await prisma.notaFiscal.create({
      data: {
        uploadedById: session.id,
        ownerId: session.ownerId,
        dataUpload: new Date(),
        numero: data.numero,
        serie: data.serie,
        emitente: data.emitente || "Fornecedor Desconhecido",
        cnpjEmitente: data.cnpjEmitente,
        valorTotal: data.valorTotal || 0,
        dataEmissao: data.dataEmissao,
        dataReferencia: data.dataReferencia,
        naturezaOperacao: data.naturezaOperacao,
        chaveAcesso: data.chaveAcesso,
        xmlContent: data.xmlContent,
        pdfUrl: data.pdfUrl,
        xmlUrl: data.xmlUrl,
        eventoId: data.eventoId,
        observacoes: `Arquivo original: ${data.fileName}`,
      },
    });

    revalidatePath("/notas");
    return { success: true };
  } catch (error) {
    console.error("Erro ao salvar nota:", error);
    return { success: false, message: "Erro ao salvar no banco de dados." };
  }
}


export async function deleteNota(id: string) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {

    const nota = await prisma.notaFiscal.findUnique({
      where: { id },
      select: { pdfUrl: true, xmlUrl: true, ownerId: true },
    });

    if (!nota || nota.ownerId !== session.ownerId) {
      return {
        success: false,
        message: "Nota não encontrada ou sem permissão para excluir.",
      };
    }


    if (nota.pdfUrl) {
      const key = getKeyFromUrl(nota.pdfUrl);
      if (key) await deleteFileFromStorage(key);
    }

    if (nota.xmlUrl) {
      const key = getKeyFromUrl(nota.xmlUrl);
      if (key) await deleteFileFromStorage(key);
    }


    await prisma.notaFiscal.delete({ where: { id } });

    revalidatePath("/notas");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir nota:", error);
    return { success: false, message: "Erro ao excluir nota." };
  }
}


export async function getDownloadLink(url: string) {
  const session = await getSession();
  if (!session) return null;

  try {
    const key = getKeyFromUrl(url);
    if (!key) return null;


    const signedUrl = await getPresignedDownloadUrl(key);
    return signedUrl;
  } catch (e) {
    return null;
  }
}

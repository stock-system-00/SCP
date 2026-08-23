
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { requireServerPermission, checkServerPermission } from "@/lib/server-permissions";
import { EventoStatus } from "@prisma/client";
import { r2 } from "@/lib/r2";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { getKeyFromUrl } from "@/lib/utils";

export type CreateEventoData = {
  itemId: string;
  quantidade: number;
  motivo: string;
  fotos?: string[];
  dataPersonalizada?: Date;
};

async function uploadToR2(base64Image: string): Promise<string | null> {
  try {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    

    const header = buffer.toString("hex", 0, 4).toUpperCase();
    let contentType = "";
    let extension = "";

    if (header.startsWith("FFD8FF")) {
      contentType = "image/jpeg";
      extension = "jpg";
    } else if (header === "89504E47") {
      contentType = "image/png";
      extension = "png";
    } else {
      console.error("Tentativa de upload inválido: Tipo de arquivo não suportado.");
      return null;
    }

    const fileName = `eventos/${randomUUID()}.${extension}`;
    const bucketName = process.env.R2_BUCKET_NAME;
    const publicDomain = process.env.R2_PUBLIC_DOMAIN;

    if (!bucketName || !publicDomain) return null;

    await r2.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    const domain = publicDomain.replace(/\/$/, "");
    return `${domain}/${fileName}`;
  } catch (error) {
    console.error("Erro no upload R2:", error);
    return null;
  }
}

// 1. Listar Eventos (ATUALIZADO: Inclui Notas Fiscais)
export async function getEventos() {
  const { session, hasAccess } = await checkServerPermission("eventos:ver_todos");
  if (!session) return { success: false, data: [] };

  try {
    const baseWhere: any = hasAccess 
      ? { ownerId: session.ownerId } 
      : { ownerId: session.ownerId, criadoPorId: session.id };

    if (session.activeLojaId) {
      baseWhere.lojaId = session.activeLojaId;
    }

    const eventos = await prisma.evento.findMany({
      where: baseWhere,
      orderBy: { dataHora: "desc" },
      include: {
        item: { include: { categoria: true } },
        criadoPor: { select: { nome: true, email: true, role: true } },
        evidencias: true,
        notasFiscais: {

          select: { id: true, numero: true, pdfUrl: true, xmlUrl: true },
        },
      },
    });

    const formattedEventos = eventos.map((ev) => ({
      ...ev,
      quantidade: Number(ev.quantidade),
      custoSnapshot: Number(ev.custoSnapshot),
      precoVendaSnapshot: Number(ev.precoVendaSnapshot),
      valorTotal: Number(ev.precoVendaSnapshot) * Number(ev.quantidade),
      item: ev.item
        ? {
            ...ev.item,
            custo: Number(ev.item.custo),
            precoVenda: Number(ev.item.precoVenda),
            custoMedio: Number((ev.item as any).custoMedio || 0),
          }
        : null,
    }));

    return { success: true, data: formattedEventos };
  } catch (error) {
    console.error("Erro ao buscar eventos:", error);
    return { success: false, data: [] };
  }
}

export async function createEvento(data: CreateEventoData) {
  const auth = await requireServerPermission("eventos:criar");
  if (!auth.success) return auth;
  const session = auth.session;
  try {
    const item = await prisma.item.findUnique({ where: { id: data.itemId } });
    if (!item || item.ownerId !== session.ownerId)
      return { success: false, message: "Item não encontrado." };

    const uploadedUrls: string[] = [];
    if (data.fotos) {
      for (const foto of data.fotos) {
        const url = foto.startsWith("http") ? foto : await uploadToR2(foto);
        if (url) {
          uploadedUrls.push(url);
        } else {
          return { success: false, message: "Falha ao enviar a imagem para o servidor. Verifique a conexão ou tente novamente." };
        }
      }
    }

    await prisma.evento.create({
      data: {
        dataHora: data.dataPersonalizada || new Date(),
        motivo: data.motivo,
        status: "rascunho",
        quantidade: data.quantidade,
        unidade: item.unidade,
        custoSnapshot: item.custo,
        precoVendaSnapshot: item.precoVenda,
        item: { connect: { id: data.itemId } },
        criadoPor: { connect: { id: session.id } },
        owner: { connect: { id: session.ownerId } },
        ...(session.activeLojaId && { loja: { connect: { id: session.activeLojaId } } }),
        evidencias: {
          create: uploadedUrls.map((url) => ({
            url,
            userId: session.id,
            motivo: data.motivo,
            ownerId: session.ownerId,
          })),
        },
      },
    });
    revalidatePath("/eventos");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao salvar evento." };
  }
}

export async function updateEventoStatus(id: string, novoStatus: EventoStatus) {
  const auth = await requireServerPermission(
    ["aprovado", "rejeitado"].includes(novoStatus) ? "eventos:aprovar" : "eventos:editar"
  );
  if (!auth.success) return auth;
  const session = auth.session;
  try {
    const baseWhere: any = { id, ownerId: session.ownerId };
    if (session.activeLojaId) baseWhere.lojaId = session.activeLojaId;

    const evento = await prisma.evento.findUnique({
      where: baseWhere,
      include: { evidencias: true },
    });
    await prisma.evento.update({
      where: { id: evento!.id },
      data: {
        status: novoStatus,
        aprovadoPorId: ["aprovado", "rejeitado"].includes(novoStatus)
          ? session.id
          : undefined,
      },
    });
    revalidatePath("/eventos");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao atualizar." };
  }
}

export async function deleteEvento(id: string) {
  const auth = await requireServerPermission("eventos:excluir");
  if (!auth.success) return auth;
  const session = auth.session;
  try {
    const baseWhere: any = { id, ownerId: session.ownerId };
    if (session.activeLojaId) baseWhere.lojaId = session.activeLojaId;

    await prisma.evento.delete({ where: baseWhere });
    revalidatePath("/eventos");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao excluir." };
  }
}

export async function toggleNfeEmitidaLote(eventoIds: string[], nfeEmitida: boolean) {
  const auth = await requireServerPermission("eventos:editar");
  if (!auth.success) return auth;
  const session = auth.session;

  try {

    await prisma.evento.updateMany({
      where: {
        id: { in: eventoIds },
        ownerId: session.ownerId,
      },
      data: {
        nfeEmitida,
      },
    });
    
    revalidatePath("/eventos");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar nfeEmitida em lote:", error);
    return { success: false, message: "Erro ao atualizar status da nota fiscal." };
  }
}


export async function getNotaDoLote(dataString: string) {
  const auth = await requireServerPermission("notas:ver");
  if (!auth.success) return auth;
  const session = auth.session;

  try {
    const start = new Date(`${dataString}T00:00:00.000Z`);
    const end = new Date(`${dataString}T23:59:59.999Z`);

    const baseWhere: any = { ownerId: session.ownerId };
    if (session.activeLojaId) baseWhere.lojaId = session.activeLojaId;

    const nota = await prisma.notaFiscal.findFirst({
      where: {
        ...baseWhere,
        OR: [
          { dataReferencia: { gte: start, lte: end } },
          { dataEmissao: { gte: start, lte: end }, dataReferencia: null },
        ],
      },
      select: { pdfUrl: true, xmlUrl: true, numero: true, xmlContent: true },
      orderBy: { dataUpload: "desc" },
    });

    if (!nota)
      return {
        success: false,
        message: "Nenhuma nota fiscal vinculada a este dia.",
      };


    if (!nota.pdfUrl && !nota.xmlUrl && !nota.xmlContent) {
      return {
        success: false,
        isExpired: true,
        message: `Nota Fiscal Nº ${nota.numero} expirou e o documento foi removido.`,
      };
    }

    let finalUrl = nota.pdfUrl || nota.xmlUrl;

    if (finalUrl && finalUrl.startsWith("http")) {
      const fileKey = getKeyFromUrl(finalUrl);
      if (fileKey && process.env.R2_BUCKET_NAME) {
        const command = new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileKey,
        });
        finalUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });
      }
    } else if (nota.xmlContent) {
      finalUrl = `data:text/xml;base64,${Buffer.from(nota.xmlContent).toString("base64")}`;
    }

    return {
      success: true,
      url: finalUrl,
      filename: nota.numero
        ? `nota-${nota.numero}.pdf`
        : `nota-${dataString}.pdf`,
      type: nota.pdfUrl ? "pdf" : "xml",
    };
  } catch (error) {
    return { success: false, message: "Erro ao buscar nota fiscal." };
  }
}

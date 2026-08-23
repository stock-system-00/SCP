
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatDate } from "./utils";
import { Evento } from "./types";


interface ReportData {
  summary: {
    totalCusto: number;
    totalVenda: number;
    totalQtd: number;
    margemPerda: string;
  };
  topItens: any[];
  topMotivos: any[];
  periodoTexto: string;
}


const COLORS = {
  primary: [79, 70, 229] as [number, number, number],
  secondary: [100, 116, 139] as [number, number, number],
  background: [248, 250, 252] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  black: [15, 23, 42] as [number, number, number],
  danger: [220, 38, 38] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
};

const COMPANY_NAME = "Jardins Delicatessen";
const FOOTER_TEXT = "Relatório gerado automaticamente pelo sistema.";


const formatQuantityPDF = (value: number) => {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
};


const addModernHeader = (doc: jsPDF, title: string, subtitle?: string) => {
  const pageWidth = doc.internal.pageSize.width;

  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY_NAME, 14, 15);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const dataEmissao = `Emissão: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  doc.text(dataEmissao, pageWidth - 14, 15, { align: "right" });

  doc.setTextColor(...COLORS.black);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 45);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.secondary);
    doc.text(subtitle, 14, 52);
  }
};

const drawKpiCard = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
) => {
  const height = 25;
  const radius = 3;

  doc.setFillColor(...COLORS.white);
  doc.roundedRect(x, y, width, height, radius, radius, "F");

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, width, height, radius, radius, "S");

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.secondary);
  doc.setFont("helvetica", "normal");
  doc.text(label, x + width / 2, y + 9, { align: "center" });

  doc.setTextColor(...COLORS.black);
  doc.setFont("helvetica", "bold");

  let fontSize = 13;
  doc.setFontSize(fontSize);
  let textWidth = doc.getTextWidth(value);
  const maxWidth = width - 4;

  while (textWidth > maxWidth && fontSize > 9) {
    fontSize -= 1;
    doc.setFontSize(fontSize);
    textWidth = doc.getTextWidth(value);
  }

  doc.text(value, x + width / 2, y + 19, { align: "center" });
  return height;
};


const addFooter = (doc: jsPDF, pageNum: number, totalPages: number) => {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.secondary);
  doc.text(FOOTER_TEXT, 14, pageHeight - 10);


  doc.text(
    `Página ${pageNum} de ${totalPages}`,
    pageWidth - 14,
    pageHeight - 10,
    {
      align: "right",
    },
  );

  doc.setDrawColor(...COLORS.border);
  doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
};


export const generateReportPDF = (data: ReportData) => {
  const doc = new jsPDF();

  addModernHeader(
    doc,
    "Relatório Gerencial de Perdas",
    `Período: ${data.periodoTexto}`,
  );

  const kpiY = 60;
  const cardWidth = 43;
  const gap = 5;
  const pageWidth = doc.internal.pageSize.width;
  const startX = (pageWidth - (cardWidth * 4 + gap * 3)) / 2;

  drawKpiCard(
    doc,
    startX,
    kpiY,
    cardWidth,
    "CUSTO TOTAL",
    formatCurrency(data.summary.totalCusto),
  );
  drawKpiCard(
    doc,
    startX + cardWidth + gap,
    kpiY,
    cardWidth,
    "VENDA PERDIDA",
    formatCurrency(data.summary.totalVenda),
  );
  drawKpiCard(
    doc,
    startX + (cardWidth + gap) * 2,
    kpiY,
    cardWidth,
    "OCORRÊNCIAS",
    formatQuantityPDF(data.summary.totalQtd),
  );
  drawKpiCard(
    doc,
    startX + (cardWidth + gap) * 3,
    kpiY,
    cardWidth,
    "MARGEM",
    data.summary.margemPerda,
  );

  let finalY = kpiY + 35;

  doc.setFontSize(11);
  doc.setTextColor(...COLORS.black);
  doc.setFont("helvetica", "bold");
  doc.text("Top 10 Itens Críticos", 14, finalY);

  const itensData = data.topItens.map((item: any, index: number) => [
    index + 1,
    item.item.codigoInterno || "-",
    item.item.nome,
    `${formatQuantityPDF(item.qtdPerda)} ${item.item.unidade}`,
    formatCurrency(item.custoPerda),
    `${Number(item.taxaPerda).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
  ]);

  autoTable(doc, {
    startY: finalY + 4,
    head: [["RANK", "CÓD.", "PRODUTO", "QTD.", "CUSTO", "TAXA PERDA"]],
    body: itensData,
    theme: "plain",
    headStyles: {
      fillColor: COLORS.background,
      textColor: COLORS.secondary,
      fontStyle: "bold",
      fontSize: 9,
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      lineColor: COLORS.border,
      lineWidth: { top: 0, right: 0, bottom: 0.5, left: 0 },
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 25 },
      2: { cellWidth: "auto" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
      5: {
        cellWidth: 30,
        halign: "right",
        textColor: COLORS.danger,
        fontStyle: "bold",
      },
    },
    didParseCell: (data) => {
      if (data.row.index === 0 && data.section === "body") {
        data.cell.styles.fillColor = [254, 242, 242];
      }
    },
  });


  finalY = (doc as any).lastAutoTable.finalY + 15;

  if (finalY > 220) {
    doc.addPage();
    finalY = 20;
  }

  doc.setFontSize(11);
  doc.setTextColor(...COLORS.black);
  doc.setFont("helvetica", "bold");
  doc.text("Análise por Motivo", 14, finalY);

  const motivosData = data.topMotivos.map((m: any) => {
    const motivoTexto = m.motivo.toUpperCase();
    const itensStr =
      m.topItens && m.topItens.length > 0
        ? m.topItens
            .map(
              (i: any) =>
                `${i.nome} (${formatQuantityPDF(i.qtd)} ${i.unidade})`,
            )
            .join("\n")
        : "-";

    return [
      motivoTexto,
      itensStr,
      formatQuantityPDF(m.quantidade),
      formatCurrency(m.custo),
    ];
  });

  autoTable(doc, {
    startY: finalY + 4,
    head: [["MOTIVO", "ITENS AFETADOS", "QTD", "IMPACTO"]],
    body: motivosData,
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontSize: 9,
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      lineColor: COLORS.border,
      valign: "top",
    },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: "bold" },
      1: { cellWidth: "auto" },
      2: { halign: "right", cellWidth: 25 },
      3: { halign: "right", cellWidth: 35, fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: COLORS.background },
  });


  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  doc.save(`relatorio_gerencial_${new Date().toISOString().split("T")[0]}.pdf`);
};


export const generateEventPDF = (
  eventos: Evento[],
  titulo: string = "Relatório de Lote",
) => {
  const doc = new jsPDF();

  const dataReferencia =
    eventos.length > 0
      ? formatDate(eventos[0].dataHora)
      : formatDate(new Date().toISOString());
  const subtitulo =
    eventos.length > 1
      ? `Data de Referência: ${dataReferencia}`
      : `Registro Individual`;

  addModernHeader(doc, titulo, subtitulo);

  let finalY = 60;
  let totalCustoGeral = 0;

  const tableRows = eventos.map((evento: Evento, index: number) => {
    const custoTotal = (evento.custoSnapshot || 0) * Number(evento.quantidade);
    totalCustoGeral += custoTotal;

    return [
      index + 1,
      evento.item?.codigoInterno || "-",
      evento.item?.nome || "Item desconhecido",
      evento.motivo || "-",
      `${formatQuantityPDF(Number(evento.quantidade))} ${evento.unidade}`,
      formatCurrency(Number(evento.custoSnapshot)),
      formatCurrency(custoTotal),
    ];
  });

  autoTable(doc, {
    startY: finalY,
    head: [["#", "CÓDIGO", "PRODUTO", "MOTIVO", "QTD", "UNITÁRIO", "TOTAL"]],
    body: tableRows,
    theme: "plain",
    headStyles: {
      fillColor: COLORS.background,
      textColor: COLORS.secondary,
      fontStyle: "bold",
      fontSize: 8,
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      lineColor: COLORS.border,
      lineWidth: { bottom: 0.5 },
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 20 },
      2: { cellWidth: "auto", fontStyle: "bold" },
      3: { cellWidth: 30 },
      4: { halign: "right", cellWidth: 20 },
      5: { halign: "right", cellWidth: 25 },
      6: { halign: "right", cellWidth: 25, textColor: COLORS.danger },
    },
    alternateRowStyles: { fillColor: COLORS.background },
  });

  finalY = (doc as any).lastAutoTable.finalY + 10;

  if (finalY > 250) {
    doc.addPage();
    finalY = 20;
  }

  const boxX = 14;
  const boxWidth = doc.internal.pageSize.width - 28;
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(boxX, finalY, boxWidth, 15, 2, 2, "F");

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.text("CUSTO TOTAL DO LOTE:", boxX + 5, finalY + 10);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(totalCustoGeral), boxX + boxWidth - 5, finalY + 10, {
    align: "right",
  });

  const pageHeight = doc.internal.pageSize.height;
  let signY = pageHeight - 50;

  if (finalY > signY - 30) {
    doc.addPage();
    signY = 40;
  }

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.5);

  doc.line(20, signY, 90, signY);
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.secondary);
  doc.text("Autor / Responsável", 55, signY + 5, { align: "center" });

  doc.line(120, signY, 190, signY);
  doc.text("Auditoria / Conferência", 155, signY + 5, { align: "center" });


  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  const nomeArquivo =
    eventos.length === 1
      ? `registro_individual_${formatDate(eventos[0].dataHora).replace(/\//g, "-")}.pdf`
      : `lote_${dataReferencia.replace(/\//g, "-")}.pdf`;

  doc.save(nomeArquivo);
};


export const generateEvolucaoPDF = (data: {
  historico: any[];
  produtoNome: string;
  periodoTexto: string;
  metaPerda: number;
}) => {
  const doc = new jsPDF();

  addModernHeader(
    doc,
    "Evolução de Perdas e Vendas",
    `Produto: ${data.produtoNome} | Período: ${data.periodoTexto}`,
  );

  let finalY = 60;

  doc.setFontSize(11);
  doc.setTextColor(...COLORS.black);
  doc.setFont("helvetica", "bold");
  doc.text("Detalhamento Financeiro Histórico", 14, finalY);

  const tableRows = data.historico.map((h: any) => {
    let evolucaoTxt = "-";
    if (h.statusAumento === "aumentou") evolucaoTxt = "AUMENTOU";
    if (h.statusAumento === "diminuiu") evolucaoTxt = "DIMINUIU";
    if (h.statusAumento === "manteve") evolucaoTxt = "MANTEVE";

    return [
      h.label,
      formatCurrency(h.faturamento),
      formatCurrency(h.custoPerda),
      `${h.taxaPerda.toFixed(2)}%`,
      evolucaoTxt,
    ];
  });

  autoTable(doc, {
    startY: finalY + 4,
    head: [["MÊS", "FATURAMENTO", "CUSTO PERDA", "TAXA PERDA", "EVOLUÇÃO"]],
    body: tableRows,
    theme: "plain",
    headStyles: {
      fillColor: COLORS.background,
      textColor: COLORS.secondary,
      fontStyle: "bold",
      fontSize: 9,
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      lineColor: COLORS.border,
      lineWidth: { bottom: 0.5 },
    },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: "bold" },
      1: { cellWidth: 40, halign: "right" },
      2: { cellWidth: 40, halign: "right", textColor: COLORS.danger },
      3: { cellWidth: 35, halign: "right", fontStyle: "bold" },
      4: { cellWidth: 35, halign: "center" },
    },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.column.index === 4) {
        const text = hookData.cell.raw as string;
        if (text === "AUMENTOU") hookData.cell.styles.textColor = COLORS.danger;
        else if (text === "DIMINUIU") hookData.cell.styles.textColor = COLORS.success;
        else if (text === "MANTEVE") hookData.cell.styles.textColor = COLORS.secondary;
      }
      if (hookData.section === "body" && hookData.column.index === 3) {
        const rowData = data.historico[hookData.row.index];
        if (rowData && rowData.taxaPerda > data.metaPerda) {
          hookData.cell.styles.textColor = COLORS.danger;
        } else {
          hookData.cell.styles.textColor = COLORS.success;
        }
      }
    },
  });

  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  doc.save(`evolucao_${new Date().toISOString().split("T")[0]}.pdf`);
};

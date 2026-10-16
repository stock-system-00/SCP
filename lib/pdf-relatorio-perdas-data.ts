import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "./utils";

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

const DEFAULT_COMPANY_NAME = "Jardins Delicatessen";
const FOOTER_TEXT = "Relatório gerado automaticamente pelo sistema.";

const formatQuantityPDF = (value: number) => {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
};

const addModernHeader = (
  doc: jsPDF,
  title: string,
  subtitle?: string,
  companyName: string = DEFAULT_COMPANY_NAME
) => {
  const pageWidth = doc.internal.pageSize.width;

  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(companyName, 14, 15);

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

const addFooter = (doc: jsPDF, pageNumber: number, totalPages: number) => {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.secondary);
  doc.setFont("helvetica", "normal");
  doc.text(FOOTER_TEXT, 14, pageHeight - 10);
  doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - 14, pageHeight - 10, {
    align: "right",
  });
};

export interface RelatorioPerdasDataRow {
  data: string;
  totalEventos: number;
  quantidadeTotal: number;
  valorTotal: number;
  temNfe: boolean;
  nfeStatusTexto: string;
}

export interface RelatorioPerdasTotais {
  diasCount: number;
  totalEventos: number;
  quantidadeTotal: number;
  valorTotal: number;
  diasComNfe: number;
  diasSemNfe: number;
}

export function generatePerdasPorDataPDF({
  dados,
  totais,
  filtroNfeTexto,
  periodoTexto,
  companyName,
}: {
  dados: RelatorioPerdasDataRow[];
  totais: RelatorioPerdasTotais;
  filtroNfeTexto: string;
  periodoTexto: string;
  companyName?: string;
}) {
  const doc = new jsPDF();

  const subtitulo = `Período: ${periodoTexto} | Filtro NF-e: ${filtroNfeTexto}`;
  addModernHeader(doc, "Relatório de Perdas por Data e NF-e", subtitulo, companyName);

  let finalY = 60;

  // Mini Cards de Resumo
  const pageWidth = doc.internal.pageSize.width;
  const cardWidth = (pageWidth - 28 - 9) / 4;
  const cards = [
    { label: "DIAS REGISTRADOS", val: String(totais.diasCount) },
    { label: "TOTAL DE EVENTOS", val: String(totais.totalEventos) },
    { label: "STATUS NF-E", val: `${totais.diasComNfe} c/ NF / ${totais.diasSemNfe} s/ NF` },
    { label: "VALOR TOTAL", val: formatCurrency(totais.valorTotal) },
  ];

  cards.forEach((c, i) => {
    const x = 14 + i * (cardWidth + 3);
    doc.setFillColor(...COLORS.white);
    doc.roundedRect(x, finalY, cardWidth, 18, 2, 2, "F");
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, finalY, cardWidth, 18, 2, 2, "S");

    doc.setFontSize(7);
    doc.setTextColor(...COLORS.secondary);
    doc.setFont("helvetica", "normal");
    doc.text(c.label, x + cardWidth / 2, finalY + 6, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.black);
    doc.text(c.val, x + cardWidth / 2, finalY + 13, { align: "center" });
  });

  finalY += 24;

  const tableRows = dados.map((row) => [
    row.data,
    row.totalEventos.toString(),
    row.nfeStatusTexto,
    formatCurrency(row.valorTotal),
  ]);

  // Linha de total
  tableRows.push([
    "TOTAL GERAL",
    totais.totalEventos.toString(),
    `${totais.diasComNfe} c/ NF | ${totais.diasSemNfe} s/ NF`,
    formatCurrency(totais.valorTotal),
  ]);

  autoTable(doc, {
    startY: finalY,
    head: [["DATA", "Nº EVENTOS", "NOTA FISCAL", "VALOR TOTAL (R$)"]],
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
      0: { cellWidth: 35, fontStyle: "bold" },
      1: { cellWidth: 35, halign: "center" },
      2: { cellWidth: 50, halign: "center" },
      3: { cellWidth: "auto", halign: "right", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      const isLastRow = data.row.index === tableRows.length - 1;
      if (data.section === "body") {
        if (isLastRow) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = COLORS.background;
          if (data.column.index === 3) {
            data.cell.styles.textColor = COLORS.primary;
          }
        } else {
          if (data.column.index === 2) {
            const raw = data.cell.raw as string;
            if (raw.includes("ANEXADA") || raw.includes("EMITIDA")) {
              data.cell.styles.textColor = COLORS.success;
              data.cell.styles.fontStyle = "bold";
            } else if (raw.includes("PENDENTE") || raw.includes("NÃO")) {
              data.cell.styles.textColor = COLORS.danger;
              data.cell.styles.fontStyle = "bold";
            }
          }
        }
      }
    },
    alternateRowStyles: { fillColor: COLORS.background },
  });

  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  const safePeriodo = periodoTexto.replace(/[\/\s]/g, "-").toLowerCase();
  doc.save(`relatorio-perdas-datas-${safePeriodo}.pdf`);
}

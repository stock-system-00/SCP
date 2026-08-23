import * as pdfjsLib from "pdfjs-dist";
import { TextItem } from "pdfjs-dist/types/src/display/api";



pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface ExtractedData {
  emitente?: string;
  numero?: string;
  serie?: string;
  dataEmissao?: string;
  valorTotal?: number;
  chaveAcesso?: string;
  cnpj?: string;
}

export async function parsePdfInvoice(file: File): Promise<ExtractedData> {
  try {

    const arrayBuffer = await file.arrayBuffer();


    const loadingTask = pdfjsLib.getDocument(arrayBuffer);
    const pdf = await loadingTask.promise;

    let fullText = "";

    // 3. Ler apenas a primeira página (geralmente onde estão os dados do cabeçalho)
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();

    // 4. Juntar os itens de texto numa única string para análise
    // Adicionamos um espaço ou quebra de linha para separar os campos visuais
    fullText = textContent.items
      .map((item) => (item as TextItem).str)
      .join(" | "); // Usamos pipe para separar visualmente e facilitar o regex

    console.log("Texto extraído do PDF:", fullText); // Para debug

    // 5. Extrair dados usando Regex (Padrões comuns de DANFE)
    const data: ExtractedData = {};

    // --- Extração de VALOR TOTAL ---
    // Procura por "VALOR TOTAL DA NOTA" seguido de um número monetário
    const valorMatch = fullText.match(
      /VALOR\s*TOTAL\s*dA\s*NOTA.*?\|\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i,
    );
    if (valorMatch) {
      data.valorTotal = parseFloat(
        valorMatch[1].replace(/\./g, "").replace(",", "."),
      );
    }

    // --- Extração de NÚMERO DA NOTA ---
    // Procura por "Nº" ou "Numero" seguido de dígitos
    const numeroMatch = fullText.match(/N\.?º\.?\s*:?\s*(\d{1,9})/i);
    if (numeroMatch) {
      data.numero = numeroMatch[1];
    }


    const serieMatch = fullText.match(/SÉRIE\s*:?\s*(\d{1,3})/i);
    if (serieMatch) {
      data.serie = serieMatch[1];
    }



    const dataMatch = fullText.match(
      /DATA\s*dA\s*EMISS[ÃA]O.*?(\d{2}\/\d{2}\/\d{4})/i,
    );
    if (dataMatch) {

      const [dia, mes, ano] = dataMatch[1].split("/");
      data.dataEmissao = `${ano}-${mes}-${dia}`;
    }



    const chaveMatch = fullText.match(
      /(\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4})/,
    );
    if (chaveMatch) {
      data.chaveAcesso = chaveMatch[1].replace(/\s/g, "");
    }

    // --- Extração de CNPJ ---
    // Procura padrão de CNPJ
    const cnpjMatch = fullText.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
    if (cnpjMatch) {
      data.cnpj = cnpjMatch[1];
    }

    // --- Tentativa de Extrair EMITENTE ---
    // O emitente é difícil pois não tem label fixo.
    // Pegamos o texto que costuma estar perto do topo ou logo após "RECEBEMOS DE"
    const emitenteMatch = fullText.match(
      /RECEBEMOS\s*DE\s*(.*?)\s*OS\s*PRODUTOS/i,
    );
    if (emitenteMatch) {
      data.emitente = emitenteMatch[1].replace(/\|/g, "").trim();
    }

    return data;
  } catch (error) {
    console.error("Erro ao processar PDF:", error);
    return {};
  }
}


import { Item } from "@/lib/types";

export interface ParsedItemCSV {
  codigoInterno: string;
  nome?: string;
  categoria?: string;
  unidade?: Item["unidade"];
  codigoBarras?: string;
  custo?: number;
  precoVenda?: number;
}

export async function parseItemsCSV(file: File): Promise<ParsedItemCSV[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        reject(new Error("Arquivo vazio"));
        return;
      }

      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
      if (lines.length < 2) {
        resolve([]);
        return;
      }

      // Função para converter valores monetários BR (ex: "1.200,50" ou "1,624375")
      const parseMoney = (val: string | undefined) => {
        if (!val) return 0;
        const cleanVal = val
          .replace("R$", "")
          .trim()
          .replace(/\./g, "")
          .replace(",", ".");
        return parseFloat(cleanVal) || 0;
      };

      // Detecta cabeçalhos pelo nome se existirem
      const headerLine = lines[0].toLowerCase();
      const headerCols = headerLine.split(";").map((h) => h.trim());

      const codIdx = headerCols.findIndex((c) =>
        c.includes("codigo") || c.includes("código") || c.includes("cod")
      );
      const nomeIdx = headerCols.findIndex((c) =>
        c.includes("nome") || c.includes("descricao") || c.includes("descrição")
      );
      const catIdx = headerCols.findIndex((c) => c.includes("categoria") || c.includes("cat"));
      const unIdx = headerCols.findIndex((c) => c.includes("unidade") || c.includes("un"));
      const barIdx = headerCols.findIndex((c) => c.includes("barra") || c.includes("ean"));
      const custoIdx = headerCols.findIndex((c) => c.includes("custo"));
      const precoIdx = headerCols.findIndex((c) =>
        c.includes("preco") || c.includes("preço") || c.includes("venda")
      );

      const hasNamedHeaders = codIdx !== -1 && (precoIdx !== -1 || nomeIdx !== -1);

      const parsedItems: ParsedItemCSV[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(";");
        if (cols.length < 2) continue;

        let codigoInterno = "";
        let nome: string | undefined = undefined;
        let categoria: string | undefined = undefined;
        let unidade: Item["unidade"] | undefined = undefined;
        let codigoBarras: string | undefined = undefined;
        let custo: number | undefined = undefined;
        let precoVenda: number | undefined = undefined;

        if (hasNamedHeaders) {
          codigoInterno = codIdx !== -1 ? cols[codIdx]?.trim() : "";
          if (nomeIdx !== -1 && cols[nomeIdx]?.trim()) {
            nome = cols[nomeIdx].trim().toUpperCase();
          }
          if (catIdx !== -1 && cols[catIdx]?.trim()) {
            categoria = cols[catIdx].trim().replace(/^\*/, "");
          }
          if (unIdx !== -1 && cols[unIdx]?.trim()) {
            const rawUn = cols[unIdx].trim().toUpperCase();
            unidade = ["UN", "KG", "CX", "L"].includes(rawUn) ? (rawUn as Item["unidade"]) : "UN";
          }
          if (barIdx !== -1 && cols[barIdx]?.trim()) {
            codigoBarras = cols[barIdx].trim();
          }
          if (custoIdx !== -1 && cols[custoIdx]?.trim()) {
            custo = parseMoney(cols[custoIdx]);
          }
          if (precoIdx !== -1 && cols[precoIdx]?.trim()) {
            precoVenda = parseMoney(cols[precoIdx]);
          }
        } else {
          // Layout posicional fallback
          if (cols.length >= 6) {
            // Formato padrão do modelo completo:
            // 0: codigoInterno, 1: nome, 2: categoria, 3: unidade, 4: codigoBarras, 5: custo, 6: precoVenda
            codigoInterno = cols[0]?.trim();
            nome = cols[1]?.trim().toUpperCase();
            categoria = cols[2]?.trim().replace(/^\*/, "");
            const rawUn = cols[3]?.trim().toUpperCase();
            unidade = ["UN", "KG", "CX", "L"].includes(rawUn) ? (rawUn as Item["unidade"]) : "UN";
            codigoBarras = cols[4]?.trim() || "";
            custo = parseMoney(cols[5]);
            precoVenda = parseMoney(cols[6]);
          } else if (cols.length === 4) {
            // Formato 4 colunas: codigo;descricao;unidade;precoVenda
            codigoInterno = cols[0]?.trim();
            if (cols[1]?.trim()) nome = cols[1].trim().toUpperCase();
            const rawUn = cols[2]?.trim().toUpperCase();
            if (rawUn) {
              unidade = ["UN", "KG", "CX", "L"].includes(rawUn) ? (rawUn as Item["unidade"]) : "UN";
            }
            precoVenda = parseMoney(cols[3]);
          } else if (cols.length === 2) {
            // Formato 2 colunas: codigo;precoVenda
            codigoInterno = cols[0]?.trim();
            precoVenda = parseMoney(cols[1]);
          } else {
            codigoInterno = cols[0]?.trim();
            if (cols[1]?.trim()) nome = cols[1].trim().toUpperCase();
            if (cols[2]?.trim()) precoVenda = parseMoney(cols[2]);
          }
        }

        if (!codigoInterno) continue;

        parsedItems.push({
          codigoInterno,
          nome,
          categoria,
          unidade,
          codigoBarras,
          custo,
          precoVenda,
        });
      }

      console.log(`Importação concluída: ${parsedItems.length} linhas processadas.`);
      resolve(parsedItems);
    };

    reader.onerror = () => {
      reject(new Error("Erro ao ler o arquivo"));
    };

    reader.readAsText(file, "ISO-8859-1");
  });
}

export async function parsePrecosCSV(file: File): Promise<{ codigoInterno: string; precoVenda: number }[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        reject(new Error("Arquivo vazio"));
        return;
      }

      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
      const itemsToUpdate: { codigoInterno: string; precoVenda: number }[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(";");
        if (cols.length < 4) continue;

        // cod_item is index 0, val_preco_venda_a is index 3
        const codigoInterno = cols[0]?.trim();
        const precoVendaRaw = cols[3]?.trim() || "0";

        if (!codigoInterno) continue;

        const parseMoney = (val: string) => {
          if (!val) return 0;
          const cleanVal = val
            .replace("R$", "")
            .trim()
            .replace(/\./g, "")
            .replace(",", ".");
          return parseFloat(cleanVal) || 0;
        };

        const precoVenda = parseMoney(precoVendaRaw);
        itemsToUpdate.push({ codigoInterno, precoVenda });
      }

      console.log(`Leitura de preços concluída: ${itemsToUpdate.length} itens encontrados.`);
      resolve(itemsToUpdate);
    };

    reader.onerror = () => {
      reject(new Error("Erro ao ler o arquivo"));
    };

    reader.readAsText(file, "ISO-8859-1");
  });
}

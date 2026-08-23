
import { Item } from "@/lib/types";

export async function parseItemsCSV(file: File): Promise<Item[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        reject(new Error("Arquivo vazio"));
        return;
      }


      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
      const newItems: Item[] = [];

      // Pula a primeira linha (cabeçalho)
      for (let i = 1; i < lines.length; i++) {
        // Limpa a linha de espaços extras
        const line = lines[i].trim();
        if (!line) continue;

        // Divide as colunas por ponto e vírgula
        const cols = line.split(";");

        // Validação básica: O arquivo Gama Jardins tem 7 colunas
        // Se tiver menos de 6, provavelmente é linha quebrada ou inválida
        if (cols.length < 6) continue;

        // Função para converter valores monetários BR (ex: "1.200,50" ou "1,624375")
        const parseMoney = (val: string) => {
          if (!val) return 0;



          const cleanVal = val
            .replace("R$", "")
            .trim()
            .replace(/\./g, "") // Remove pontos de milhar (Cuidado: se o CSV usar ponto como decimal, isso quebra, mas no padrão BR é seguro)
            .replace(",", "."); // Troca vírgula por ponto

          return parseFloat(cleanVal) || 0;
        };

        // Normaliza a unidade lida do CSV
        const rawUnidade = cols[3]?.trim().toUpperCase();
        // Garante que seja uma das unidades válidas, senão padroniza para UN
        const unidadeValida = ["UN", "KG", "CX", "L"].includes(rawUnidade)
          ? (rawUnidade as Item["unidade"])
          : "UN";


        const item: Item = {
          id: Math.random().toString(36).substr(2, 9),

          codigoInterno: cols[0]?.trim() || `IMP-${i}`,

          nome: cols[1]?.trim().toUpperCase() || "ITEM SEM NOME",

          categoria: cols[2]?.trim().replace(/^\*/, "") || "Geral",

          unidade: unidadeValida,

          codigoBarras: cols[4]?.trim() || "",
          // Coluna 5: val_custo_unitario
          custo: parseMoney(cols[5]),
          // Coluna 6: val_preco_venda_a
          precoVenda: parseMoney(cols[6]),
          status: "ativo",
          imagemUrl: "", // CSV não tem imagem
        };

        newItems.push(item);
      }

      console.log(
        `Importação concluída: ${newItems.length} itens processados.`,
      );
      resolve(newItems);
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



export type ProdutoLinha = {
  codigo: string;
  descricao: string;
  categoria: string;
  chegou: number;
  vendido: number;
  perdido: number;
  custo: number;
  precoVenda: number;
  limitePerda: number;
};

const CATALOGO: Array<Omit<ProdutoLinha, "chegou" | "vendido" | "perdido">> = [
  { codigo: "PF-1001", descricao: "Coxinha de frango", categoria: "Estufa", custo: 2.1, precoVenda: 6.5, limitePerda: 8 },
  { codigo: "PF-1002", descricao: "Pão de queijo", categoria: "Estufa", custo: 1.2, precoVenda: 4.0, limitePerda: 10 },
  { codigo: "PF-1003", descricao: "Empada de palmito", categoria: "Estufa", custo: 2.6, precoVenda: 7.5, limitePerda: 6 },
  { codigo: "PF-1004", descricao: "Esfiha de carne", categoria: "Estufa", custo: 2.3, precoVenda: 6.9, limitePerda: 8 },
  { codigo: "PF-1005", descricao: "Croissant presunto", categoria: "Padaria", custo: 3.1, precoVenda: 9.9, limitePerda: 5 },
  { codigo: "PF-1006", descricao: "Bolo de cenoura fatia", categoria: "Padaria", custo: 1.9, precoVenda: 6.0, limitePerda: 12 },
  { codigo: "PF-1007", descricao: "Torta de frango fatia", categoria: "Estufa", custo: 3.4, precoVenda: 10.5, limitePerda: 7 },
  { codigo: "PF-1008", descricao: "Sanduíche natural", categoria: "Geladeira", custo: 4.0, precoVenda: 12.0, limitePerda: 4 },
  { codigo: "PF-1009", descricao: "Enroladinho salsicha", categoria: "Estufa", custo: 1.6, precoVenda: 5.5, limitePerda: 10 },
  { codigo: "PF-1010", descricao: "Quibe frito", categoria: "Estufa", custo: 2.2, precoVenda: 6.5, limitePerda: 9 },
  { codigo: "PF-1011", descricao: "Pastel de queijo", categoria: "Estufa", custo: 2.0, precoVenda: 7.0, limitePerda: 8 },
  { codigo: "PF-1012", descricao: "Café expresso", categoria: "Bebidas", custo: 0.9, precoVenda: 5.0, limitePerda: 3 },
];


function seedFrom(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function linhasDoDia(dia: string): ProdutoLinha[] {
  const rnd = seedFrom(dia);
  return CATALOGO.map((p) => {
    const chegou = Math.round(30 + rnd() * 90);
    const esgotou = rnd() > 0.72;
    if (esgotou) {
      const perdido = Math.round(rnd() * 2);
      const vendido = Math.max(0, chegou - perdido);
      return { ...p, chegou, vendido, perdido };
    }
    const perdaPct = rnd() * 0.18;
    const perdido = Math.round(chegou * perdaPct);
    const vendido = Math.max(0, chegou - perdido - Math.round(rnd() * 6));
    return { ...p, chegou, vendido, perdido };
  });
}


export type Totais = {
  faturamento: number;
  custoTotal: number;
  lucro: number;
  margem: number;
  chegou: number;
  vendido: number;
  perdido: number;
  perdaPct: number;
  perdaValor: number;
  ruptura: number;
  excesso: number;
  xmlsImportados: number;
  xmlsPendentes: number;
  itensXml: number;
};

export function agregar(linhas: ProdutoLinha[], dias: string[]): Totais {
  const faturamento = linhas.reduce((s, l) => s + l.vendido * l.precoVenda, 0);
  const custoTotal = linhas.reduce((s, l) => s + l.chegou * l.custo, 0);
  const perdaValor = linhas.reduce((s, l) => s + l.perdido * l.custo, 0);
  const chegou = linhas.reduce((s, l) => s + l.chegou, 0);
  const vendido = linhas.reduce((s, l) => s + l.vendido, 0);
  const perdido = linhas.reduce((s, l) => s + l.perdido, 0);
  const rnd = seedFrom(dias.join("|"));
  return {
    faturamento,
    custoTotal,
    lucro: faturamento - custoTotal,
    margem: faturamento ? ((faturamento - custoTotal) / faturamento) * 100 : 0,
    chegou,
    vendido,
    perdido,
    perdaPct: chegou ? (perdido / chegou) * 100 : 0,
    perdaValor,
    ruptura: linhas.filter((l) => l.chegou > 0 && l.vendido / l.chegou > 0.95).length,
    excesso: linhas.filter((l) => l.chegou > 0 && (l.perdido / l.chegou) * 100 > l.limitePerda).length,
    xmlsImportados: dias.length * (3 + Math.round(rnd() * 4)),
    xmlsPendentes: Math.round(rnd() * 3),
    itensXml: dias.length * (40 + Math.round(rnd() * 60)),
  };
}

export function somarLinhas(diasIso: string[]): ProdutoLinha[] {
  const mapa = new Map<string, ProdutoLinha>();
  for (const d of diasIso) {
    for (const l of linhasDoDia(d)) {
      const atual = mapa.get(l.codigo);
      if (!atual) mapa.set(l.codigo, { ...l });
      else {
        atual.chegou += l.chegou;
        atual.vendido += l.vendido;
        atual.perdido += l.perdido;
      }
    }
  }
  return [...mapa.values()];
}

export function rangeDias(inicio: string, fim: string): string[] {
  const out: string[] = [];
  const a = new Date(inicio + "T00:00:00Z");
  const b = new Date(fim + "T00:00:00Z");
  if (isNaN(a.getTime()) || isNaN(b.getTime()) || b < a) return out;
  for (let d = new Date(a); d <= b && out.length < 400; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(isoDate(d));
  }
  return out;
}

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const pct = (v: number) => `${v.toFixed(1)}%`;
export const num = (v: number) => v.toLocaleString("pt-BR");

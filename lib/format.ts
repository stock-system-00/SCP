export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const pct = (v: number) => `${v.toFixed(1)}%`;
export const num = (v: number) => v.toLocaleString("pt-BR");

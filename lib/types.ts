


export type UserRole = "dono" | "gestor" | "fiscal" | "funcionario";

export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  ativo: boolean;
  ownerId?: string | null;
  lojaId?: string | null;
  avatarUrl?: string;
  avatar?: string;
  createdAt?: string;
}

export interface NavItem {
  title: string;
  href: string;
  icon: string;
}

export interface Item {
  id: string;
  codigoInterno: string;
  codigoBarras?: string;
  nome: string;
  categoria: string;
  subcategoria?: string;
  unidade: "UN" | "KG" | "CX" | "L";
  custo: number;
  custoMedio?: number;
  precoVenda: number;
  imagemUrl?: string;
  status: "ativo" | "inativo";
}

export type EventoStatus =
  | "rascunho"
  | "enviado"
  | "aprovado"
  | "rejeitado"
  | "exportado";

export interface Evidencia {
  id: string;
  url: string;
  dataUpload: string;
  eventoId?: string;
  motivo?: string;
  itemId?: string;
}


export interface NotaFiscal {
  id: string;
  dataUpload: string;
  uploadedBy?: User;


  pdfUrl?: string | null;
  xmlUrl?: string | null;
  xmlContent?: string | null;


  numero?: string | null;
  serie?: string | null;
  emitente?: string | null;
  cnpjEmitente?: string | null;
  dataEmissao?: string | Date | null;
  dataReferencia?: string | Date | null;
  valorTotal?: number | null;
  naturezaOperacao?: string | null;
  chaveAcesso?: string | null;


  eventoId?: string | null;
  observacoes?: string | null;
}

export interface Evento {
  id: string;
  dataHora: string;
  item?: Item;
  quantidade: number;
  unidade: string;
  custoSnapshot?: number;
  precoVendaSnapshot?: number;
  motivo?: string;
  status: EventoStatus;
  criadoPor: User;
  aprovadoPor?: User;
  evidencias: Evidencia[];

  notasFiscais?: NotaFiscal[];
  nfeEmitida?: boolean;
}

export interface CategoriaData {
  id: string;
  nome: string;
  descricao?: string;
  status: "ativa" | "inativa";
  itemCount?: number;
}

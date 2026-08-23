import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { EventoStatus, UserRole } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | undefined | null) {
  if (value === undefined || value === null) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatQuantity(value: number | undefined | null) {
  if (value === undefined || value === null) return "0";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);
}


export function formatDate(dateString: string): string {
  if (!dateString) return "-";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(dateString));
  } catch (e) {
    return dateString;
  }
}



export function formatDateTime(dateString: string): string {
  if (!dateString) return "-";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",

    }).format(new Date(dateString));
  } catch (e) {
    return dateString;
  }
}


export function getStatusColor(status: EventoStatus): string {
  const colors: Record<EventoStatus, string> = {
    rascunho: "bg-muted text-muted-foreground",
    enviado: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    aprovado: "bg-green-500/15 text-green-700 dark:text-green-400",
    rejeitado: "bg-red-500/15 text-red-700 dark:text-red-400",
    exportado: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  };
  return colors[status] || "bg-muted";
}

export function getStatusLabel(status: EventoStatus): string {
  const labels: Record<EventoStatus, string> = {
    rascunho: "Rascunho",
    enviado: "Pendente",
    aprovado: "Aprovado",
    rejeitado: "Rejeitado",
    exportado: "Exportado",
  };
  return labels[status] || status;
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    funcionario: "Funcionário",
    gestor: "Gestor",
    fiscal: "Fiscal",
    dono: "Proprietário",
  };
  return labels[role] || role;
}

export async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 1280;
        const scale = maxWidth / img.width;
        const finalScale = scale < 1 ? scale : 1;

        canvas.width = img.width * finalScale;
        canvas.height = img.height * finalScale;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
        resolve(compressedBase64);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}

export function getKeyFromUrl(url: string): string | null {
  try {
    if (!url.startsWith("http")) return null;
    const urlObj = new URL(url);
    let path = urlObj.pathname.substring(1);

    if (urlObj.hostname.endsWith("r2.cloudflarestorage.com")) {
      const parts = path.split("/");
      if (parts.length > 1) {
        path = parts.slice(1).join("/");
      }
    }

    return decodeURIComponent(path);
  } catch (e) {
    return null;
  }
}

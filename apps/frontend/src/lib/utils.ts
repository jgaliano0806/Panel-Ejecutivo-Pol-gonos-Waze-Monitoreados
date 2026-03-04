import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function para combinar clases de Tailwind
 * Usa clsx para condicionales y twMerge para evitar conflictos
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea números grandes con separadores
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("es-AR").format(num);
}

/**
 * Formatea fechas relativas (hace X minutos)
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Ahora mismo";
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${days}d`;
}

/**
 * Obtiene el color según severidad
 */
export function getSeverityColor(severity: number | string): {
  bg: string;
  text: string;
  border: string;
} {
  const sev =
    typeof severity === "string"
      ? { critical: 4, high: 3, medium: 2, low: 1 }[severity] || 1
      : severity;

  if (sev >= 4)
    return {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-300",
    };
  if (sev >= 3)
    return {
      bg: "bg-orange-50",
      text: "text-orange-700",
      border: "border-orange-300",
    };
  if (sev >= 2)
    return {
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      border: "border-yellow-300",
    };
  return {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-300",
  };
}

/**
 * Formatea nombres de calles para correcciones específicas
 */
export function formatStreetName(street: string | undefined | null): string {
  if (!street) return "Sin calle";
  // Correcciones específicas solicitadas por el usuario
  // Retornamos el nombre de la calle, que ya no debe estar hardcodeado
  return street;
}

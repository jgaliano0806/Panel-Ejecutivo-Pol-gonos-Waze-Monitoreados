/**
 * Utilidades de fechas y horas para la plataforma.
 * Todas las funciones garantizan la zona horaria de Argentina (UTC-3).
 */

export const TZ_ARGENTINA = "America/Argentina/Buenos_Aires";
export const LOCALE_AR = "es-AR";

const BASE_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: TZ_ARGENTINA,
};

/** Convierte a Date de forma segura desde string, number o Date */
function toDate(value: string | number | Date): Date {
  if (value instanceof Date) return value;
  return new Date(value);
}

/** Fecha y hora completa — ej: "12/03/2026 14:35" */
export function formatDateTime(value: string | number | Date): string {
  return toDate(value).toLocaleString(LOCALE_AR, {
    ...BASE_OPTIONS,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Fecha y hora con segundos — ej: "12/03/2026 14:35:22" */
export function formatDateTimeWithSeconds(value: string | number | Date): string {
  return toDate(value).toLocaleString(LOCALE_AR, {
    ...BASE_OPTIONS,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** Solo hora — ej: "14:35" */
export function formatTime(value: string | number | Date): string {
  return toDate(value).toLocaleTimeString(LOCALE_AR, {
    ...BASE_OPTIONS,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Solo hora con segundos — ej: "14:35:22" */
export function formatTimeWithSeconds(value: string | number | Date): string {
  return toDate(value).toLocaleTimeString(LOCALE_AR, {
    ...BASE_OPTIONS,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** Solo fecha corta — ej: "12/03/2026" */
export function formatDate(value: string | number | Date): string {
  return toDate(value).toLocaleDateString(LOCALE_AR, {
    ...BASE_OPTIONS,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Fecha con día de semana — ej: "jueves, 12 de marzo de 2026, 14:35" */
export function formatDateTimeLong(value: string | number | Date): string {
  return toDate(value).toLocaleString(LOCALE_AR, {
    ...BASE_OPTIONS,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Hora actual en Argentina */
export function nowInArgentina(): Date {
  return new Date();
}

/** String de hora actual — ej: "14:35:22" */
export function currentTimeString(withSeconds = false): string {
  return withSeconds
    ? formatTimeWithSeconds(new Date())
    : formatTime(new Date());
}

/**
 * Helpers puros para EventsListModal.
 *
 * Extraídos del componente para:
 *  - permitir reuso desde subcomponentes (cuando se divida).
 *  - permitir tree-shaking si algún consumer solo necesita una utilidad.
 *  - facilitar tests unitarios sin montar el modal.
 */

export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function getSeverityColor(severity: number): string {
  if (severity >= 4)
    return "bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-500 text-red-900 dark:text-red-200";
  if (severity >= 3)
    return "bg-orange-100 dark:bg-orange-900/30 border-orange-400 dark:border-orange-500 text-orange-900 dark:text-orange-200";
  if (severity >= 2)
    return "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-500 text-yellow-900 dark:text-yellow-200";
  return "bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500 text-blue-900 dark:text-blue-200";
}

export function getSeverityLabel(severity: number): string {
  if (severity >= 4) return "CRÍTICA";
  if (severity >= 3) return "ALTA";
  if (severity >= 2) return "MEDIA";
  return "BAJA";
}

/**
 * Calcula cuánto tiempo lleva activo un incidente desde su timestamp de publicación.
 * Retorna texto legible en español.
 */
export function formatActiveDuration(from: Date | string): string {
  const diffMs = Date.now() - new Date(from).getTime();
  if (diffMs < 0) return "recién";
  const totalMin = Math.floor(diffMs / 60_000);
  if (totalMin < 1) return "< 1 min";
  if (totalMin < 60) return `${totalMin} min`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

/**
 * Color semáforo para la duración activa de un incidente.
 * Verde < 30min | Amarillo < 2h | Rojo ≥ 2h
 */
export function getDurationColor(from: Date | string): string {
  const diffMin = (Date.now() - new Date(from).getTime()) / 60_000;
  if (diffMin < 30)
    return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700";
  if (diffMin < 120)
    return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700";
  return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700";
}

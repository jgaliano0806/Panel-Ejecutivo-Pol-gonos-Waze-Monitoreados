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

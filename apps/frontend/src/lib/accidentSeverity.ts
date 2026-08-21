/**
 * Clasificación de severidad de siniestros Waze para heatmap y filtros.
 */

export type SeverityBucket = "leve" | "moderado" | "grave" | "desconocido";

/**
 * Clasifica un siniestro por severidad Waze (1-5) o por subtipo.
 * - Leve: severidad 1-2 o subtipo ACCIDENT_MINOR.
 * - Moderado: severidad 3 o subtipo NO_SUBTYPE / ROAD_CLOSED_EVENT.
 * - Grave: severidad 4-5 o subtipo ACCIDENT_MAJOR.
 * - Desconocido: sin datos.
 */
export function classifyAccident(
  severity: number | null | undefined,
  subtype: string | null | undefined,
): SeverityBucket {
  if (typeof severity === "number" && Number.isFinite(severity)) {
    if (severity >= 4) return "grave";
    if (severity === 3) return "moderado";
    if (severity >= 1) return "leve";
  }
  const s = (subtype || "").toUpperCase();
  if (s === "ACCIDENT_MAJOR") return "grave";
  if (s === "ACCIDENT_MINOR") return "leve";
  if (s === "NO_SUBTYPE" || s === "ROAD_CLOSED_EVENT") return "moderado";
  return "desconocido";
}

export const SEVERITY_COLORS: Record<SeverityBucket, string> = {
  grave: "#dc2626",
  moderado: "#f97316",
  leve: "#facc15",
  desconocido: "#94a3b8",
};

export const SEVERITY_LABELS: Record<SeverityBucket, string> = {
  grave: "Grave",
  moderado: "Moderado",
  leve: "Leve",
  desconocido: "Sin datos",
};

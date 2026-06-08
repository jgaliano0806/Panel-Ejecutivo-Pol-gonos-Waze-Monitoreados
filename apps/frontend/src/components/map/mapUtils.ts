import type { Incident } from "../../types";
import { Severity } from "../../types";

/**
 * mapUtils.ts — Funciones puras y constantes para el componente de mapa.
 *
 * Extraídas de MapLibreMap.tsx para evitar recrear funciones en cada render
 * y para reutilizar lógica de validación/coloreado entre sub-componentes.
 */

// ─── Constantes ─────────────────────────────────────────────────────

export const INITIAL_VIEW_STATE = {
  longitude: -64.1888, // Córdoba
  latitude: -31.4201,
  zoom: 12,
  pitch: 40,
  bearing: 0,
};

export const COMMON_ICONS = [
  "waze-accident",
  "waze-jam",
  "waze-hazard",
  "waze-construction",
  "waze-roadclosed",
  "waze-road_closed",
  "waze-police",
  "waze-weatherhazard",
  "waze-pothole",
  "waze-hazard-hazard_on_road_construction",
  "waze-hazard-hazard_on_shoulder_car_stopped",
  "waze-hazard-hazard_on_road_pot_hole",
  "waze-road_closed-road_closed_event",
] as const;

export const INTERACTIVE_LAYER_IDS = [
  "jams-core",
  "jam-labels-bg",
  "polygons-fill",
] as const;

// ─── Validación de coordenadas ──────────────────────────────────────

/** Valida que lat y lng sean números finitos. */
export function isValidCoord(lat: any, lng: any): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    isFinite(lat) &&
    isFinite(lng)
  );
}

/** Valida que un punto {x, y} tenga coordenadas numéricas finitas. */
export function isValidPoint(p: { x: number; y: number } | null | undefined): boolean {
  if (!p) return false;
  return isValidCoord(p.y, p.x);
}

/** Decodifica ID de highlight desde URL o notificación. */
export function decodeHighlightId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    return decodeURIComponent(String(raw));
  } catch {
    return String(raw);
  }
}

/** Busca incidente activo por uuid/id (feed /incidents/all). */
export function findIncidentById<T extends { id: string; uuid?: string }>(
  incidents: T[],
  id: string | null | undefined,
): T | undefined {
  const needle = decodeHighlightId(id);
  if (!needle) return undefined;
  return incidents.find((i) => i.id === needle || i.uuid === needle);
}

/** Props normalizadas para IncidentPopup desde el feed del mapa. */
export function buildIncidentPopupProperties(inc: {
  id: string;
  type: string;
  subtype?: string;
  description?: string;
  street?: string;
  timestamp: Date | string;
  reportBy?: string;
  nThumbsUp?: number;
  confidence?: number;
  location: { lat: number; lng: number };
  magvar?: number;
}) {
  const timeMs =
    inc.timestamp instanceof Date
      ? inc.timestamp.getTime()
      : new Date(inc.timestamp).getTime();

  return {
    id: inc.id,
    isNew: Date.now() - timeMs < 300000 ? 1 : 0,
    description: inc.description || "Sin descripción",
    street:
      inc.street ||
      `${inc.location.lat.toFixed(5)}, ${inc.location.lng.toFixed(5)}`,
    type: inc.type,
    subtype: inc.subtype || "",
    timestamp: inc.timestamp ? new Date(inc.timestamp).toISOString() : "",
    reportBy: inc.reportBy,
    nThumbsUp: inc.nThumbsUp || 0,
    confidence:
      typeof inc.confidence === "number"
        ? inc.confidence
        : Number(inc.confidence) || 0,
    magvar: inc.magvar,
  };
}

/** Extrae lat/lng de distintos formatos (feed, notificación, Waze raw). */
export function extractIncidentCoords(source: any): {
  lat?: number;
  lng?: number;
} {
  if (isValidCoord(source?.location?.lat, source?.location?.lng)) {
    return { lat: source.location.lat, lng: source.location.lng };
  }
  if (isValidCoord(source?.location?.y, source?.location?.x)) {
    return { lat: source.location.y, lng: source.location.x };
  }
  if (isValidCoord(source?.latitude, source?.longitude)) {
    return { lat: source.latitude, lng: source.longitude };
  }
  return {};
}

/** Props de popup desde notificación o incidente forzado (sin esperar al feed). */
export function buildPopupPropertiesFromForced(
  source: Record<string, any>,
  highlightId?: string | null,
) {
  const id =
    source.id || source.uuid || source.alertId || highlightId || "unknown";
  const ts =
    source.timestamp ||
    (source.pubMillis
      ? new Date(source.pubMillis).toISOString()
      : new Date().toISOString());
  const coords = extractIncidentCoords(source);
  const lat = coords.lat ?? 0;
  const lng = coords.lng ?? 0;

  return {
    id,
    isNew: 1,
    description:
      source.description ||
      source.reportDescription ||
      source.message ||
      "Sin descripción",
    street:
      source.street ||
      (isValidCoord(lat, lng)
        ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
        : undefined),
    type: (source.type || source.incidentType || "hazard").toLowerCase(),
    subtype: (source.subtype || "").toLowerCase(),
    timestamp: ts,
    reportBy: source.reportBy,
    nThumbsUp: source.nThumbsUp ?? source.thumbsUp ?? 0,
    confidence:
      typeof source.confidence === "number"
        ? source.confidence
        : Number(source.confidence) || 0,
    magvar: source.magvar,
  };
}

/** Convierte notificación/incidente forzado al shape del feed para dibujar marcador. */
export function sourceToMapIncident(
  source: Record<string, any> | null | undefined,
): Incident | null {
  if (!source) return null;

  const coords = extractIncidentCoords(source);
  if (!isValidCoord(coords.lat, coords.lng)) return null;

  const id = String(source.id || source.uuid || source.alertId || "");
  if (!id) return null;

  const typeRaw = (source.type || source.incidentType || "hazard").toLowerCase();

  return {
    id,
    polygonId: source.polygonId ?? null,
    type: typeRaw as Incident["type"],
    subtype: (source.subtype || "").toLowerCase() || undefined,
    severity: Severity.MEDIUM,
    description:
      source.description || source.reportDescription || source.message || "",
    timestamp: new Date(
      source.timestamp || source.pubMillis || Date.now(),
    ),
    location: { lat: coords.lat!, lng: coords.lng! },
    street: source.street,
    city: source.city,
    reportBy: source.reportBy,
    confidence: source.confidence,
    reliability: source.reliability,
    nThumbsUp: source.nThumbsUp ?? source.thumbsUp,
    magvar: source.magvar,
  };
}

/** Feed del mapa + incidentes de notificación aún no presentes en /incidents/all. */
export function mergeIncidentsForMap(
  base: Incident[],
  extras: Array<Record<string, any> | null | undefined>,
): Incident[] {
  const byId = new Map(base.map((i) => [i.id, i]));

  for (const extra of extras) {
    const mapped = sourceToMapIncident(extra);
    if (!mapped) continue;

    const existing = byId.get(mapped.id);
    if (
      !existing ||
      !isValidCoord(existing.location?.lat, existing.location?.lng)
    ) {
      byId.set(mapped.id, mapped);
    }
  }

  return Array.from(byId.values());
}

/** Valida que una polyline tenga al menos 2 puntos válidos. */
export function isValidLine(line: Array<{ x: number; y: number }> | null | undefined): boolean {
  if (!line || line.length < 2) return false;
  return line.every(isValidPoint);
}

// ─── Colores de tráfico (estilo Waze) ───────────────────────────────

/** Color por velocidad para la capa de flujo general. */
export function getFlowColor(speed: number): string {
  if (speed >= 65) return "#00c853"; // Verde brillante - flujo libre
  if (speed >= 50) return "#64dd17"; // Verde lima - buen flujo
  if (speed >= 35) return "#ffeb3b"; // Amarillo - flujo moderado
  if (speed >= 20) return "#ff9800"; // Naranja - flujo lento
  if (speed >= 10) return "#ff5722"; // Naranja oscuro - muy lento
  return "#d32f2f";                  // Rojo - casi detenido
}

/** Color por nivel/velocidad para la capa de congestión severa. */
export function getJamColor(level: number, speed: number): string {
  if (speed < 5 || level >= 5) return "#b71c1c"; // Rojo muy oscuro - detenido
  if (speed < 10 || level >= 4) return "#c62828"; // Rojo oscuro - muy lento
  if (speed < 20 || level >= 3) return "#e53935"; // Rojo - lento
  if (speed < 30 || level >= 2) return "#ff7043"; // Naranja rojizo - moderado
  return "#ffa726";                               // Naranja - leve
}

/** Texto de severidad del atasco. */
export function getJamSeverityText(level: number, speed: number): string {
  if (speed < 5 || level >= 5) return "Detenido";
  if (level >= 4 || speed < 10) return "Muy Lento";
  if (level >= 3 || speed < 20) return "Lento";
  if (level >= 2 || speed < 30) return "Moderado";
  return "Fluido";
}

// ─── Dirección cardinal ─────────────────────────────────────────────

/**
 * Tabla de 16 direcciones cardinales indexada.
 * Cada dirección cubre 22.5° → index = floor((normalized + 11.25) / 22.5) % 16
 */
const CARDINAL_LABELS = [
  "Norte",
  "Norte a Este",
  "Noreste",
  "Este a Norte",
  "Este",
  "Este a Sur",
  "Sureste",
  "Sur a Este",
  "Sur",
  "Sur a Oeste",
  "Suroeste",
  "Oeste a Sur",
  "Oeste",
  "Oeste a Norte",
  "Noroeste",
  "Norte a Oeste",
] as const;

/** Convierte grados de declinación magnética a dirección cardinal (16 direcciones). */
export function getCardinalDirection(degrees: number | null | undefined): string {
  if (degrees === null || degrees === undefined) return "Desconocido";
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.floor((normalized + 11.25) / 22.5) % 16;
  return CARDINAL_LABELS[index];
}

// ─── Bearing de línea ───────────────────────────────────────────────

/** Calcular bearing (dirección en grados) de una polyline. */
export function calculateBearing(line?: Array<{ x: number; y: number }>): number {
  if (!line || line.length < 2) return 0;
  const start = line[0];
  const end = line[line.length - 1];
  const dLng = end.x - start.x;
  const dLat = end.y - start.y;
  return (Math.atan2(dLng, dLat) * 180) / Math.PI;
}

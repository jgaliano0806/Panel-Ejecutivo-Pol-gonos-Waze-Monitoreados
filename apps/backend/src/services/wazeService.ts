/**
 * Cruce espacial alertas Waze × zonas_peligrosas (RAC geofencing).
 * Usa @turf/turf (booleanPointInPolygon) sobre GeoJSON almacenado en JSONB.
 * Invocado desde wazePollingService tras normalizar el feed.
 */
import { booleanPointInPolygon, point, polygon } from "@turf/turf";
import { dbService } from "../database/dbService";
import { logger } from "../utils/logger";
import type { WazeAlert } from "@panel-waze/types";

export interface RedZoneMatch {
  isRedZone: true;
  redZonaId: string;
  redZonaNombre: string;
  protocolo_accion: string;
  nivel_severidad: number;
}

interface CachedZone {
  id: string;
  nombre: string;
  protocolo_accion: string;
  nivel_severidad: number;
  poly: GeoJSON.Polygon;
}

let cache: { zones: CachedZone[]; loadedAt: number } = {
  zones: [],
  loadedAt: 0,
};
const TTL_MS = 60_000;

export function invalidateZonasPeligrosasCache(): void {
  cache = { zones: [], loadedAt: 0 };
}

async function loadActiveZones(): Promise<CachedZone[]> {
  if (Date.now() - cache.loadedAt < TTL_MS && cache.loadedAt > 0) {
    return cache.zones;
  }
  const res = await dbService.query(
    `SELECT id, nombre, protocolo_accion, nivel_severidad, geometria
     FROM zonas_peligrosas WHERE activa = true`,
  );
  const zones: CachedZone[] = [];
  for (const row of res.rows) {
    try {
      const g =
        typeof row.geometria === "string"
          ? JSON.parse(row.geometria)
          : row.geometria;
      if (g?.type === "Polygon" && Array.isArray(g.coordinates)) {
        zones.push({
          id: row.id,
          nombre: row.nombre,
          protocolo_accion: row.protocolo_accion || "",
          nivel_severidad: row.nivel_severidad,
          poly: g as GeoJSON.Polygon,
        });
      }
    } catch {
      /* fila inválida */
    }
  }
  cache = { zones, loadedAt: Date.now() };
  logger.debug(`wazeService: ${zones.length} zonas_peligrosas activas en caché`);
  return zones;
}

export function findRedZoneForPoint(
  lat: number,
  lng: number,
  zones: CachedZone[],
): RedZoneMatch | null {
  const pt = point([lng, lat]);
  for (const z of zones) {
    try {
      const coords = z.poly.coordinates;
      if (!coords?.length) continue;
      const poly = polygon(coords as number[][][]);
      if (booleanPointInPolygon(pt, poly)) {
        return {
          isRedZone: true,
          redZonaId: z.id,
          redZonaNombre: z.nombre,
          protocolo_accion: z.protocolo_accion,
          nivel_severidad: z.nivel_severidad,
        };
      }
    } catch {
      /* geometría inválida */
    }
  }
  return null;
}

/**
 * Evalúa cada alerta y adjunta isRedZone + metadatos RAC si cae en zonas_peligrosas.
 */
export async function enrichAlertsWithRedZoneFlags(
  alerts: WazeAlert[],
): Promise<void> {
  let zones: CachedZone[];
  try {
    zones = await loadActiveZones();
  } catch (e) {
    logger.warn(
      `wazeService: no se pudieron cargar zonas_peligrosas (¿tabla creada?): ${e}`,
    );
    return;
  }
  if (zones.length === 0) return;

  for (const a of alerts) {
    const lat = a.location?.y;
    const lng = a.location?.x;
    if (lat == null || lng == null) continue;
    const match = findRedZoneForPoint(lat, lng, zones);
    if (match) {
      (a as any).isRedZone = true;
      (a as any).redZoneMatch = match;
    }
  }
}

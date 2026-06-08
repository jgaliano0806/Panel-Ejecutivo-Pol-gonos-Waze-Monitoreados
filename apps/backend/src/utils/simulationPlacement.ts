import { booleanPointInPolygon, point, polygon } from "@turf/turf";
import { randomPointInPolygonGeometry } from "./polygonRandomPoint";
import {
  getRacPolygonsWithGeometry,
  RacPolygonWithGeometry,
} from "./racPolygonGeometryCache";
import { zonaPeligrosaService } from "../services/zonaPeligrosaService";
import type { ZonaPeligrosaRow } from "../repositories/ZonaPeligrosaRepository";
import { findRedZoneForPoint, type RedZoneMatch } from "../services/wazeService";
import { logger } from "./logger";

export interface SimulationPlacement {
  lat: number;
  lon: number;
  polygonId: string;
  polygonName: string;
  inDangerZone: boolean;
  redZoneMatch: RedZoneMatch | null;
}

function findRacPolygonAt(
  lat: number,
  lon: number,
  racPolygons: RacPolygonWithGeometry[],
): RacPolygonWithGeometry | null {
  const pt = point([lon, lat]);
  for (const rac of racPolygons) {
    const geometries =
      rac.geometry.type === "MultiPolygon"
        ? rac.geometry.coordinates.map((coords) => ({
            type: "Polygon" as const,
            coordinates: coords,
          }))
        : [rac.geometry];

    for (const g of geometries) {
      try {
        if (booleanPointInPolygon(pt, polygon(g.coordinates))) {
          return rac;
        }
      } catch {
        /* geometría inválida */
      }
    }
  }
  return null;
}

async function pickPointInDangerZone(
  racPolygons: RacPolygonWithGeometry[],
  zones: ZonaPeligrosaRow[],
): Promise<SimulationPlacement | null> {
  if (zones.length === 0) return null;

  for (let attempt = 0; attempt < 40; attempt++) {
    const zone = zones[Math.floor(Math.random() * zones.length)]!;
    const coords = randomPointInPolygonGeometry(zone.geometria);
    if (!coords) continue;

    const rac = findRacPolygonAt(coords.lat, coords.lon, racPolygons);
    if (!rac) continue;

    const redZoneMatch = await resolveRedZoneMatch(coords.lat, coords.lon);
    return {
      lat: coords.lat,
      lon: coords.lon,
      polygonId: rac.id,
      polygonName: rac.name,
      inDangerZone: redZoneMatch !== null,
      redZoneMatch,
    };
  }

  return null;
}

async function resolveRedZoneMatch(
  lat: number,
  lon: number,
): Promise<RedZoneMatch | null> {
  const zones = await zonaPeligrosaService.listActive();
  const cached = zones
    .map((z) => {
      try {
        const g =
          typeof z.geometria === "string"
            ? JSON.parse(z.geometria)
            : z.geometria;
        if (g?.type !== "Polygon" || !Array.isArray(g.coordinates)) return null;
        return {
          id: z.id,
          nombre: z.nombre,
          protocolo_accion: z.protocolo_accion || "",
          nivel_severidad: z.nivel_severidad,
          poly: g as GeoJSON.Polygon,
        };
      } catch {
        return null;
      }
    })
    .filter((z): z is NonNullable<typeof z> => z !== null);

  return findRedZoneForPoint(lat, lon, cached);
}

async function pickPointInRacPolygon(
  racPolygons: RacPolygonWithGeometry[],
): Promise<SimulationPlacement | null> {
  for (let attempt = 0; attempt < 15; attempt++) {
    const rac = racPolygons[Math.floor(Math.random() * racPolygons.length)]!;
    const coords = randomPointInPolygonGeometry(rac.geometry);
    if (!coords) continue;

    const redZoneMatch = await resolveRedZoneMatch(coords.lat, coords.lon);
    return {
      lat: coords.lat,
      lon: coords.lon,
      polygonId: rac.id,
      polygonName: rac.name,
      inDangerZone: redZoneMatch !== null,
      redZoneMatch,
    };
  }
  return null;
}

/**
 * Ubica un incidente simulado dentro de un polígono RAC.
 * Si forceDangerZone=true, intenta caer dentro de una zona peligrosa activa (1/3 de ticks).
 */
export async function pickSimulationPlacement(
  forceDangerZone: boolean,
): Promise<SimulationPlacement | null> {
  const racPolygons = await getRacPolygonsWithGeometry();
  if (racPolygons.length === 0) {
    logger.warn("pickSimulationPlacement: sin geometrías RAC");
    return null;
  }

  if (forceDangerZone) {
    const dangerZones = await zonaPeligrosaService.listActive();
    if (dangerZones.length === 0) {
      logger.warn(
        "Bot simulación: sin zonas peligrosas activas; ubicando solo en RAC",
      );
    } else {
      const inZone = await pickPointInDangerZone(racPolygons, dangerZones);
      if (inZone) return inZone;
      logger.warn(
        "Bot simulación: no se pudo ubicar en zona peligrosa + RAC; reintento en RAC",
      );
    }
  }

  return pickPointInRacPolygon(racPolygons);
}

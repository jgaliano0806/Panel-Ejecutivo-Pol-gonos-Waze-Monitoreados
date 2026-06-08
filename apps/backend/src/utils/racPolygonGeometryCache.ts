import fs from "fs";
import path from "path";
import { dbService } from "../database/dbService";
import { logger } from "./logger";

export interface RacPolygonWithGeometry {
  id: string;
  name: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

const CACHE_TTL_MS = 60 * 60 * 1000;

let cache: { polygons: RacPolygonWithGeometry[]; loadedAt: number } = {
  polygons: [],
  loadedAt: 0,
};

function parseGeometry(raw: unknown): GeoJSON.Polygon | GeoJSON.MultiPolygon | null {
  if (!raw) return null;
  try {
    const g = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (g?.type === "Polygon" && Array.isArray(g.coordinates)) {
      return g as GeoJSON.Polygon;
    }
    if (g?.type === "MultiPolygon" && Array.isArray(g.coordinates)) {
      return g as GeoJSON.MultiPolygon;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function loadFromJsonFile(): RacPolygonWithGeometry[] {
  const candidates = [
    path.join(process.cwd(), "data/rac-polygon-geometries.json"),
    path.join(__dirname, "../../data/rac-polygon-geometries.json"),
    path.join(__dirname, "../../../data/rac-polygon-geometries.json"),
  ];

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as Array<{
        id: string;
        name: string;
        geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
      }>;
      const parsed = raw
        .map((p) => {
          const geometry = parseGeometry(p.geometry);
          if (!geometry) return null;
          return { id: p.id, name: p.name, geometry };
        })
        .filter((p): p is RacPolygonWithGeometry => p !== null);
      if (parsed.length > 0) {
        logger.info(
          `📐 Geometrías RAC cargadas desde JSON (${parsed.length} polígonos)`,
        );
        return parsed;
      }
    } catch (error) {
      logger.warn(
        `No se pudo leer ${filePath}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }
  return [];
}

async function loadFromDatabase(): Promise<RacPolygonWithGeometry[]> {
  const result = await dbService.query(
    `SELECT id, name, geometry
     FROM config_polygons
     WHERE is_active IS NOT FALSE
       AND geometry IS NOT NULL`,
  );

  const polygons: RacPolygonWithGeometry[] = [];
  for (const row of result.rows) {
    const geometry = parseGeometry(row.geometry);
    if (!geometry) continue;
    polygons.push({
      id: row.id,
      name: row.name || row.id,
      geometry,
    });
  }
  return polygons;
}

export async function getRacPolygonsWithGeometry(): Promise<
  RacPolygonWithGeometry[]
> {
  if (
    cache.polygons.length > 0 &&
    Date.now() - cache.loadedAt < CACHE_TTL_MS
  ) {
    return cache.polygons;
  }

  try {
    const fromDb = await loadFromDatabase();
    if (fromDb.length >= 10) {
      cache = { polygons: fromDb, loadedAt: Date.now() };
      logger.info(
        `📐 Geometrías RAC desde BD (${fromDb.length} polígonos)`,
      );
      return fromDb;
    }
  } catch (error) {
    logger.warn(
      `Geometrías RAC: fallo BD, usando JSON — ${
        error instanceof Error ? error.message : error
      }`,
    );
  }

  const fromJson = loadFromJsonFile();
  cache = { polygons: fromJson, loadedAt: Date.now() };
  return fromJson;
}

export function invalidateRacPolygonGeometryCache(): void {
  cache = { polygons: [], loadedAt: 0 };
}

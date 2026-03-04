/**
 * Script para asignar automáticamente polígono y grupo a cada hito kilométrico.
 *
 * Estrategia:
 * 1. Si el polígono tiene geometry GeoJSON → point-in-polygon (ray-casting)
 * 2. Si solo tiene coordinates (centroide) → asignar al centroide más cercano
 *
 * Uso:
 *   npx ts-node apps/backend/scripts/assign-km-to-polygons.ts
 */
import path from "path";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "panel_waze",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
};

// Haversine en metros
function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Ray-casting point-in-polygon
function pointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0],
      yi = polygon[i][1];
    const xj = polygon[j][0],
      yj = polygon[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInGeoJSON(lng: number, lat: number, geometry: any): boolean {
  if (!geometry || !geometry.coordinates) return false;
  const point: [number, number] = [lng, lat];
  if (geometry.type === "Polygon") {
    for (const ring of geometry.coordinates) {
      if (pointInPolygon(point, ring)) return true;
    }
  } else if (geometry.type === "MultiPolygon") {
    for (const polygon of geometry.coordinates) {
      for (const ring of polygon) {
        if (pointInPolygon(point, ring)) return true;
      }
    }
  }
  return false;
}

interface PolygonRow {
  id: string;
  name: string;
  group: string | null;
  geometry: any;
  coordinates: { lat: number; lon: number } | null;
}

async function main() {
  console.log("📍 Asignación automática de kilómetros a polígonos (v2)");
  console.log(
    `   DB: ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`,
  );

  const pool = new Pool(DB_CONFIG);

  try {
    // 1. Leer TODOS los polígonos activos
    const polygonsResult = await pool.query(
      `SELECT id, name, "group", geometry, coordinates
       FROM config_polygons
       WHERE is_active = true`,
    );
    const polygons: PolygonRow[] = polygonsResult.rows;
    const withGeom = polygons.filter((p) => p.geometry != null);
    const allWithCoords = polygons.filter((p) => p.coordinates != null);
    console.log(`   Polígonos activos: ${polygons.length}`);
    console.log(`   Con geometry (GeoJSON): ${withGeom.length}`);
    console.log(`   Con coordinates (centroide): ${allWithCoords.length}`);

    // 2. Mapear grupo nombre → id
    const groupsResult = await pool.query(
      `SELECT id, name FROM polygon_groups`,
    );
    const groupMap = new Map<string, number>();
    for (const g of groupsResult.rows) {
      groupMap.set(g.name, g.id);
    }

    // 3. Leer kilómetros
    const kmResult = await pool.query(
      `SELECT id, name, latitude, longitude FROM kilometer_markers`,
    );
    const markers = kmResult.rows;
    console.log(`   Kilómetros a procesar: ${markers.length}\n`);

    let assignedGeom = 0;
    let assignedNearest = 0;
    let noMatch = 0;

    for (const km of markers) {
      const lat = parseFloat(km.latitude);
      const lng = parseFloat(km.longitude);

      // Paso A: Intentar point-in-polygon con geometrías reales
      let foundPolygon: PolygonRow | null = null;

      for (const poly of withGeom) {
        let geometry = poly.geometry;
        if (typeof geometry === "string") {
          try {
            geometry = JSON.parse(geometry);
          } catch {
            continue;
          }
        }
        if (pointInGeoJSON(lng, lat, geometry)) {
          foundPolygon = poly;
          break;
        }
      }

      // Paso B: Si no encontró geometría, buscar centroide más cercano (threshold 5km)
      if (!foundPolygon) {
        let minDist = Infinity;
        let nearest: PolygonRow | null = null;

        for (const poly of allWithCoords) {
          const coords =
            typeof poly.coordinates === "string"
              ? JSON.parse(poly.coordinates)
              : poly.coordinates;

          if (!coords || coords.lat == null || coords.lon == null) continue;

          const dist = haversine(lat, lng, coords.lat, coords.lon);
          if (dist < minDist) {
            minDist = dist;
            nearest = poly;
          }
        }

        // Usar umbral de 50km para asignación por cercanía (rutas largas)
        if (nearest && minDist <= 50000) {
          foundPolygon = nearest;
        }
      }

      if (foundPolygon) {
        const groupName = foundPolygon.group;
        const groupId = groupName ? groupMap.get(groupName) || null : null;

        await pool.query(
          `UPDATE kilometer_markers
           SET polygon_id = $1, polygon_group_id = $2, updated_at = NOW()
           WHERE id = $3`,
          [foundPolygon.id, groupId, km.id],
        );

        if (withGeom.includes(foundPolygon)) {
          assignedGeom++;
        } else {
          assignedNearest++;
        }
      } else {
        noMatch++;
      }
    }

    console.log(`✅ Asignación completada:`);
    console.log(`   Por geometría (dentro del polígono): ${assignedGeom}`);
    console.log(`   Por cercanía al centroide (<5km):    ${assignedNearest}`);
    console.log(`   Sin polígono cercano:                ${noMatch}`);
    console.log(
      `   Total asignados:                     ${assignedGeom + assignedNearest}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});

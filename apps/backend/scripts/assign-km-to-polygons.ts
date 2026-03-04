/**
 * Script para asignar automáticamente polígono y grupo a cada hito kilométrico
 * basándose en si el punto del km está dentro de la geometría del polígono.
 *
 * Uso:
 *   npx ts-node apps/backend/scripts/assign-km-to-polygons.ts
 *
 * El script:
 * 1. Lee todos los kilometer_markers de la DB
 * 2. Lee todos los config_polygons activos con su geometry GeoJSON
 * 3. Para cada km, verifica si el punto está dentro de algún polígono (ray-casting)
 * 4. Si encuentra un polígono contenedor, actualiza polygon_id y polygon_group_id
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

/**
 * Ray-casting algorithm para point-in-polygon
 * Determina si un punto está dentro de un polígono
 */
function pointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Verifica si un punto está dentro de un GeoJSON geometry (Polygon o MultiPolygon)
 */
function pointInGeoJSON(lng: number, lat: number, geometry: any): boolean {
  if (!geometry || !geometry.coordinates) return false;

  const point: [number, number] = [lng, lat];

  if (geometry.type === "Polygon") {
    // Polygon: coordinates es un array de anillos, el primero es el exterior
    for (const ring of geometry.coordinates) {
      if (pointInPolygon(point, ring)) return true;
    }
  } else if (geometry.type === "MultiPolygon") {
    // MultiPolygon: array de polígonos
    for (const polygon of geometry.coordinates) {
      for (const ring of polygon) {
        if (pointInPolygon(point, ring)) return true;
      }
    }
  }

  return false;
}

async function main() {
  console.log("📍 Asignación automática de kilómetros a polígonos");
  console.log(
    `   DB: ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`,
  );

  const pool = new Pool(DB_CONFIG);

  try {
    // 1. Leer polígonos activos con geometría
    const polygonsResult = await pool.query(
      `SELECT id, name, "group", geometry
       FROM config_polygons
       WHERE is_active = true AND geometry IS NOT NULL`,
    );
    const polygons = polygonsResult.rows;
    console.log(`   Polígonos con geometría: ${polygons.length}`);

    if (polygons.length === 0) {
      console.log("⚠️ No hay polígonos con geometría definida");
      return;
    }

    // 2. Leer grupos para mapear nombre → id
    const groupsResult = await pool.query(
      `SELECT id, name FROM polygon_groups`,
    );
    const groupMap = new Map<string, number>();
    for (const g of groupsResult.rows) {
      groupMap.set(g.name, g.id);
    }
    console.log(`   Grupos disponibles: ${groupMap.size}`);

    // 3. Leer todos los kilómetros
    const kmResult = await pool.query(
      `SELECT id, name, latitude, longitude FROM kilometer_markers`,
    );
    const markers = kmResult.rows;
    console.log(`   Kilómetros a procesar: ${markers.length}\n`);

    let assigned = 0;
    let noMatch = 0;

    for (const km of markers) {
      const lng = parseFloat(km.longitude);
      const lat = parseFloat(km.latitude);

      let foundPolygon: any = null;

      for (const poly of polygons) {
        let geometry = poly.geometry;
        // Parsear si es string
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

      if (foundPolygon) {
        const groupName = foundPolygon.group;
        const groupId = groupName ? groupMap.get(groupName) || null : null;

        await pool.query(
          `UPDATE kilometer_markers
           SET polygon_id = $1, polygon_group_id = $2, updated_at = NOW()
           WHERE id = $3`,
          [foundPolygon.id, groupId, km.id],
        );
        assigned++;
      } else {
        noMatch++;
      }
    }

    console.log(`✅ Asignación completada:`);
    console.log(`   Asignados: ${assigned}`);
    console.log(`   Sin polígono: ${noMatch}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});

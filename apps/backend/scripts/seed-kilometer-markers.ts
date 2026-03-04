/**
 * Script de seed para importar hitos kilométricos desde GeoJSON
 *
 * Uso:
 *   npx ts-node apps/backend/scripts/seed-kilometer-markers.ts [polygon_group_id]
 *
 * Si no se proporciona polygon_group_id, se insertarán sin grupo asignado.
 * El polygon_group_id se puede obtener consultando la tabla polygon_groups.
 *
 * Ejemplo:
 *   npx ts-node apps/backend/scripts/seed-kilometer-markers.ts 1
 */
import fs from "fs";
import path from "path";
import { Pool } from "pg";
import dotenv from "dotenv";

// Cargar .env desde la raíz del proyecto
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
// También intentar .env local del backend
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const GEOJSON_PATH = path.resolve(
  __dirname,
  "../../frontend/public/data/2026_RAC_KM_points.geojson",
);

const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "panel_waze",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
};

interface GeoJSONFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    name: string;
    [key: string]: any;
  };
}

interface GeoJSONCollection {
  type: string;
  features: GeoJSONFeature[];
}

async function main() {
  const groupId = process.argv[2] ? parseInt(process.argv[2], 10) : null;

  console.log("📍 Seed de Hitos Kilométricos");
  console.log(`   GeoJSON: ${GEOJSON_PATH}`);
  console.log(`   Grupo:   ${groupId ?? "(sin asignar)"}`);
  console.log(
    `   DB:      ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`,
  );

  // Leer GeoJSON
  if (!fs.existsSync(GEOJSON_PATH)) {
    console.error("❌ No se encontró el archivo GeoJSON:", GEOJSON_PATH);
    process.exit(1);
  }

  const raw = fs.readFileSync(GEOJSON_PATH, "utf-8");
  const geojson: GeoJSONCollection = JSON.parse(raw);

  console.log(`   Features: ${geojson.features.length}`);

  // Conectar a DB
  const pool = new Pool(DB_CONFIG);

  try {
    let inserted = 0;
    let skipped = 0;

    for (const feature of geojson.features) {
      if (feature.geometry.type !== "Point") continue;

      const [lng, lat] = feature.geometry.coordinates;
      const name = feature.properties.name?.trim();

      if (!name || !lat || !lng) {
        skipped++;
        continue;
      }

      try {
        await pool.query(
          `INSERT INTO kilometer_markers (name, latitude, longitude, polygon_group_id, is_active)
           VALUES ($1, $2, $3, $4, true)
           ON CONFLICT DO NOTHING`,
          [name, lat, lng, groupId],
        );
        inserted++;
      } catch (err: any) {
        console.warn(`⚠️ Error insertando ${name}:`, err.message);
        skipped++;
      }
    }

    console.log(
      `\n✅ Seed completado: ${inserted} insertados, ${skipped} omitidos`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});

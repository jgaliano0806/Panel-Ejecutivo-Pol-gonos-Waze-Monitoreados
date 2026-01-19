const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Leer configuración del .env del backend
require("dotenv").config({
  path: path.join(__dirname, "apps", "backend", ".env"),
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkJamsData() {
  try {
    console.log("🔍 Verificando datos de jams en la base de datos...\n");

    // 1. Contar jams activos totales
    const countResult = await pool.query(`
      SELECT COUNT(*) as total_jams
      FROM waze_jams
      WHERE is_active = true
    `);
    console.log("📊 Total de jams activos:", countResult.rows[0].total_jams);

    // 2. Ver jams con polylines
    const polylineResult = await pool.query(`
      SELECT
        uuid,
        polygon_id,
        level,
        speed_kmh,
        length_meters,
        street,
        CASE
          WHEN polyline IS NULL THEN 'NULL'
          WHEN jsonb_array_length(polyline) = 0 THEN 'EMPTY'
          ELSE 'HAS_DATA (' || jsonb_array_length(polyline) || ' points)'
        END as polyline_status
      FROM waze_jams
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log("\n📍 Últimos 10 jams activos:");
    console.table(polylineResult.rows);

    // 3. Verificar estructura de polylines por polígono
    const byPolygonResult = await pool.query(`
      SELECT
        polygon_id,
        COUNT(*) as jam_count,
        COUNT(CASE WHEN polyline IS NOT NULL AND jsonb_array_length(polyline) > 1 THEN 1 END) as jams_with_valid_polyline
      FROM waze_jams
      WHERE is_active = true
      GROUP BY polygon_id
      ORDER BY jam_count DESC
      LIMIT 10
    `);

    console.log("\n📈 Jams por polígono (Top 10):");
    console.table(byPolygonResult.rows);

    // 4. Ver un ejemplo de polyline
    const exampleResult = await pool.query(`
      SELECT
        uuid,
        polygon_id,
        polyline
      FROM waze_jams
      WHERE is_active = true
      AND polyline IS NOT NULL
      AND jsonb_array_length(polyline) > 1
      LIMIT 1
    `);

    if (exampleResult.rows.length > 0) {
      console.log("\n🔬 Ejemplo de estructura de polyline:");
      console.log(JSON.stringify(exampleResult.rows[0], null, 2));
    } else {
      console.log("\n⚠️  No se encontraron jams con polylines válidas");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

checkJamsData();

/**
 * Script para vaciar las tablas del Módulo de Incidentes
 * - incidents_history
 * - waze_alerts
 * - waze_jams
 * - waze_irregularities
 */
import "dotenv/config";
import { Pool } from "pg";

const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "panel_waze",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
};

async function main() {
  const pool = new Pool(DB_CONFIG);
  try {
    console.log("🗑️  Vaciando tablas del Módulo de Incidentes...");
    await pool.query("TRUNCATE incidents_history CASCADE");
    console.log("   ✅ incidents_history vaciada");
    await pool.query("TRUNCATE waze_alerts CASCADE");
    console.log("   ✅ waze_alerts vaciada");
    await pool.query("TRUNCATE waze_jams CASCADE");
    console.log("   ✅ waze_jams vaciada");
    await pool.query("TRUNCATE waze_irregularities CASCADE");
    console.log("   ✅ waze_irregularities vaciada");
    console.log("✅ Listo. Todas las tablas de incidentes han sido vaciadas.");
  } catch (err) {
    console.error("❌ Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

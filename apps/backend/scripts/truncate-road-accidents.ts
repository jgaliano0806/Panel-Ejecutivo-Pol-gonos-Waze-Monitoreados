/**
 * Script para vaciar las tablas de siniestros (road_accidents y accident_media)
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
    console.log("🗑️  Vaciendo tablas de siniestros...");
    await pool.query("TRUNCATE accident_media CASCADE");
    console.log("   ✅ accident_media vaciada");
    await pool.query("TRUNCATE road_accidents CASCADE");
    console.log("   ✅ road_accidents vaciada");
    console.log("✅ Listo. Todas las tablas de siniestros han sido vaciadas.");
  } catch (err) {
    console.error("❌ Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

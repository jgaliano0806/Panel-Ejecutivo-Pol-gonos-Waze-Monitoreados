/**
 * Ejecuta apps/backend/scripts/create-red-zones-table.sql contra PostgreSQL.
 *
 * Uso (desde apps/backend):
 *   npm run sql:create-red-zones
 *
 * Requiere variables de entorno de DB (mismo .env que el servidor).
 */
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config({ path: path.join(__dirname, "../../.env") });

async function main(): Promise<void> {
  const sqlPath = path.join(
    __dirname,
    "../../scripts/create-red-zones-table.sql",
  );
  if (!fs.existsSync(sqlPath)) {
    console.error("No se encontró:", sqlPath);
    process.exit(1);
  }
  const sql = fs.readFileSync(sqlPath, "utf-8");

  const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    database: process.env.DB_NAME || "postgres",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
  });

  try {
    await pool.query(sql);
    console.log("✅ Tabla zonas_peligrosas creada o ya existía.");
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

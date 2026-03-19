/**
 * Seeder de Hitos Kilométricos desde archivo Excel RAC_22_KM.
 *
 * Uso CLI:
 *   npx ts-node apps/backend/scripts/seed-km-from-excel.ts [ruta-al-xlsx]
 *
 * Si no se pasa ruta, busca "RAC_22_KM (1).xlsx" en la raíz del monorepo.
 *
 * También exporta seedFromExcelBuffer() para ser invocado desde un endpoint.
 */
import fs from "fs";
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

interface KmRow {
  route_name: string;
  km_label: string;
  latitude: number;
  longitude: number;
  name: string;
}

/**
 * Parsea el contenido de un buffer XLSX y devuelve filas normalizadas.
 * Requiere 'xlsx' instalado.
 */
export function parseExcelBuffer(buffer: Buffer): KmRow[] {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const XLSX = require("xlsx");
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const rows: KmRow[] = [];

  for (let i = 1; i < raw.length; i++) {
    const [routeRaw, kmRaw, coordsRaw] = raw[i];
    if (!routeRaw || !kmRaw || !coordsRaw) continue;

    const routeName = String(routeRaw).trim();
    const kmLabel = String(kmRaw).trim();
    const coordStr = String(coordsRaw).replace(/"/g, "").trim();

    const parts = coordStr.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) continue;

    const [lat, lng] = parts;
    const name = `${routeName} - ${kmLabel}`;

    rows.push({ route_name: routeName, km_label: kmLabel, latitude: lat, longitude: lng, name });
  }

  return rows;
}

/**
 * Ejecuta la importación completa: TRUNCATE + INSERT batch.
 * Devuelve la cantidad de registros insertados.
 */
export async function seedKilometerMarkers(
  pool: Pool,
  rows: KmRow[],
): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM kilometer_markers");

    let inserted = 0;
    const BATCH = 50;

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const values: any[] = [];
      const placeholders: string[] = [];

      batch.forEach((r, idx) => {
        const off = idx * 5;
        placeholders.push(
          `($${off + 1}, $${off + 2}, $${off + 3}, $${off + 4}, $${off + 5})`,
        );
        values.push(r.name, r.latitude, r.longitude, r.route_name, true);
      });

      await client.query(
        `INSERT INTO kilometer_markers (name, latitude, longitude, route_name, is_active)
         VALUES ${placeholders.join(", ")}`,
        values,
      );
      inserted += batch.length;
    }

    await client.query("COMMIT");
    return inserted;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ─── CLI ─────────────────────────────────────────────────────

async function main() {
  const xlsxPath =
    process.argv[2] ||
    path.resolve(__dirname, "../../../RAC_22_KM (1).xlsx");

  console.log("📍 Seed de Hitos Kilométricos desde Excel");
  console.log(`   Archivo: ${xlsxPath}`);
  console.log(`   DB:      ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);

  if (!fs.existsSync(xlsxPath)) {
    console.error("❌ No se encontró el archivo:", xlsxPath);
    process.exit(1);
  }

  const buffer = fs.readFileSync(xlsxPath);
  const rows = parseExcelBuffer(buffer);
  console.log(`   Filas parseadas: ${rows.length}`);

  if (rows.length === 0) {
    console.error("❌ No se encontraron filas válidas en el Excel");
    process.exit(1);
  }

  const pool = new Pool(DB_CONFIG);
  try {
    const count = await seedKilometerMarkers(pool, rows);
    console.log(`\n✅ Seed completado: ${count} hitos importados`);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
}

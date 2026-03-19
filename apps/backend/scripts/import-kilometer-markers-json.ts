/**
 * Importa hitos kilométricos desde un archivo JSON.
 * Elimina los datos existentes y carga los nuevos.
 *
 * Uso (desde raíz del proyecto):
 *   npx ts-node apps/backend/scripts/import-kilometer-markers-json.ts [ruta-al-archivo.json]
 *
 * Uso (desde apps/backend):
 *   npx ts-node scripts/import-kilometer-markers-json.ts [ruta-al-archivo.json]
 *
 * Si no se proporciona ruta, usa: kilometer_markers_202603190228.json (en raíz del proyecto)
 */
import fs from "fs";
import path from "path";
import { dbService } from "../src/database/dbService";
import dotenv from "dotenv";

// Cargar .env del backend (prioridad) y raíz del proyecto
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "apps/backend/.env") });

interface KilometerMarkerJson {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  route_name?: string | null;
  is_active?: boolean;
  polygon_group_id?: number | null;
  polygon_id?: string | null;
}

interface JsonInput {
  kilometer_markers: KilometerMarkerJson[];
}

async function main() {
  const jsonPath =
    process.argv[2] ||
    path.resolve(__dirname, "../../../kilometer_markers_202603190228.json");

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Archivo no encontrado: ${jsonPath}`);
    process.exit(1);
  }

  console.log("📍 Importación de Hitos Kilométricos desde JSON");
  console.log(`   Archivo: ${jsonPath}`);
  console.log(`   DB: ${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "5432"}/${process.env.DB_NAME || "panel_waze"}`);
  console.log("");

  const raw = fs.readFileSync(jsonPath, "utf-8");
  let data: JsonInput;

  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error("❌ Error al parsear JSON:", e);
    process.exit(1);
  }

  const markers = data.kilometer_markers;
  if (!Array.isArray(markers) || markers.length === 0) {
    console.error("❌ No se encontraron kilometer_markers en el JSON");
    process.exit(1);
  }

  console.log(`   Registros a importar: ${markers.length}`);
  console.log("");

  try {
    // 1. Eliminar datos existentes
    console.log("1️⃣ Eliminando datos existentes...");
    await dbService.query("DELETE FROM kilometer_markers");
    console.log("   ✅ Tabla vaciada");
    console.log("");

    // 2. Insertar en lotes (evitar query demasiado grande)
    const BATCH_SIZE = 100;
    let inserted = 0;

    console.log(`2️⃣ Insertando ${markers.length} registros (lotes de ${BATCH_SIZE})...`);

    for (let i = 0; i < markers.length; i += BATCH_SIZE) {
      const batch = markers.slice(i, i + BATCH_SIZE);
      const values: unknown[] = [];
      const placeholders: string[] = [];

      batch.forEach((m, idx) => {
        const base = idx * 8;
        placeholders.push(
          `($${base + 1}::uuid, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`,
        );
        values.push(
          m.id,
          m.name,
          m.latitude,
          m.longitude,
          m.route_name ?? null,
          m.is_active ?? true,
          m.polygon_group_id ?? null,
          m.polygon_id ?? null,
        );
      });

      const sql = `
        INSERT INTO kilometer_markers (id, name, latitude, longitude, route_name, is_active, polygon_group_id, polygon_id)
        VALUES ${placeholders.join(", ")}
      `;

      await dbService.query(sql, values);
      inserted += batch.length;
      process.stdout.write(`   Procesados: ${inserted}/${markers.length}\r`);
    }

    console.log("");
    console.log(`   ✅ ${inserted} registros insertados correctamente`);
    console.log("");
    console.log("🎉 Importación completada");
  } catch (error) {
    console.error("");
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await dbService.close();
  }
}

main();

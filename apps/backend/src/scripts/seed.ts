import { dbService } from "../database/dbService";
import fs from "fs";
import path from "path";

async function runSeed() {
  try {
    console.log("🌱 Iniciando carga de datos semilla (Catálogos)...");

    // Ruta al archivo de seed
    const seedFile = path.resolve(
      __dirname,
      "../database/seeds/seed_catalogs.sql",
    );

    if (!fs.existsSync(seedFile)) {
      console.error(`❌ Archivo de seed no encontrado: ${seedFile}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(seedFile, "utf-8");
    console.log(`📄 Leyendo archivo: ${path.basename(seedFile)}`);

    await dbService.query(sql);
    console.log("✅ Carga de datos completada exitosamente.");
  } catch (error) {
    console.error("❌ Error ejecutando seed:", error);
    process.exit(1);
  } finally {
    await dbService.close();
  }
}

runSeed();

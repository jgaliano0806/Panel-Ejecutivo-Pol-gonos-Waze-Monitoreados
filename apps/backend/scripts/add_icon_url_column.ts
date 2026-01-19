// Script para ejecutar migración: agregar icon_url a incident_types
import { dbService } from "../src/database/dbService";

async function runMigration() {
  try {
    console.log(
      "🔄 Ejecutando migración: agregar icon_url a incident_types..."
    );

    // Agregar columna icon_url
    await dbService.query(`
      ALTER TABLE incident_types
      ADD COLUMN IF NOT EXISTS icon_url VARCHAR(500);
    `);

    console.log("✅ Columna icon_url agregada exitosamente");

    // Agregar comentario
    await dbService.query(`
      COMMENT ON COLUMN incident_types.icon_url IS 'URL del icono SVG personalizado (opcional, si se usa en lugar del icono predeterminado)';
    `);

    console.log("✅ Comentario agregado");

    // Crear índice
    await dbService.query(`
      CREATE INDEX IF NOT EXISTS idx_incident_types_icon_url ON incident_types(icon_url) WHERE icon_url IS NOT NULL;
    `);

    console.log("✅ Índice creado");
    console.log("🎉 Migración completada exitosamente");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error ejecutando migración:", error);
    process.exit(1);
  }
}

runMigration();

/**
 * Script para limpiar las etiquetas [AI: ...] inventadas de los datos existentes
 * Ejecutar con: npx ts-node src/scripts/cleanAITags.ts
 */
import { dbService } from "../database/dbService";

async function cleanAITags() {
  console.log("🧹 Limpiando etiquetas [AI: ...] de waze_alerts...");

  try {
    // Contar registros afectados
    const countResult = await dbService.query(
      "SELECT COUNT(*) FROM waze_alerts WHERE report_description LIKE '%[AI:%'",
    );
    const count = parseInt(countResult.rows[0].count);
    console.log(`📊 Encontrados ${count} registros con etiquetas [AI:...]`);

    if (count > 0) {
      // Limpiar las etiquetas usando REGEXP_REPLACE
      const updateResult = await dbService.query(`
        UPDATE waze_alerts
        SET report_description = REGEXP_REPLACE(report_description, '\\s*\\[AI:[^\\]]+\\]', '', 'g')
        WHERE report_description LIKE '%[AI:%'
      `);

      console.log(`✅ Limpiados ${updateResult.rowCount} registros`);
    } else {
      console.log("✅ No hay registros que limpiar");
    }

    // Cerrar conexión
    await dbService.close();
    console.log("🏁 Limpieza completada");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

cleanAITags();

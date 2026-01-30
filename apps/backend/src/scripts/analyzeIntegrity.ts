import { dbService } from "../database/dbService";

async function analyzeIntegrity() {
  console.log("🔍 Iniciando Análisis de Integridad Referencial...\n");

  try {
    // 1. Verificar registros huérfanos (polygon_id que no existe en config_polygons)
    const tablesToCheck = [
      "polygon_snapshots",
      "incidents_history",
      "alerts",
      "waze_alerts",
      "waze_jams",
      "polygon_weather_data",
    ];

    for (const table of tablesToCheck) {
      const result = await dbService.query(`
        SELECT COUNT(*) as orphans, COUNT(DISTINCT polygon_id) as orphan_ids
        FROM ${table}
        WHERE polygon_id IS NOT NULL
        AND polygon_id NOT IN (SELECT id FROM config_polygons)
      `);

      const { orphans, orphan_ids } = result.rows[0];

      if (parseInt(orphans) > 0) {
        console.log(
          `❌ ${table}: ${orphans} registros huérfanos (${orphan_ids} polygon_ids distintos no encontrados)`,
        );

        // Mostrar ejemplos de IDs faltantes
        const examples = await dbService.query(`
            SELECT DISTINCT polygon_id
            FROM ${table}
            WHERE polygon_id NOT IN (SELECT id FROM config_polygons)
            LIMIT 5
        `);
        console.log(
          `   Ejemplos: ${examples.rows.map((r) => r.polygon_id).join(", ")}`,
        );
      } else {
        console.log(`✅ ${table}: Integridad referencial OK (0 huérfanos)`);
      }
    }

    console.log("\n🔍 Analizando Redundancia de historical_snapshots...");

    // 2. Comparar historical_snapshots con la vista materializada
    const comparison = await dbService.query(`
        WITH max_date AS (SELECT MAX(timestamp) as m FROM historical_snapshots)
        SELECT
            (SELECT COUNT(*) FROM historical_snapshots) as historical_count,
            (SELECT COUNT(*) FROM global_metrics_hourly_mv WHERE hour <= (SELECT m FROM max_date)) as mv_count
    `);

    console.log(
      `   Registros en historical_snapshots: ${comparison.rows[0].historical_count}`,
    );
    console.log(
      `   Registros equivalentes en Vista Materializada: ${comparison.rows[0].mv_count}`,
    );

    if (comparison.rows[0].historical_count === "0") {
      console.log(
        "ℹ️ historical_snapshots está vacía, se puede eliminar sin riesgo.",
      );
    } else {
      console.log(
        "ℹ️ Se recomienda mantener historical_snapshots como backup histórico si los conteos difieren significativamente.",
      );
    }

    console.log("\n🔍 Analizando columna affected_polygons...");
    const affectedCheck = await dbService.query(`
        SELECT count(*) as total,
               count(*) filter (where affected_polygons = 1) as is_one
        FROM polygon_snapshots
    `);

    const { total, is_one } = affectedCheck.rows[0];
    console.log(
      `   polygon_snapshots: ${is_one} de ${total} registros tienen affected_polygons = 1`,
    );

    if (total === is_one && total > 0) {
      console.log(
        "✅ Columna affected_polygons es 100% redundante (siempre es 1). Candidata a eliminación.",
      );
    }
  } catch (error) {
    console.error("Error durante el análisis:", error);
  }
}

analyzeIntegrity();

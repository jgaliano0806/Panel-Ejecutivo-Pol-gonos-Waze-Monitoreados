/**
 * Script para crear índices de performance en la base de datos
 * Ejecutar con: npx tsx apps/backend/src/database/add-performance-indexes.ts
 */
import { dbService } from "./dbService";

async function addPerformanceIndexes() {
  console.log("🚀 Creando índices de performance...\n");

  const indexes = [
    // waze_alerts - índice para is_active (usado en findAllActive, COUNT, incidents listing)
    {
      name: "idx_waze_alerts_is_active",
      sql: "CREATE INDEX IF NOT EXISTS idx_waze_alerts_is_active ON waze_alerts(is_active) WHERE is_active IS NOT FALSE",
    },
    // waze_alerts - índice para paginación ORDER BY created_at DESC
    {
      name: "idx_waze_alerts_created_at_desc",
      sql: "CREATE INDEX IF NOT EXISTS idx_waze_alerts_created_at_desc ON waze_alerts(created_at DESC)",
    },
    // waze_alerts - índice compuesto para filtrados comunes
    {
      name: "idx_waze_alerts_type_active",
      sql: "CREATE INDEX IF NOT EXISTS idx_waze_alerts_type_active ON waze_alerts(type, is_active)",
    },
    // waze_alerts - polygon_id para filtrado por polígono
    {
      name: "idx_waze_alerts_polygon_active",
      sql: "CREATE INDEX IF NOT EXISTS idx_waze_alerts_polygon_active ON waze_alerts(polygon_id, is_active)",
    },
    // waze_jams - índice para is_active
    {
      name: "idx_waze_jams_is_active",
      sql: "CREATE INDEX IF NOT EXISTS idx_waze_jams_is_active ON waze_jams(is_active) WHERE is_active IS NOT FALSE",
    },
    // waze_jams - polygon_id para filtrado
    {
      name: "idx_waze_jams_polygon_active",
      sql: "CREATE INDEX IF NOT EXISTS idx_waze_jams_polygon_active ON waze_jams(polygon_id, is_active)",
    },
    // user_sessions - índice para verificación rápida de sesión
    {
      name: "idx_user_sessions_active_lookup",
      sql: "CREATE INDEX IF NOT EXISTS idx_user_sessions_active_lookup ON user_sessions(id, token_hash) WHERE is_active = true",
    },
    // kpi_snapshots - índice para timestamp (usado en findClosestTo y findLatest)
    {
      name: "idx_kpi_snapshots_timestamp",
      sql: "CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_timestamp ON kpi_snapshots(timestamp DESC)",
    },
    // waze_tvt_metrics - índice compuesto para búsqueda por polígono + última entrada
    {
      name: "idx_tvt_metrics_polygon_created",
      sql: "CREATE INDEX IF NOT EXISTS idx_tvt_metrics_polygon_created ON waze_tvt_metrics(polygon_id, created_at DESC)",
    },
  ];

  for (const idx of indexes) {
    try {
      await dbService.query(idx.sql);
      console.log(`  ✅ ${idx.name}`);
    } catch (error) {
      console.error(`  ❌ ${idx.name}: ${error}`);
    }
  }

  // Ejecutar ANALYZE para actualizar estadísticas del planner
  console.log("\n📊 Actualizando estadísticas del query planner...");
  try {
    await dbService.query("ANALYZE waze_alerts");
    await dbService.query("ANALYZE waze_jams");
    await dbService.query("ANALYZE user_sessions");
    await dbService.query("ANALYZE kpi_snapshots");
    await dbService.query("ANALYZE waze_tvt_metrics");
    console.log("  ✅ ANALYZE completado");
  } catch (error) {
    console.error(`  ❌ ANALYZE: ${error}`);
  }

  // Retención de datos TVT: solo mantener las últimas 24 horas
  console.log("\n🧹 Limpiando datos TVT antiguos (>24h)...");
  try {
    const result = await dbService.query(
      `DELETE FROM waze_tvt_metrics WHERE created_at < NOW() - INTERVAL '24 hours'`,
    );
    console.log(`  ✅ ${result.rowCount || 0} registros TVT eliminados`);
  } catch (error) {
    console.error(`  ❌ Limpieza TVT: ${error}`);
  }

  console.log("\n✨ Índices de performance creados exitosamente.");
  process.exit(0);
}

addPerformanceIndexes().catch((error) => {
  console.error("Error fatal:", error);
  process.exit(1);
});

import { dbService } from "../dbService";
import * as fs from "fs";
import * as path from "path";

/**
 * Ejecuta todas las migraciones SQL pendientes
 */
export async function runMigrations(): Promise<void> {
  // __dirname ya apunta a la carpeta migrations donde está este archivo
  const migrationsDir = __dirname;

  try {
    console.log("🔄 Ejecutando migraciones de base de datos...");

    // Migración 005: Agregar status y polygon_id a road_accidents
    const migration005Path = path.join(
      migrationsDir,
      "005_add_status_to_road_accidents.sql",
    );

    if (fs.existsSync(migration005Path)) {
      const sql = fs.readFileSync(migration005Path, "utf-8");
      await dbService.query(sql);
      console.log(
        "✅ Migración 005 ejecutada: status y polygon_id agregados a road_accidents",
      );

      // Actualizar TODOS los registros existentes con status='active'
      const updateResult = await dbService.query(`
                UPDATE road_accidents
                SET status = 'active'
                WHERE status IS NULL
            `);
      console.log(
        `✅ ${updateResult.rowCount || 0} registros de road_accidents actualizados con status='active'`,
      );
    }

    // Migración 010: Extender polygon_weather_data para compatibilidad con weatherService
    const migration010Path = path.join(
      migrationsDir,
      "010_extend_weather_data.sql",
    );

    if (fs.existsSync(migration010Path)) {
      const sql = fs.readFileSync(migration010Path, "utf-8");
      await dbService.query(sql);
      console.log("✅ Migración 010 ejecutada: polygon_weather_data extendida");
    }

    // Migración 015: Agregar predictive_score a polygon_criticality_scores
    try {
      await dbService.query(`
                ALTER TABLE polygon_criticality_scores
                ADD COLUMN IF NOT EXISTS predictive_score DECIMAL(5,2) DEFAULT 0
            `);
      console.log(
        "✅ Migración 015 ejecutada: predictive_score agregado a polygon_criticality_scores",
      );
    } catch (migError: any) {
      if (!migError.message?.includes("already exists")) {
        console.warn("⚠️ Migración 015 (predictive_score):", migError.message);
      }
    }

    // Migración 016: Agregar probability_score e impact_score a latest_polygon_risk_scores
    try {
      await dbService.query(`
                ALTER TABLE polygon_criticality_scores
                ADD COLUMN IF NOT EXISTS probability_score DECIMAL(5,2) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS impact_score DECIMAL(5,2) DEFAULT 0
            `);
      console.log(
        "✅ Migración 016 ejecutada: probability_score e impact_score agregados",
      );
    } catch (migError: any) {
      if (!migError.message?.includes("already exists")) {
        console.warn("⚠️ Migración 016:", migError.message);
      }
    }

    // Migración 017: Limpiar prefijo [RUIDO] de subtypes en waze_alerts
    try {
      const cleanResult = await dbService.query(`
                UPDATE waze_alerts
                SET subtype = REGEXP_REPLACE(subtype, '^\\[RUIDO\\]\\s*', '', 'i')
                WHERE subtype LIKE '[RUIDO]%'
            `);
      if (cleanResult.rowCount && cleanResult.rowCount > 0) {
        console.log(
          `✅ Migración 017: Limpiados ${cleanResult.rowCount} subtypes con prefijo [RUIDO]`,
        );
      }
    } catch (migError: any) {
      console.warn("⚠️ Migración 017 (limpieza [RUIDO]):", migError.message);
    }

    // Migración 018: Poblar subtipos de incidentes con traducciones al español
    const migration018Path = path.join(
      migrationsDir,
      "018_populate_incident_subtypes.sql",
    );
    if (fs.existsSync(migration018Path)) {
      try {
        const sql = fs.readFileSync(migration018Path, "utf-8");
        await dbService.query(sql);
        console.log(
          "✅ Migración 018 ejecutada: Subtipos de incidentes poblados con traducciones",
        );
      } catch (migError: any) {
        // Ignorar errores de duplicados
        if (
          !migError.message?.includes("duplicate key") &&
          !migError.message?.includes("already exists")
        ) {
          console.warn("⚠️ Migración 018:", migError.message);
        }
      }
    }

    // Migración 019: Limpiar tipos duplicados y actualizar traducciones
    const migration019Path = path.join(
      migrationsDir,
      "019_cleanup_duplicate_types.sql",
    );
    if (fs.existsSync(migration019Path)) {
      try {
        const sql = fs.readFileSync(migration019Path, "utf-8");
        await dbService.query(sql);
        console.log(
          "✅ Migración 019 ejecutada: Tipos duplicados limpiados y traducciones actualizadas",
        );
      } catch (migError: any) {
        console.warn("⚠️ Migración 019:", migError.message);
      }
    }

    // Migración 020: Eliminar subtipos duplicados
    const migration020Path = path.join(
      migrationsDir,
      "020_remove_duplicate_subtypes.sql",
    );
    if (fs.existsSync(migration020Path)) {
      try {
        const sql = fs.readFileSync(migration020Path, "utf-8");
        await dbService.query(sql);
        console.log(
          "✅ Migración 020 ejecutada: Subtipos duplicados eliminados",
        );
      } catch (migError: any) {
        console.warn("⚠️ Migración 020:", migError.message);
      }
    }

    // Migración 021: Optimización - Índices GIN y Vista Materializada
    const migration021Path = path.join(
      migrationsDir,
      "021_optimize_indexes_and_views.sql",
    );
    if (fs.existsSync(migration021Path)) {
      try {
        const sql = fs.readFileSync(migration021Path, "utf-8");
        await dbService.query(sql);
        console.log(
          "✅ Migración 021 ejecutada: Índices GIN y vista materializada creados",
        );
      } catch (migError: any) {
        // Si el error es "ya existe", es advertencia
        if (
          migError.message?.includes("already exists") ||
          migError.message?.includes("ya existe") ||
          migError.code === "42P07"
        ) {
          console.log(
            "✅ Migración 021 aplicada parcialmente (algunos objetos ya existían)",
          );
        } else {
          console.warn("⚠️ Migración 021:", migError.message);
        }
      }
    }

    // Migración 022: Optimización - VARCHAR a TEXT
    const migration022Path = path.join(
      migrationsDir,
      "022_optimize_varchar_to_text.sql",
    );
    if (fs.existsSync(migration022Path)) {
      try {
        const sql = fs.readFileSync(migration022Path, "utf-8");
        await dbService.query(sql);
        console.log("✅ Migración 022 ejecutada: VARCHAR convertidos a TEXT");
      } catch (migError: any) {
        console.warn("⚠️ Migración 022:", migError.message);
      }
    }

    // Migración 023: Integridad Referencial
    const migration023Path = path.join(
      migrationsDir,
      "023_integrity_and_cleanup.sql",
    );
    if (fs.existsSync(migration023Path)) {
      try {
        const sql = fs.readFileSync(migration023Path, "utf-8");
        await dbService.query(sql);
        console.log("✅ Migración 023 ejecutada: Huérfanos, FKs y limpieza");
      } catch (migError: any) {
        // Ignorar errores de "ya existe" en constraints
        if (
          !migError.message?.includes("already exists") &&
          !migError.message?.includes("ya existe")
        ) {
          console.warn("⚠️ Migración 023:", migError.message);
        } else {
          console.log(
            "✅ Migración 023 aplicada parcialmente (constraints ya existían)",
          );
        }
      }
    }

    // Migración 024: Normalizar espacios en nombres de polígonos
    const migration024Path = path.join(
      migrationsDir,
      "024_normalize_polygon_names.sql",
    );
    if (fs.existsSync(migration024Path)) {
      try {
        const sql = fs.readFileSync(migration024Path, "utf-8");
        await dbService.query(sql);
        console.log(
          "✅ Migración 024 ejecutada: Espacios en nombres de polígonos normalizados",
        );
      } catch (migError: any) {
        console.warn("⚠️ Migración 024:", migError.message);
      }
    }

    // Migración 025: Catálogo de grupos de polígonos
    const migration025Path = path.join(
      migrationsDir,
      "025_polygon_groups_catalog.sql",
    );
    if (fs.existsSync(migration025Path)) {
      try {
        const sql = fs.readFileSync(migration025Path, "utf-8");
        await dbService.query(sql);
        console.log(
          "✅ Migración 025 ejecutada: Catálogo polygon_groups creado y poblado",
        );
      } catch (migError: any) {
        console.warn("⚠️ Migración 025:", migError.message);
      }
    }

    // Migración 026: Restaurar polígonos ocultos y grupo Ruta 9 Norte
    const migration026Path = path.join(
      migrationsDir,
      "026_restore_polygons_and_ruta9_norte.sql",
    );
    if (fs.existsSync(migration026Path)) {
      try {
        const sql = fs.readFileSync(migration026Path, "utf-8");
        await dbService.query(sql);
        console.log(
          "✅ Migración 026 ejecutada: Polígonos restaurados y Ruta 9 Norte",
        );
      } catch (migError: any) {
        console.warn("⚠️ Migración 026:", migError.message);
      }
    }

    // Migración 027: is_active en polygon_groups
    const migration027Path = path.join(
      migrationsDir,
      "027_polygon_groups_is_active.sql",
    );
    if (fs.existsSync(migration027Path)) {
      try {
        const sql = fs.readFileSync(migration027Path, "utf-8");
        await dbService.query(sql);
        console.log("✅ Migración 027 ejecutada: is_active en polygon_groups");
      } catch (migError: any) {
        console.warn("⚠️ Migración 027:", migError.message);
      }
    }

    console.log("✅ Migraciones completadas exitosamente");
  } catch (error: any) {
    // Si el error es por tabla/columna ya existente, es OK
    if (
      error.code === "42701" ||
      error.code === "42P07" ||
      error.message?.includes("already exists")
    ) {
      console.log("✅ Migraciones ya aplicadas");
    } else {
      console.error("❌ Error ejecutando migraciones:", error);
      throw error;
    }
  }
}

/* eslint-disable no-undef, no-console, @typescript-eslint/no-explicit-any */
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

    // Migración 028: Corregir columnas decimales (avg_delay, wazers_count → NUMERIC)
    const migration028Path = path.join(
      migrationsDir,
      "028_fix_decimal_columns.sql",
    );
    if (fs.existsSync(migration028Path)) {
      try {
        const sql = fs.readFileSync(migration028Path, "utf-8");
        await dbService.query(sql);
        console.log(
          "✅ Migración 028 ejecutada: columnas decimales corregidas",
        );
      } catch (migError: any) {
        if (
          !migError.message?.includes("already exists") &&
          !migError.message?.includes("ya existe")
        ) {
          console.warn("⚠️ Migración 028:", migError.message);
        } else {
          console.log("✅ Migración 028 aplicada parcialmente (ya existía)");
        }
      }
    }

    // Migración 029: Seed de los 66 polígonos productivos con feed URLs
    const migration029Path = path.join(migrationsDir, "029_seed_polygons.sql");
    if (fs.existsSync(migration029Path)) {
      try {
        const sql = fs.readFileSync(migration029Path, "utf-8");
        await dbService.query(sql);
        console.log("✅ Migración 029 ejecutada: 66 polígonos sembrados");
      } catch (migError: any) {
        console.warn("⚠️ Migración 029:", migError.message);
      }
    }

    // Migración 030: Tablas de auth (users, roles, permissions, sessions) + admin por defecto
    const migration030Path = path.join(
      migrationsDir,
      "030_users_and_admin.sql",
    );
    if (fs.existsSync(migration030Path)) {
      try {
        const sql = fs.readFileSync(migration030Path, "utf-8");
        await dbService.query(sql);
        console.log(
          "✅ Migración 030 ejecutada: auth tables + usuario admin creados",
        );
      } catch (migError: any) {
        if (
          !migError.message?.includes("already exists") &&
          !migError.message?.includes("ya existe")
        ) {
          console.warn("⚠️ Migración 030:", migError.message);
        } else {
          console.log(
            "✅ Migración 030 aplicada parcialmente (tablas ya existían)",
          );
        }
      }
    }

    // Migración 031: Ampliar accident_media para soportar documentos
    const migration031Path = path.join(
      migrationsDir,
      "031_accident_media_documents.sql",
    );
    if (fs.existsSync(migration031Path)) {
      try {
        const sql = fs.readFileSync(migration031Path, "utf-8");
        await dbService.query(sql);
        console.log(
          "✅ Migración 031 ejecutada: accident_media soporta documentos",
        );
      } catch (migError: any) {
        if (
          !migError.message?.includes("already exists") &&
          !migError.message?.includes("ya existe")
        ) {
          console.warn("⚠️ Migración 031:", migError.message);
        }
      }
    }

    // Migración 033: Campos de perfil (avatar_url, must_change_password)
    const migration033Path = path.join(
      migrationsDir,
      "033_user_profile_fields.sql",
    );
    if (fs.existsSync(migration033Path)) {
      try {
        const sql = fs.readFileSync(migration033Path, "utf-8");
        await dbService.query(sql);
        console.log(
          "✅ Migración 033 ejecutada: campos de perfil (must_change_password, avatar_url) agregados",
        );
      } catch (migError: any) {
        if (
          !migError.message?.includes("already exists") &&
          !migError.message?.includes("ya existe")
        ) {
          console.warn("⚠️ Migración 033:", migError.message);
        }
      }
    }

    const migration032Path = path.join(
      migrationsDir,
      "032_translate_catalogs_spanish.sql",
    );
    if (fs.existsSync(migration032Path)) {
      try {
        const sql = fs.readFileSync(migration032Path, "utf-8");
        await dbService.query(sql);
        console.log(
          "✅ Migración 032 ejecutada: catálogos traducidos a español",
        );
      } catch (migError: any) {
        console.warn("⚠️ Migración 032:", migError.message);
      }
    }

    // Migración 034: Corregir permisos del Supervisor (agregar incidents.view)
    const migration034Path = path.join(
      migrationsDir,
      "034_fix_supervisor_permissions.sql",
    );
    if (fs.existsSync(migration034Path)) {
      try {
        const sql = fs.readFileSync(migration034Path, "utf-8");
        await dbService.query(sql);
        console.log(
          "✅ Migración 034 ejecutada: incidents.view agregado al Supervisor",
        );
      } catch (migError: any) {
        if (
          !migError.message?.includes("already exists") &&
          !migError.message?.includes("ya existe")
        ) {
          console.warn("⚠️ Migración 034:", migError.message);
        }
      }
    }



    // Migración 035: Reestructurar permisos por módulo
    const migration035Path = path.join(
      migrationsDir,
      "035_restructure_permissions.sql",
    );
    if (fs.existsSync(migration035Path)) {
      try {
        const sql = fs.readFileSync(migration035Path, "utf-8");
        await dbService.query(sql);
        console.log(
          "✅ Migración 035 ejecutada: permisos reestructurados por módulo",
        );
      } catch (migError: any) {
        if (
          !migError.message?.includes("already exists") &&
          !migError.message?.includes("ya existe")
        ) {
          console.warn("⚠️ Migración 035:", migError.message);
        }
      }
    }

    // Migración 036: Tabla kilometer_markers (hitos kilométricos)
    const migration036Path = path.join(
      migrationsDir,
      "036_create_kilometer_markers.sql",
    );
    if (fs.existsSync(migration036Path)) {
      try {
        const sql = fs.readFileSync(migration036Path, "utf-8");
        await dbService.query(sql);
        console.log(
          "✅ Migración 036 ejecutada: tabla kilometer_markers creada",
        );
      } catch (migError: any) {
        if (
          !migError.message?.includes("already exists") &&
          !migError.message?.includes("ya existe")
        ) {
          console.warn("⚠️ Migración 036:", migError.message);
        }
      }
    }

    // Migración 037: Agregar polygon_group_id a kilometer_markers
    const migration037Path = path.join(
      migrationsDir,
      "037_km_markers_polygon_group.sql",
    );
    if (fs.existsSync(migration037Path)) {
      try {
        const sql = fs.readFileSync(migration037Path, "utf-8");
        await dbService.query(sql);
        console.log(
          "✅ Migración 037 ejecutada: polygon_group_id agregado a kilometer_markers",
        );
      } catch (migError: any) {
        if (
          !migError.message?.includes("already exists") &&
          !migError.message?.includes("ya existe")
        ) {
          console.warn("⚠️ Migración 037:", migError.message);
        }
      }
    }

    // Migración 038: Agregar polygon_id a kilometer_markers
    const migration038Path = path.join(
      migrationsDir,
      "038_km_markers_polygon_id.sql",
    );
    if (fs.existsSync(migration038Path)) {
      try {
        const sql = fs.readFileSync(migration038Path, "utf-8");
        await dbService.query(sql);
        console.log(
          "✅ Migración 038 ejecutada: polygon_id agregado a kilometer_markers",
        );
      } catch (migError: any) {
        if (
          !migError.message?.includes("already exists") &&
          !migError.message?.includes("ya existe")
        ) {
          console.warn("⚠️ Migración 038:", migError.message);
        }
      }
    }

    // Migración 039: Geo-referencia y TTS en waze_alerts
    const migration039Path = path.join(
      migrationsDir,
      "039_waze_alerts_geo_reference.sql",
    );
    if (fs.existsSync(migration039Path)) {
      try {
        const sql = fs.readFileSync(migration039Path, "utf-8");
        await dbService.query(sql);
        console.log(
          "✅ Migración 039 ejecutada: columnas geo-referencia y TTS en waze_alerts",
        );
      } catch (migError: any) {
        if (
          !migError.message?.includes("already exists") &&
          !migError.message?.includes("ya existe")
        ) {
          console.warn("⚠️ Migración 039:", migError.message);
        }
      }
    }

    // Migración 040: Seed de hitos kilométricos RAC_22_KM (822 registros)
    // Usa tabla de control para saber si ya se aplicó esta versión del seed.
    const migration040Path = path.join(
      migrationsDir,
      "040_seed_kilometer_markers_rac22.sql",
    );
    if (fs.existsSync(migration040Path)) {
      try {
        await dbService.query(
          "CREATE TABLE IF NOT EXISTS _migrations_applied (name VARCHAR(100) PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW())",
        );
        const applied = await dbService.query(
          "SELECT 1 FROM _migrations_applied WHERE name = '040_seed_km_rac22'",
        );
        if (applied.rows.length === 0) {
          const sql = fs.readFileSync(migration040Path, "utf-8");
          await dbService.query(sql);
          await dbService.query(
            "INSERT INTO _migrations_applied (name) VALUES ('040_seed_km_rac22') ON CONFLICT DO NOTHING",
          );
          const newCount = await dbService.query(
            "SELECT COUNT(*) AS cnt FROM kilometer_markers",
          );
          console.log(
            `✅ Migración 040 ejecutada: ${newCount.rows[0]?.cnt} hitos kilométricos importados desde RAC_22_KM`,
          );
        } else {
          console.log(
            "✅ Migración 040 omitida: datos RAC_22_KM ya importados",
          );
        }
      } catch (migError: any) {
        console.warn("⚠️ Migración 040:", migError.message);
      }
    }
    // Migración 041: Crear particiones faltantes de polygon_weather_data
    const migration041Path = path.join(
      migrationsDir,
      "041_create_weather_partitions.sql",
    );
    if (fs.existsSync(migration041Path)) {
      try {
        const sql = fs.readFileSync(migration041Path, "utf-8");
        await dbService.query(sql);
        console.log(
          "✅ Migración 041 ejecutada: particiones de polygon_weather_data creadas",
        );
      } catch (migError: any) {
        console.warn("⚠️ Migración 041:", migError.message);
      }
    }

    // Migración 042: Crear tabla de zonas peligrosas (danger_zones)
    const migration042Path = path.join(
      migrationsDir,
      "042_create_danger_zones.sql",
    );
    if (fs.existsSync(migration042Path)) {
      try {
        const sql = fs.readFileSync(migration042Path, "utf-8");
        await dbService.query(sql);
        console.log(
          "✅ Migración 042 ejecutada: tabla danger_zones creada",
        );
      } catch (migError: any) {
        if (
          !migError.message?.includes("already exists") &&
          !migError.message?.includes("ya existe")
        ) {
          console.warn("⚠️ Migración 042:", migError.message);
        }
      }
    }

    // Migración 043: RAC — zonas_peligrosas (geofencing JSONB + Turf)
    const migration043Path = path.join(
      migrationsDir,
      "043_create_zonas_peligrosas.sql",
    );
    if (fs.existsSync(migration043Path)) {
      try {
        const sql = fs.readFileSync(migration043Path, "utf-8");
        await dbService.query(sql);
        console.log(
          "✅ Migración 043 ejecutada: tabla zonas_peligrosas creada",
        );
      } catch (migError: any) {
        if (
          !migError.message?.includes("already exists") &&
          !migError.message?.includes("ya existe")
        ) {
          console.warn("⚠️ Migración 043:", migError.message);
        }
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

-- ===========================================
-- MIGRACIÓN 023: Integridad Referencial y Limpieza
-- Fase 3 de optimización (Alto Impacto)
-- ===========================================
-- 1. Gestión de Registros Huérfanos
-- Insertar polígono 'UNKNOWN' para satisfacer FK de registros históricos huérfanos
INSERT INTO config_polygons (id, name, "group", feed_url, is_active)
VALUES (
        'UNKNOWN',
        'System Unknown Polygon',
        'System',
        'http://localhost/dummy',
        false
    ) ON CONFLICT (id) DO NOTHING;
-- 2. Limpieza de Redundancia
-- Eliminar columna affected_polygons que siempre es 1
ALTER TABLE polygon_snapshots DROP COLUMN IF EXISTS affected_polygons;
-- 3. Aplicación de Foreign Keys
-- Asegurar integridad referencial en todas las tablas principales
-- incidents_history
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_incidents_polygon'
) THEN
ALTER TABLE incidents_history
ADD CONSTRAINT fk_incidents_polygon FOREIGN KEY (polygon_id) REFERENCES config_polygons(id);
END IF;
END $$;
-- alerts
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_alerts_polygon'
) THEN
ALTER TABLE alerts
ADD CONSTRAINT fk_alerts_polygon FOREIGN KEY (polygon_id) REFERENCES config_polygons(id);
END IF;
END $$;
-- waze_alerts
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_waze_alerts_polygon'
) THEN
ALTER TABLE waze_alerts
ADD CONSTRAINT fk_waze_alerts_polygon FOREIGN KEY (polygon_id) REFERENCES config_polygons(id);
END IF;
END $$;
-- waze_jams
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_waze_jams_polygon'
) THEN
ALTER TABLE waze_jams
ADD CONSTRAINT fk_waze_jams_polygon FOREIGN KEY (polygon_id) REFERENCES config_polygons(id);
END IF;
END $$;
-- polygon_snapshots
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_snapshots_polygon'
) THEN
ALTER TABLE polygon_snapshots
ADD CONSTRAINT fk_snapshots_polygon FOREIGN KEY (polygon_id) REFERENCES config_polygons(id);
END IF;
END $$;
-- polygon_weather_data
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_weather_polygon'
) THEN
ALTER TABLE polygon_weather_data
ADD CONSTRAINT fk_weather_polygon FOREIGN KEY (polygon_id) REFERENCES config_polygons(id);
END IF;
END $$;
-- Recrear vista materializada (depende de polygon_snapshots)
-- Es necesario porque cambió la tabla base (drop column)
REFRESH MATERIALIZED VIEW global_metrics_hourly_mv;

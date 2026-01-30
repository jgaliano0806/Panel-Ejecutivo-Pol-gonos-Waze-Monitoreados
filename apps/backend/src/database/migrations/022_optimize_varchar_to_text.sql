-- ===========================================
-- MIGRACIÓN 022: Optimización de Tipos de Datos (VARCHAR -> TEXT)
-- Fase 2 de optimización
-- ===========================================
-- PostgreSQL recomienda usar TEXT en lugar de VARCHAR(n) para campos de texto arbitrario
-- Esto elimina límites arbitrarios y overhead de chequeo de longitud
-- 1. config_polygons
ALTER TABLE config_polygons
ALTER COLUMN name TYPE TEXT;
ALTER TABLE config_polygons
ALTER COLUMN "group" TYPE TEXT;
-- 2. alerts
ALTER TABLE alerts
ALTER COLUMN location TYPE TEXT;
ALTER TABLE alerts
ALTER COLUMN polygon_name TYPE TEXT;
ALTER TABLE alerts
ALTER COLUMN acknowledged_by TYPE TEXT;
-- 3. incidents_history
ALTER TABLE incidents_history
ALTER COLUMN polygon_name TYPE TEXT;
ALTER TABLE incidents_history
ALTER COLUMN street TYPE TEXT;
ALTER TABLE incidents_history
ALTER COLUMN city TYPE TEXT;
-- 4. waze_alerts
-- Usar IF EXISTS por si la tabla no existe en todos los entornos (aunque debería)
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'waze_alerts'
) THEN
ALTER TABLE waze_alerts
ALTER COLUMN street TYPE TEXT;
ALTER TABLE waze_alerts
ALTER COLUMN city TYPE TEXT;
ALTER TABLE waze_alerts
ALTER COLUMN report_by TYPE TEXT;
ALTER TABLE waze_alerts
ALTER COLUMN country TYPE TEXT;
END IF;
END $$;
-- 5. waze_jams
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'waze_jams'
) THEN
ALTER TABLE waze_jams
ALTER COLUMN street TYPE TEXT;
ALTER TABLE waze_jams
ALTER COLUMN city TYPE TEXT;
END IF;
END $$;

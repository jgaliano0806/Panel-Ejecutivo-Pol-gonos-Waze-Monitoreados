-- ════════════════════════════════════════════════════════════════
-- MIGRATION: 006_cleanup_and_optimize
-- Fecha: 2025-12-30
-- Descripción: Eliminar tablas obsoletas, optimizar índices, normalizar tipos
-- ════════════════════════════════════════════════════════════════

BEGIN;

-- ──────────────────────────────────────────────────────────────
-- PASO 1: Agregar updated_at donde falte
-- Basado en auditoría: historical_snapshots, polygon_snapshots, etc.
-- ──────────────────────────────────────────────────────────────

DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'historical_snapshots',
        'polygon_snapshots',
        'incidents_history',
        'daily_statistics',
        'polygon_metrics_timeseries',
        'group_performance_daily',
        'polygon_weather_data',
        'role_permissions',
        'permissions',
        'polygon_criticality_scores',
        'accident_media',
        'user_roles',
        'audit_logs',
        'waze_jams',
        'waze_irregularities'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        -- Verificar si la columna ya existe para evitar errores
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = tbl
            AND column_name = 'updated_at'
        ) THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW()', tbl);

            -- Trigger para auto-update (asumiendo que la función update_updated_at ya existe o crearla)
            EXECUTE format('
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $func$
                BEGIN
                    NEW.updated_at = NOW();
                    RETURN NEW;
                END;
                $func$ LANGUAGE plpgsql;
            ');

            EXECUTE format('
                DROP TRIGGER IF EXISTS update_%I_modtime ON %I;
                CREATE TRIGGER update_%I_modtime
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
            ', tbl, tbl, tbl, tbl);

            RAISE NOTICE 'Added updated_at to table: %', tbl;
        ELSE
            RAISE NOTICE 'Table % already has updated_at', tbl;
        END IF;
    END LOOP;
END $$;

-- ──────────────────────────────────────────────────────────────
-- PASO 2: Agregar índices faltantes en Foreign Keys
-- Basado en auditoría: user_roles.assigned_by, audit_logs.user_id
-- ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_user_roles_assigned_by ON user_roles(assigned_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Índices de optimización adicionales sugeridos
CREATE INDEX IF NOT EXISTS idx_waze_alerts_active_type ON waze_alerts(type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_waze_jams_active_level ON waze_jams(level) WHERE is_active = true;

-- ──────────────────────────────────────────────────────────────
-- PASO 3: Optimizar tipos de columnas (Safe changes only)
-- ──────────────────────────────────────────────────────────────

-- Convertir waze_alerts.report_description de TEXT a VARCHAR(500) si es apropiado
-- (Solo si estamos seguros que no hay datos más largos, por ahora lo dejamos como TEXT pero optimizado en storage si fuera necesario)
-- ALTER TABLE waze_alerts ALTER COLUMN report_description TYPE VARCHAR(500);

-- No hacer cambios destructivos de tipos sin backup previo o confirmación de datos.

COMMIT;

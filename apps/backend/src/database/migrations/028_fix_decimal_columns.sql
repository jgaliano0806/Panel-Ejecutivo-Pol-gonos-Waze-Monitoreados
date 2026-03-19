-- ===========================================
-- Migración 028: Corregir columnas INTEGER que reciben valores decimales
-- avg_delay en polygon_snapshots: es un promedio de delays, puede tener decimales
-- wazers_count en waze_tvt_metrics: Waze API retorna wazersCount como float
--
-- NOTA: La vista materializada global_metrics_hourly_mv (migración 021)
-- depende de avg_delay. Hay que dropearla, alterar la columna, y recrearla.
-- ===========================================

DO $$
BEGIN
    -- 1. Verificar si avg_delay ya es NUMERIC; si no, convertir
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'polygon_snapshots'
          AND column_name = 'avg_delay'
          AND data_type = 'integer'
    ) THEN
        -- Dropear la vista materializada que depende de avg_delay
        DROP MATERIALIZED VIEW IF EXISTS global_metrics_hourly_mv;

        ALTER TABLE polygon_snapshots
            ALTER COLUMN avg_delay TYPE NUMERIC(10, 2);

        -- Recrear la vista materializada (definición de migración 021)
        CREATE MATERIALIZED VIEW global_metrics_hourly_mv AS
        SELECT date_trunc('hour', timestamp) AS hour,
            SUM(total_jams) AS total_jams,
            SUM(total_incidents) AS total_incidents,
            ROUND(AVG(avg_speed), 2) AS avg_speed,
            ROUND(AVG(avg_delay), 0)::INTEGER AS avg_delay,
            SUM(critical_km) AS critical_km,
            COUNT(DISTINCT polygon_id) AS affected_polygons,
            COUNT(
                CASE
                    WHEN critical_km > 0 THEN 1
                END
            ) AS critical_polygons,
            MIN(created_at) AS first_snapshot_at,
            MAX(created_at) AS last_snapshot_at
        FROM polygon_snapshots
        GROUP BY date_trunc('hour', timestamp)
        ORDER BY hour DESC;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_global_metrics_hour
            ON global_metrics_hourly_mv(hour);
        CREATE INDEX IF NOT EXISTS idx_global_metrics_hour_desc
            ON global_metrics_hourly_mv(hour DESC);

        COMMENT ON MATERIALIZED VIEW global_metrics_hourly_mv IS
            'Vista materializada con métricas globales agregadas por hora. Refrescar con: REFRESH MATERIALIZED VIEW CONCURRENTLY global_metrics_hourly_mv;';

        RAISE NOTICE 'avg_delay convertido a NUMERIC(10,2) y vista materializada recreada';
    ELSE
        RAISE NOTICE 'avg_delay ya es NUMERIC, no se requiere conversión';
    END IF;

    -- 2. Verificar si wazers_count necesita conversión
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'waze_tvt_metrics'
          AND column_name = 'wazers_count'
          AND data_type = 'integer'
    ) THEN
        ALTER TABLE waze_tvt_metrics
            ALTER COLUMN wazers_count TYPE NUMERIC(10, 2);
        RAISE NOTICE 'wazers_count convertido a NUMERIC(10,2)';
    ELSE
        RAISE NOTICE 'wazers_count ya es NUMERIC o tabla no existe, no se requiere conversión';
    END IF;
END $$;

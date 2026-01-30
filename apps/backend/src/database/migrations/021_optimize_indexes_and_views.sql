-- ===========================================
-- MIGRACIÓN 021: Optimización de Índices GIN y Vista Materializada
-- Fase 1 de optimización (sin riesgo de pérdida de datos)
-- ===========================================
-- 1. Índices GIN faltantes para columnas JSONB
-- Acelera consultas de contención (@>) y existencia de claves (?)
-- Índice para alerts.related_incident_ids (array de IDs)
CREATE INDEX IF NOT EXISTS idx_alerts_related_incidents_gin ON alerts USING GIN(related_incident_ids);
-- Índice para alerts.data (metadatos variables)
CREATE INDEX IF NOT EXISTS idx_alerts_data_gin ON alerts USING GIN(data);
-- Índice para config_polygons.geometry (GeoJSON)
CREATE INDEX IF NOT EXISTS idx_config_polygons_geometry_gin ON config_polygons USING GIN(geometry);
-- Índice para config_polygons.coordinates
CREATE INDEX IF NOT EXISTS idx_config_polygons_coordinates_gin ON config_polygons USING GIN(coordinates);
-- Índice para daily_statistics.incidents_by_type
CREATE INDEX IF NOT EXISTS idx_daily_stats_incidents_by_type_gin ON daily_statistics USING GIN(incidents_by_type);
-- 2. Vista Materializada para métricas globales
-- Reemplaza la necesidad de historical_snapshots como tabla separada
-- Calcula agregados desde polygon_snapshots
DROP MATERIALIZED VIEW IF EXISTS global_metrics_hourly_mv;
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
-- Índice único para refresco concurrente
CREATE UNIQUE INDEX IF NOT EXISTS idx_global_metrics_hour ON global_metrics_hourly_mv(hour);
-- Índice para consultas de rango de fechas
CREATE INDEX IF NOT EXISTS idx_global_metrics_hour_desc ON global_metrics_hourly_mv(hour DESC);
-- 3. Índices adicionales para optimizar consultas frecuentes
-- Índice compuesto para incidents_history por tipo y fecha
CREATE INDEX IF NOT EXISTS idx_incidents_hist_subtype_date ON incidents_history(subtype, first_seen_at DESC);
-- Índice para polygon_weather_data.weather_code (consultas por código WMO)
CREATE INDEX IF NOT EXISTS idx_weather_code ON polygon_weather_data(weather_code);
-- Índice parcial para alertas activas (no reconocidas)
CREATE INDEX IF NOT EXISTS idx_alerts_active_unack ON alerts(polygon_id, created_at DESC)
WHERE is_acknowledged = FALSE;
-- 4. Comentarios actualizados
COMMENT ON MATERIALIZED VIEW global_metrics_hourly_mv IS 'Vista materializada con métricas globales agregadas por hora. Refrescar con: REFRESH MATERIALIZED VIEW CONCURRENTLY global_metrics_hourly_mv;';
COMMENT ON INDEX idx_alerts_related_incidents_gin IS 'Acelera búsquedas en array de IDs relacionados';
COMMENT ON INDEX idx_alerts_data_gin IS 'Acelera consultas JSONB en metadata de alertas';
COMMENT ON INDEX idx_config_polygons_geometry_gin IS 'Acelera consultas espaciales en geometría GeoJSON';

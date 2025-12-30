-- ===========================================
-- ESQUEMA DE BASE DE DATOS - PANEL WAZE
-- PostgreSQL Database Schema
-- ===========================================

-- Crear extensión para UUIDs (opcional, pero útil)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- TABLA: config_polygons
-- Configuración dinámica de polígonos
-- ===========================================
CREATE TABLE IF NOT EXISTS config_polygons (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    "group" VARCHAR(100),
    feed_url TEXT NOT NULL,
    tvt_feed_url TEXT,
    coordinates JSONB, -- { lat: number, lon: number }
    geometry JSONB,    -- GeoJSON Polygon
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_config_polygons_group ON config_polygons("group");
CREATE INDEX IF NOT EXISTS idx_config_polygons_active ON config_polygons(is_active);

-- ===========================================
-- TABLA: historical_snapshots
-- Almacena snapshots globales del sistema
-- ===========================================
CREATE TABLE IF NOT EXISTS historical_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    total_jams INTEGER NOT NULL DEFAULT 0,
    total_incidents INTEGER NOT NULL DEFAULT 0,
    avg_speed NUMERIC(5, 2),
    avg_delay INTEGER NOT NULL DEFAULT 0,
    critical_km NUMERIC(10, 2) NOT NULL DEFAULT 0,
    affected_polygons INTEGER NOT NULL DEFAULT 0,
    critical_polygons INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_historical_snapshots_timestamp ON historical_snapshots(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_historical_snapshots_created_at ON historical_snapshots(created_at DESC);

-- ===========================================
-- TABLA: polygon_snapshots
-- Almacena snapshots por polígono
-- ===========================================
CREATE TABLE IF NOT EXISTS polygon_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    polygon_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    total_jams INTEGER NOT NULL DEFAULT 0,
    total_incidents INTEGER NOT NULL DEFAULT 0,
    avg_speed NUMERIC(5, 2),
    avg_delay INTEGER NOT NULL DEFAULT 0,
    critical_km NUMERIC(10, 2) NOT NULL DEFAULT 0,
    affected_polygons INTEGER NOT NULL DEFAULT 1,
    critical_polygons INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_polygon_snapshots_polygon_id ON polygon_snapshots(polygon_id);
CREATE INDEX IF NOT EXISTS idx_polygon_snapshots_timestamp ON polygon_snapshots(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_polygon_snapshots_polygon_timestamp ON polygon_snapshots(polygon_id, timestamp DESC);

-- ===========================================
-- TABLA: alerts
-- Almacena alertas del sistema
-- ===========================================
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id VARCHAR(100) UNIQUE NOT NULL,
    polygon_id VARCHAR(50),
    polygon_name VARCHAR(255),
    severity INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    location VARCHAR(255),
    message TEXT,
    data JSONB,
    is_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para alertas
CREATE INDEX IF NOT EXISTS idx_alerts_polygon_id ON alerts(polygon_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_is_acknowledged ON alerts(is_acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);

-- ===========================================
-- FUNCIÓN: Limpiar snapshots antiguos
-- Elimina snapshots más antiguos que 7 días
-- ===========================================
CREATE OR REPLACE FUNCTION cleanup_old_snapshots()
RETURNS void AS $$
BEGIN
    -- Eliminar snapshots globales más antiguos que 7 días
    DELETE FROM historical_snapshots
    WHERE timestamp < NOW() - INTERVAL '7 days';

    -- Eliminar snapshots de polígonos más antiguos que 7 días
    DELETE FROM polygon_snapshots
    WHERE timestamp < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- TRIGGER: Actualizar updated_at automáticamente
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger de forma idempotente
DROP TRIGGER IF EXISTS update_alerts_updated_at ON alerts;
CREATE TRIGGER update_alerts_updated_at
    BEFORE UPDATE ON alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- VISTA: Resumen de datos históricos
-- ===========================================
CREATE OR REPLACE VIEW historical_summary AS
SELECT
    COUNT(*) as total_snapshots,
    MIN(timestamp) as oldest_snapshot,
    MAX(timestamp) as newest_snapshot,
    COUNT(DISTINCT DATE_TRUNC('hour', timestamp)) as unique_hours
FROM historical_snapshots;

-- ===========================================
-- FASE 0: MEJORAS A TABLA ALERTS
-- ===========================================
ALTER TABLE alerts
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS resolution_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS related_incident_ids JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS response_time_minutes DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS effectiveness_score INTEGER CHECK (effectiveness_score BETWEEN 1 AND 5);

CREATE INDEX IF NOT EXISTS idx_alerts_resolved
    ON alerts(resolved_at DESC) WHERE resolved_at IS NOT NULL;

COMMENT ON COLUMN alerts.resolution_type IS 'manual, auto_resolved, false_positive';
COMMENT ON COLUMN alerts.effectiveness_score IS 'Calificación 1-5 de utilidad de la alerta';

-- ===========================================
-- FASE 1: HISTORIAL DETALLADO DE INCIDENTES
-- ===========================================
CREATE TABLE IF NOT EXISTS incidents_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identificación
    incident_id VARCHAR(100) NOT NULL,
    polygon_id VARCHAR(50) NOT NULL,
    polygon_name VARCHAR(200),

    -- Clasificación
    type VARCHAR(50) NOT NULL,
    subtype VARCHAR(50),
    severity INTEGER,

    -- Ubicación
    street VARCHAR(200),
    city VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Calidad del reporte
    confidence DECIMAL(3,2),
    reliability DECIMAL(3,2),
    n_thumbs_up INTEGER DEFAULT 0,

    -- Tiempos
    first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,

    -- Contexto
    blocking_jams INTEGER DEFAULT 0,
    estimated_delay_minutes INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_hist_polygon_date
    ON incidents_history(polygon_id, first_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_hist_type_date
    ON incidents_history(type, first_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_hist_duration
    ON incidents_history(duration_minutes DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_incidents_hist_location
    ON incidents_history(latitude, longitude);

-- ===========================================
-- FASE 1: ESTADÍSTICAS AGREGADAS DIARIAS
-- ===========================================
CREATE TABLE IF NOT EXISTS daily_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,

    -- KPIs globales
    avg_fluidity_percentage DECIMAL(5,2),
    min_fluidity_percentage DECIMAL(5,2),
    max_fluidity_percentage DECIMAL(5,2),
    avg_speed DECIMAL(5,2),
    min_speed DECIMAL(5,2),

    -- Incidentes
    total_incidents INTEGER DEFAULT 0,
    critical_incidents INTEGER DEFAULT 0,
    incidents_by_type JSONB DEFAULT '{}'::jsonb,

    -- Congestión
    total_jams INTEGER DEFAULT 0,
    avg_jam_duration_minutes DECIMAL(10,2),
    critical_km_hours DECIMAL(15,2),

    -- Alertas
    total_alerts INTEGER DEFAULT 0,
    critical_alerts INTEGER DEFAULT 0,
    avg_response_time_minutes DECIMAL(10,2),

    -- Peor/mejor
    worst_polygon_id VARCHAR(50),
    worst_polygon_score DECIMAL(5,2),
    best_polygon_id VARCHAR(50),
    best_polygon_score DECIMAL(5,2),

    -- Horarios pico
    peak_congestion_hour INTEGER CHECK (peak_congestion_hour BETWEEN 0 AND 23),
    peak_incidents_hour INTEGER CHECK (peak_incidents_hour BETWEEN 0 AND 23),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_statistics(date DESC);

-- ===========================================
-- FASE 2: SERIES TEMPORALES ALTA GRANULARIDAD
-- ===========================================
CREATE TABLE IF NOT EXISTS polygon_metrics_timeseries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    polygon_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Métricas de velocidad
    avg_speed DECIMAL(5,2),
    min_speed DECIMAL(5,2),
    max_speed DECIMAL(5,2),

    -- Métricas de congestión
    jam_count INTEGER DEFAULT 0,
    avg_jam_length DECIMAL(10,2),
    critical_jam_count INTEGER DEFAULT 0,
    stopped_jam_count INTEGER DEFAULT 0,

    -- Métricas de incidentes
    incident_count INTEGER DEFAULT 0,
    critical_incident_count INTEGER DEFAULT 0,

    -- Métricas de demora
    total_delay_seconds INTEGER DEFAULT 0,
    avg_delay_seconds DECIMAL(10,2),
    max_delay_seconds INTEGER DEFAULT 0,

    -- Índices calculados
    congestion_index DECIMAL(5,2),
    fluidity_percentage DECIMAL(5,2),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_polygon_time
    ON polygon_metrics_timeseries(polygon_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp
    ON polygon_metrics_timeseries(timestamp DESC);

-- ===========================================
-- FASE 2: PERFORMANCE POR GRUPO
-- ===========================================
CREATE TABLE IF NOT EXISTS group_performance_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,

    -- Métricas promedio del grupo
    avg_speed DECIMAL(5,2),
    avg_delay DECIMAL(10,2),
    avg_congestion_index DECIMAL(5,2),
    fluidity_percentage DECIMAL(5,2),

    -- Totales
    total_jams INTEGER DEFAULT 0,
    total_incidents INTEGER DEFAULT 0,
    critical_km DECIMAL(10,2),

    -- Polígonos afectados
    affected_polygons INTEGER DEFAULT 0,
    critical_polygons INTEGER DEFAULT 0,

    -- Peor/mejor del grupo
    worst_polygon_id VARCHAR(50),
    best_polygon_id VARCHAR(50),

    -- Ranking
    rank_by_fluidity INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_name, date)
);

CREATE INDEX IF NOT EXISTS idx_group_perf_date
    ON group_performance_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_group_perf_name_date
    ON group_performance_daily(group_name, date DESC);

-- ===========================================
-- POC CLIMA: DATOS METEOROLÓGICOS POR POLÍGONO
-- ===========================================
CREATE TABLE IF NOT EXISTS polygon_weather_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    polygon_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Temperatura
    temperature_celsius DECIMAL(4,1),
    temperature_feels_like DECIMAL(4,1),

    -- Precipitación
    precipitation_mm DECIMAL(5,2),
    rain_mm DECIMAL(5,2),
    snow_mm DECIMAL(5,2),
    precipitation_probability INTEGER CHECK (precipitation_probability BETWEEN 0 AND 100),

    -- Viento
    wind_speed_kmh DECIMAL(5,2),
    wind_direction_degrees INTEGER CHECK (wind_direction_degrees BETWEEN 0 AND 360),
    wind_gusts_kmh DECIMAL(5,2),

    -- Visibilidad y condiciones
    visibility_meters INTEGER,
    cloud_cover_percentage INTEGER CHECK (cloud_cover_percentage BETWEEN 0 AND 100),

    -- Condiciones de carretera
    road_temperature_celsius DECIMAL(4,1),
    is_freezing_risk BOOLEAN DEFAULT FALSE,

    -- Código de condición meteorológica (WMO)
    weather_code INTEGER,
    weather_description VARCHAR(100),

    -- Alertas meteorológicas
    has_weather_alert BOOLEAN DEFAULT FALSE,
    alert_severity VARCHAR(20),
    alert_description TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weather_polygon_time
    ON polygon_weather_data(polygon_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_weather_timestamp
    ON polygon_weather_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_weather_freezing_risk
    ON polygon_weather_data(is_freezing_risk) WHERE is_freezing_risk = TRUE;
CREATE INDEX IF NOT EXISTS idx_weather_alerts
    ON polygon_weather_data(has_weather_alert) WHERE has_weather_alert = TRUE;

-- ===========================================
-- COMENTARIOS EN TABLAS
-- ===========================================
COMMENT ON TABLE historical_snapshots IS 'Snapshots globales del sistema cada hora';
COMMENT ON TABLE polygon_snapshots IS 'Snapshots individuales por polígono';
COMMENT ON TABLE alerts IS 'Alertas del sistema generadas automáticamente';
COMMENT ON TABLE incidents_history IS 'Historial detallado de cada incidente con duración y ubicación';
COMMENT ON TABLE daily_statistics IS 'Resumen ejecutivo diario con KPIs agregados';
COMMENT ON TABLE polygon_metrics_timeseries IS 'Métricas de polígonos cada 15 minutos para análisis temporal';
COMMENT ON TABLE group_performance_daily IS 'Performance diaria comparativa entre grupos de polígonos';
COMMENT ON TABLE polygon_weather_data IS 'Datos meteorológicos por polígono (Open-Meteo API) con alertas de riesgo';


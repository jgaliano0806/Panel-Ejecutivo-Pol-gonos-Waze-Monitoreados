-- ===========================================
-- MIGRACIÓN: Mejoras BBDD + Clima POC
-- Fecha: 2025-12-24
-- ===========================================

-- FASE 0: Mejoras a tabla alerts
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

-- FASE 1: Historial de incidentes
CREATE TABLE IF NOT EXISTS incidents_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id VARCHAR(100) NOT NULL,
    polygon_id VARCHAR(50) NOT NULL,
    polygon_name VARCHAR(200),
    type VARCHAR(50) NOT NULL,
    subtype VARCHAR(50),
    severity INTEGER,
    street VARCHAR(200),
    city VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    confidence DECIMAL(3,2),
    reliability DECIMAL(3,2),
    n_thumbs_up INTEGER DEFAULT 0,
    first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
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

-- FASE 1: Estadísticas diarias
CREATE TABLE IF NOT EXISTS daily_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    avg_fluidity_percentage DECIMAL(5,2),
    min_fluidity_percentage DECIMAL(5,2),
    max_fluidity_percentage DECIMAL(5,2),
    avg_speed DECIMAL(5,2),
    min_speed DECIMAL(5,2),
    total_incidents INTEGER DEFAULT 0,
    critical_incidents INTEGER DEFAULT 0,
    incidents_by_type JSONB DEFAULT '{}'::jsonb,
    total_jams INTEGER DEFAULT 0,
    avg_jam_duration_minutes DECIMAL(10,2),
    critical_km_hours DECIMAL(15,2),
    total_alerts INTEGER DEFAULT 0,
    critical_alerts INTEGER DEFAULT 0,
    avg_response_time_minutes DECIMAL(10,2),
    worst_polygon_id VARCHAR(50),
    worst_polygon_score DECIMAL(5,2),
    best_polygon_id VARCHAR(50),
    best_polygon_score DECIMAL(5,2),
    peak_congestion_hour INTEGER CHECK (peak_congestion_hour BETWEEN 0 AND 23),
    peak_incidents_hour INTEGER CHECK (peak_incidents_hour BETWEEN 0 AND 23),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_statistics(date DESC);

-- FASE 2: Series temporales 15 minutos
CREATE TABLE IF NOT EXISTS polygon_metrics_timeseries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    polygon_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    avg_speed DECIMAL(5,2),
    min_speed DECIMAL(5,2),
    max_speed DECIMAL(5,2),
    jam_count INTEGER DEFAULT 0,
    avg_jam_length DECIMAL(10,2),
    critical_jam_count INTEGER DEFAULT 0,
    stopped_jam_count INTEGER DEFAULT 0,
    incident_count INTEGER DEFAULT 0,
    critical_incident_count INTEGER DEFAULT 0,
    total_delay_seconds INTEGER DEFAULT 0,
    avg_delay_seconds DECIMAL(10,2),
    max_delay_seconds INTEGER DEFAULT 0,
    congestion_index DECIMAL(5,2),
    fluidity_percentage DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_polygon_time
    ON polygon_metrics_timeseries(polygon_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp
    ON polygon_metrics_timeseries(timestamp DESC);

-- FASE 2: Performance por grupo
CREATE TABLE IF NOT EXISTS group_performance_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    avg_speed DECIMAL(5,2),
    avg_delay DECIMAL(10,2),
    avg_congestion_index DECIMAL(5,2),
    fluidity_percentage DECIMAL(5,2),
    total_jams INTEGER DEFAULT 0,
    total_incidents INTEGER DEFAULT 0,
    critical_km DECIMAL(10,2),
    affected_polygons INTEGER DEFAULT 0,
    critical_polygons INTEGER DEFAULT 0,
    worst_polygon_id VARCHAR(50),
    best_polygon_id VARCHAR(50),
    rank_by_fluidity INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_name, date)
);

CREATE INDEX IF NOT EXISTS idx_group_perf_date
    ON group_performance_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_group_perf_name_date
    ON group_performance_daily(group_name, date DESC);

-- POC CLIMA: Datos meteorológicos
CREATE TABLE IF NOT EXISTS polygon_weather_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    polygon_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    temperature_celsius DECIMAL(4,1),
    temperature_feels_like DECIMAL(4,1),
    precipitation_mm DECIMAL(5,2),
    rain_mm DECIMAL(5,2),
    snow_mm DECIMAL(5,2),
    precipitation_probability INTEGER CHECK (precipitation_probability BETWEEN 0 AND 100),
    wind_speed_kmh DECIMAL(5,2),
    wind_direction_degrees INTEGER CHECK (wind_direction_degrees BETWEEN 0 AND 360),
    wind_gusts_kmh DECIMAL(5,2),
    visibility_meters INTEGER,
    cloud_cover_percentage INTEGER CHECK (cloud_cover_percentage BETWEEN 0 AND 100),
    road_temperature_celsius DECIMAL(4,1),
    is_freezing_risk BOOLEAN DEFAULT FALSE,
    weather_code INTEGER,
    weather_description VARCHAR(100),
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

-- Comentarios
COMMENT ON TABLE incidents_history IS 'Historial detallado de cada incidente con duración y ubicación';
COMMENT ON TABLE daily_statistics IS 'Resumen ejecutivo diario con KPIs agregados';
COMMENT ON TABLE polygon_metrics_timeseries IS 'Métricas de polígonos cada 15 minutos para análisis temporal';
COMMENT ON TABLE group_performance_daily IS 'Performance diaria comparativa entre grupos de polígonos';
COMMENT ON TABLE polygon_weather_data IS 'Datos meteorológicos por polígono (Open-Meteo API) con alertas de riesgo';




-- ========================================
-- MIGRACIÓN: Sistema de Scoring de Riesgos
-- Fecha: 2025-01-24
-- ========================================

-- Tabla para almacenar scores de criticidad calculados
CREATE TABLE IF NOT EXISTS polygon_criticality_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    polygon_id VARCHAR(50) NOT NULL,
    polygon_name VARCHAR(200) NOT NULL,
    group_name VARCHAR(100) NOT NULL,

    -- Timestamp del cálculo
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- FACTORES DE RIESGO (0-100 cada uno)
    -- Factor 1: Tráfico y Congestión
    traffic_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    jam_density DECIMAL(5,2), -- Jams por km
    avg_jam_level DECIMAL(5,2),
    stopped_traffic_percentage DECIMAL(5,2),

    -- Factor 2: Incidentes y Severidad
    incident_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    total_incidents INTEGER DEFAULT 0,
    critical_incidents INTEGER DEFAULT 0,
    road_closures INTEGER DEFAULT 0,
    accidents INTEGER DEFAULT 0,

    -- Factor 3: Clima y Condiciones
    weather_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    weather_condition VARCHAR(100),
    visibility_km DECIMAL(5,2),
    temperature_c DECIMAL(5,2),
    precipitation_mm DECIMAL(5,2),
    road_risk_level VARCHAR(20), -- safe, caution, dangerous

    -- Factor 4: Velocidad y Fluidez
    speed_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    avg_speed DECIMAL(5,2),
    min_speed DECIMAL(5,2),
    fluidity_percentage DECIMAL(5,2),
    speed_drop_percentage DECIMAL(5,2),

    -- Factor 5: Demoras y Tiempos
    delay_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    total_delay_minutes DECIMAL(10,2),
    avg_delay_minutes DECIMAL(10,2),
    max_delay_minutes DECIMAL(10,2),

    -- SCORE FINAL (0-100)
    final_risk_score DECIMAL(5,2) NOT NULL,
    risk_level VARCHAR(20) NOT NULL, -- LOW, MODERATE, HIGH, CRITICAL, SEVERE
    risk_category VARCHAR(50), -- traffic_congestion, weather_hazard, incident_zone, mixed

    -- Pesos utilizados en el cálculo
    weights JSONB DEFAULT '{
        "traffic": 0.25,
        "incidents": 0.30,
        "weather": 0.20,
        "speed": 0.15,
        "delay": 0.10
    }'::jsonb,

    -- Metadata adicional
    data_quality_score DECIMAL(3,2), -- Confianza en los datos (0-1)
    alert_triggered BOOLEAN DEFAULT FALSE,
    alert_message TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_criticality_polygon ON polygon_criticality_scores(polygon_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_criticality_group ON polygon_criticality_scores(group_name, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_criticality_risk_level ON polygon_criticality_scores(risk_level, final_risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_criticality_calculated ON polygon_criticality_scores(calculated_at DESC);

-- Comentarios
COMMENT ON TABLE polygon_criticality_scores IS 'Scores de criticidad multifactorial calculados periódicamente';
COMMENT ON COLUMN polygon_criticality_scores.final_risk_score IS 'Score 0-100: bajo=0-20, moderado=21-40, alto=41-60, crítico=61-80, severo=81-100';
COMMENT ON COLUMN polygon_criticality_scores.risk_category IS 'Categoría dominante del riesgo';

-- Vista materializada para últimos scores por polígono
CREATE MATERIALIZED VIEW IF NOT EXISTS latest_polygon_risk_scores AS
SELECT DISTINCT ON (polygon_id)
    polygon_id,
    polygon_name,
    group_name,
    calculated_at,
    traffic_score,
    incident_score,
    weather_score,
    speed_score,
    delay_score,
    final_risk_score,
    risk_level,
    risk_category,
    alert_triggered
FROM polygon_criticality_scores
ORDER BY polygon_id, calculated_at DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_latest_risk_polygon ON latest_polygon_risk_scores(polygon_id);

-- Función para refrescar la vista materializada
CREATE OR REPLACE FUNCTION refresh_risk_scores_view()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY latest_polygon_risk_scores;
END;
$$ LANGUAGE plpgsql;




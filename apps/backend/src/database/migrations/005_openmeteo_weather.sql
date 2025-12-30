-- Migration: 005_openmeteo_weather.sql
-- Description: Simplified weather table for Open-Meteo data
-- Created: 2025-12-29

-- ============================================================================
-- TABLA: polygon_weather_data (simplificada para Open-Meteo)
-- ============================================================================
CREATE TABLE IF NOT EXISTS polygon_weather_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    polygon_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    temperature_celsius DECIMAL(5,2),
    precipitation_mm DECIMAL(6,2),
    weather_code INTEGER,
    wind_speed_kmh DECIMAL(5,2),
    visibility_m INTEGER,
    humidity_percent DECIMAL(5,2),
    is_dangerous BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(polygon_id, timestamp)
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_weather_polygon_time ON polygon_weather_data(polygon_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_weather_dangerous ON polygon_weather_data(is_dangerous, timestamp DESC);

-- ============================================================================
-- COMENTARIOS
-- ============================================================================
COMMENT ON TABLE polygon_weather_data IS 'Datos meteorológicos de Open-Meteo por polígono';
COMMENT ON COLUMN polygon_weather_data.weather_code IS 'Código WMO del estado del clima (0=despejado, 95=tormenta, etc.)';
COMMENT ON COLUMN polygon_weather_data.is_dangerous IS 'Indica condiciones peligrosas para el tráfico';

-- Migration: 010_extend_weather_data.sql
-- Description: Extend polygon_weather_data table to match weatherService requirements
-- Created: 2026-01-02

-- ============================================================================
-- Agregar columnas faltantes a polygon_weather_data
-- ============================================================================

-- Sensación térmica
ALTER TABLE polygon_weather_data
ADD COLUMN IF NOT EXISTS temperature_feels_like DECIMAL(5,2);

-- Lluvia separada
ALTER TABLE polygon_weather_data
ADD COLUMN IF NOT EXISTS rain_mm DECIMAL(6,2);

-- Nieve
ALTER TABLE polygon_weather_data
ADD COLUMN IF NOT EXISTS snow_mm DECIMAL(6,2);

-- Probabilidad de precipitación
ALTER TABLE polygon_weather_data
ADD COLUMN IF NOT EXISTS precipitation_probability INTEGER;

-- Dirección del viento
ALTER TABLE polygon_weather_data
ADD COLUMN IF NOT EXISTS wind_direction_degrees INTEGER;

-- Ráfagas de viento
ALTER TABLE polygon_weather_data
ADD COLUMN IF NOT EXISTS wind_gusts_kmh DECIMAL(5,2);

-- Visibilidad en metros (renombrar de visibility_m si existe)
ALTER TABLE polygon_weather_data
ADD COLUMN IF NOT EXISTS visibility_meters INTEGER;

-- Cobertura de nubes
ALTER TABLE polygon_weather_data
ADD COLUMN IF NOT EXISTS cloud_cover_percentage INTEGER;

-- Temperatura de carretera
ALTER TABLE polygon_weather_data
ADD COLUMN IF NOT EXISTS road_temperature_celsius DECIMAL(5,2);

-- Riesgo de congelamiento
ALTER TABLE polygon_weather_data
ADD COLUMN IF NOT EXISTS is_freezing_risk BOOLEAN DEFAULT false;

-- Descripción del clima
ALTER TABLE polygon_weather_data
ADD COLUMN IF NOT EXISTS weather_description VARCHAR(255);

-- Alertas meteorológicas
ALTER TABLE polygon_weather_data
ADD COLUMN IF NOT EXISTS has_weather_alert BOOLEAN DEFAULT false;

-- Severidad de alerta
ALTER TABLE polygon_weather_data
ADD COLUMN IF NOT EXISTS alert_severity VARCHAR(50);

-- Descripción de alerta
ALTER TABLE polygon_weather_data
ADD COLUMN IF NOT EXISTS alert_description TEXT;

-- ============================================================================
-- Migrar datos de visibility_m a visibility_meters si existen
-- ============================================================================
UPDATE polygon_weather_data
SET visibility_meters = visibility_m
WHERE visibility_m IS NOT NULL AND visibility_meters IS NULL;

COMMENT ON TABLE polygon_weather_data IS 'Datos meteorológicos extendidos por polígono (Open-Meteo/AccuWeather)';

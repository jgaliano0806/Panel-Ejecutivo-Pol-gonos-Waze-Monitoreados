-- Migration: 004_waze_tables.sql
-- Description: Tables for Waze Feed persistent storage
-- Created: 2025-12-29

-- ============================================================================
-- TABLA: waze_alerts - Reportes de usuarios (accidentes, peligros, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS waze_alerts (
    uuid VARCHAR(100) PRIMARY KEY,
    polygon_id VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    subtype VARCHAR(100),
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    street VARCHAR(255),
    city VARCHAR(100),
    country VARCHAR(100),
    pub_millis BIGINT NOT NULL,
    reliability DECIMAL(3,1),
    confidence DECIMAL(3,1),
    report_description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLA: waze_jams - Embotellamientos calculados por Waze
-- ============================================================================
CREATE TABLE IF NOT EXISTS waze_jams (
    uuid VARCHAR(100) PRIMARY KEY,
    polygon_id VARCHAR(50) NOT NULL,
    level INTEGER NOT NULL,
    polyline JSONB NOT NULL,
    speed_kmh DECIMAL(6,2),
    delay_seconds INTEGER,
    length_meters DECIMAL(10,2),
    street VARCHAR(255),
    city VARCHAR(100),
    pub_millis BIGINT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLA: waze_irregularities - Tráfico anómalo vs patrones regulares
-- ============================================================================
CREATE TABLE IF NOT EXISTS waze_irregularities (
    uuid VARCHAR(100) PRIMARY KEY,
    polygon_id VARCHAR(50) NOT NULL,
    type VARCHAR(50),
    detection_date TIMESTAMPTZ,
    street VARCHAR(255),
    speed DECIMAL(6,2),
    regular_speed DECIMAL(6,2),
    delay_seconds INTEGER,
    severity DECIMAL(3,1),
    jam_level INTEGER,
    trend INTEGER,
    polyline JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES OPTIMIZADOS PARA CONSULTAS POR POLÍGONO
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_alerts_polygon ON waze_alerts(polygon_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jams_polygon ON waze_jams(polygon_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_irreg_polygon ON waze_irregularities(polygon_id, is_active, created_at DESC);

-- Índices adicionales para búsquedas por tipo y timestamp
CREATE INDEX IF NOT EXISTS idx_alerts_type ON waze_alerts(type, is_active);
CREATE INDEX IF NOT EXISTS idx_alerts_pub_millis ON waze_alerts(pub_millis DESC);
CREATE INDEX IF NOT EXISTS idx_jams_level ON waze_jams(level, is_active);
CREATE INDEX IF NOT EXISTS idx_jams_pub_millis ON waze_jams(pub_millis DESC);

-- ============================================================================
-- TRIGGER: Actualizar updated_at automáticamente en waze_alerts
-- ============================================================================
CREATE OR REPLACE FUNCTION update_waze_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_waze_alerts_updated_at ON waze_alerts;
CREATE TRIGGER trigger_waze_alerts_updated_at
    BEFORE UPDATE ON waze_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_waze_alerts_updated_at();

-- ============================================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ============================================================================
COMMENT ON TABLE waze_alerts IS 'Reportes de usuarios de Waze (accidentes, peligros, cierres, etc.)';
COMMENT ON TABLE waze_jams IS 'Datos de congestión calculados por Waze';
COMMENT ON TABLE waze_irregularities IS 'Tráfico anómalo comparado con patrones regulares';

COMMENT ON COLUMN waze_alerts.reliability IS 'Confiabilidad del usuario reportante (0-10)';
COMMENT ON COLUMN waze_alerts.confidence IS 'Confirmación por comunidad (0-10)';
COMMENT ON COLUMN waze_jams.level IS 'Nivel de congestión (0=fluido, 5=detenido)';
COMMENT ON COLUMN waze_irregularities.trend IS 'Tendencia: -1=mejora, 0=estable, 1=empeora';

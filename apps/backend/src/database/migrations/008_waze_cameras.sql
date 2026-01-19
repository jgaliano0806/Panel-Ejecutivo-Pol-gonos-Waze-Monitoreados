-- Migration: 008_waze_cameras.sql
-- Description: Tabla para cámaras fijas de Waze (Cameras Feed)
-- Created: 2026-01-14

-- ============================================================================
-- TABLA: waze_cameras - Cámaras fijas de velocidad y semáforo
-- ============================================================================
CREATE TABLE IF NOT EXISTS waze_cameras (
    id VARCHAR(100) PRIMARY KEY,
    polygon_id VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,  -- SPEED, RED_LIGHT, FAKE, MOBILE
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    street VARCHAR(255),
    city VARCHAR(100),
    direction VARCHAR(50),      -- Dirección de la cámara
    speed_limit INTEGER,        -- Límite de velocidad (km/h)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES OPTIMIZADOS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_cameras_polygon ON waze_cameras(polygon_id, is_active);
CREATE INDEX IF NOT EXISTS idx_cameras_type ON waze_cameras(type, is_active);
CREATE INDEX IF NOT EXISTS idx_cameras_location ON waze_cameras(latitude, longitude);

-- ============================================================================
-- TRIGGER: Actualizar updated_at automáticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION update_waze_cameras_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_waze_cameras_updated_at ON waze_cameras;
CREATE TRIGGER trigger_waze_cameras_updated_at
    BEFORE UPDATE ON waze_cameras
    FOR EACH ROW
    EXECUTE FUNCTION update_waze_cameras_updated_at();

-- ============================================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ============================================================================
COMMENT ON TABLE waze_cameras IS 'Cámaras fijas de velocidad y semáforo de Waze';
COMMENT ON COLUMN waze_cameras.type IS 'Tipo de cámara: SPEED, RED_LIGHT, FAKE, MOBILE';
COMMENT ON COLUMN waze_cameras.direction IS 'Dirección en la que apunta la cámara';
COMMENT ON COLUMN waze_cameras.speed_limit IS 'Límite de velocidad en km/h';

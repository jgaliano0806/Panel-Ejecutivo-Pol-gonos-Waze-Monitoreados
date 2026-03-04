-- =========================================================
-- Migración 036: Tabla kilometer_markers
-- Hitos kilométricos de rutas para referencia en mapa y TTS
-- =========================================================
CREATE TABLE IF NOT EXISTS kilometer_markers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    route_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_km_markers_active ON kilometer_markers(is_active);
CREATE INDEX IF NOT EXISTS idx_km_markers_coords ON kilometer_markers(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_km_markers_name ON kilometer_markers(name);

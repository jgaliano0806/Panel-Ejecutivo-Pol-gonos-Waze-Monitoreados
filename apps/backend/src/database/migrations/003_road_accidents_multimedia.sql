-- ===========================================
-- MIGRACIÓN: Gestión de Siniestros Viales y Multimedia
-- Fecha: 2025-12-24
-- ===========================================

-- 1. Tabla de Siniestros Viales (Road Accidents)
CREATE TABLE IF NOT EXISTS road_accidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Vínculo opcional con el ID de incidente de Waze
    incident_id VARCHAR(100),

    -- Datos completos en formato JSON para flexibilidad
    waze_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    weather_data JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Campos normalizados para búsqueda rápida
    type VARCHAR(50) DEFAULT 'ACCIDENT',
    subtype VARCHAR(50),
    severity INTEGER,
    street VARCHAR(200),
    location_lat DECIMAL(10, 8) NOT NULL,
    location_lng DECIMAL(11, 8) NOT NULL,

    -- Notas del operador
    operator_notes TEXT,

    -- Tiempos
    accident_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_road_accidents_incident_id ON road_accidents(incident_id);
CREATE INDEX IF NOT EXISTS idx_road_accidents_date ON road_accidents(accident_at DESC);
CREATE INDEX IF NOT EXISTS idx_road_accidents_location ON road_accidents(location_lat, location_lng);

-- 2. Tabla de Multimedia de Accidentes
CREATE TABLE IF NOT EXISTS accident_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accident_id UUID NOT NULL REFERENCES road_accidents(id) ON DELETE CASCADE,

    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'image', 'video'
    original_name VARCHAR(255),
    file_size_bytes BIGINT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para carga rápida de multimedia
CREATE INDEX IF NOT EXISTS idx_accident_media_accident ON accident_media(accident_id);

-- Comentarios
COMMENT ON TABLE road_accidents IS 'Registro formal de siniestros viales con datos de Waze, Clima y observaciones';
COMMENT ON TABLE accident_media IS 'Archivos multimedia (fotos/videos) asociados a un siniestro vial';

-- Trigger para updated_at
CREATE TRIGGER update_road_accidents_updated_at
    BEFORE UPDATE ON road_accidents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

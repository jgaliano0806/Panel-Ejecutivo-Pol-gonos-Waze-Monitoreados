-- ===========================================
-- MÓDULO DE SINIESTROS VIALES
-- Tablas para gestión de accidentes con respaldo multimedia
-- ===========================================

-- Tabla principal: Siniestros/Accidentes Viales
CREATE TABLE IF NOT EXISTS road_accidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Vinculación con incidente de Waze (opcional)
    incident_id VARCHAR(100) UNIQUE,  -- UUID del incidente de Waze si viene de ahí

    -- Datos del incidente de Waze (JSON completo)
    waze_data JSONB DEFAULT '{}'::jsonb,

    -- Datos climáticos al momento del accidente (Open-Meteo)
    weather_data JSONB DEFAULT '{}'::jsonb,

    -- Clasificación del accidente
    type VARCHAR(50),           -- ACCIDENT, HAZARD, etc.
    subtype VARCHAR(100),       -- ACCIDENT_MAJOR, ACCIDENT_MINOR, etc.
    severity INTEGER CHECK (severity BETWEEN 1 AND 5),

    -- Ubicación
    street VARCHAR(255),
    city VARCHAR(100),
    location_lat DECIMAL(10, 7) NOT NULL,
    location_lng DECIMAL(11, 7) NOT NULL,

    -- Notas del operador
    operator_notes TEXT,

    -- Timestamps
    accident_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- Momento del accidente
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_road_accidents_incident_id ON road_accidents(incident_id) WHERE incident_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_road_accidents_location ON road_accidents(location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_road_accidents_accident_at ON road_accidents(accident_at DESC);
CREATE INDEX IF NOT EXISTS idx_road_accidents_created_at ON road_accidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_road_accidents_severity ON road_accidents(severity DESC);

-- Tabla de archivos multimedia (fotos/videos) del accidente
CREATE TABLE IF NOT EXISTS accident_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relación con el accidente
    accident_id UUID NOT NULL REFERENCES road_accidents(id) ON DELETE CASCADE,

    -- Información del archivo
    file_path VARCHAR(500) NOT NULL,    -- Ruta relativa al archivo
    file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('image', 'video')),
    original_name VARCHAR(255),
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),

    -- Metadata adicional
    width INTEGER,
    height INTEGER,
    duration_seconds INTEGER,   -- Para videos

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para archivos multimedia
CREATE INDEX IF NOT EXISTS idx_accident_media_accident_id ON accident_media(accident_id);
CREATE INDEX IF NOT EXISTS idx_accident_media_file_type ON accident_media(file_type);

-- Trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS update_road_accidents_updated_at ON road_accidents;
CREATE TRIGGER update_road_accidents_updated_at
    BEFORE UPDATE ON road_accidents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios
COMMENT ON TABLE road_accidents IS 'Siniestros viales registrados con datos de Waze/Open-Meteo y respaldo multimedia';
COMMENT ON TABLE accident_media IS 'Archivos multimedia (fotos/videos) vinculados a siniestros viales';
COMMENT ON COLUMN road_accidents.incident_id IS 'UUID del incidente de Waze que originó este registro (si aplica)';
COMMENT ON COLUMN road_accidents.waze_data IS 'Datos completos del incidente de Waze (confiabilidad, votos, etc.)';
COMMENT ON COLUMN road_accidents.weather_data IS 'Datos climáticos de Open-Meteo al momento del accidente';

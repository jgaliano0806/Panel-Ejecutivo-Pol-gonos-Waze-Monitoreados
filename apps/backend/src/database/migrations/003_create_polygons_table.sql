-- Migración para crear la tabla de configuración de polígonos
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

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_config_polygons_group ON config_polygons("group");
CREATE INDEX IF NOT EXISTS idx_config_polygons_active ON config_polygons(is_active);

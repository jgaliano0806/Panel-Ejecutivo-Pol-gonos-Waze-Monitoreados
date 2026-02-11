-- ===========================================
-- MIGRACIÓN 025: Catálogo de grupos de polígonos
-- Permite CRUD de grupos y FK opcional desde config_polygons
-- ===========================================
CREATE TABLE IF NOT EXISTS polygon_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_polygon_groups_name ON polygon_groups(name);

-- Poblar con grupos existentes en config_polygons
INSERT INTO polygon_groups (name, sort_order)
SELECT DISTINCT "group", 0
FROM config_polygons
WHERE "group" IS NOT NULL AND TRIM("group") != ''
ON CONFLICT (name) DO NOTHING;

-- =========================================================
-- Migración 038: Agregar polygon_id a kilometer_markers
-- Vincula hitos kilométricos al polígono específico que los contiene
-- =========================================================
ALTER TABLE kilometer_markers
ADD COLUMN IF NOT EXISTS polygon_id VARCHAR(50) REFERENCES config_polygons(id) ON DELETE
SET NULL;
CREATE INDEX IF NOT EXISTS idx_km_markers_polygon ON kilometer_markers(polygon_id);

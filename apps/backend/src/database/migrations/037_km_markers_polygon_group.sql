-- =========================================================
-- Migración 037: Agregar polygon_group_id a kilometer_markers
-- Vincula los hitos kilométricos con los grupos de polígonos
-- =========================================================
ALTER TABLE kilometer_markers
ADD COLUMN IF NOT EXISTS polygon_group_id INTEGER REFERENCES polygon_groups(id) ON DELETE
SET NULL;
CREATE INDEX IF NOT EXISTS idx_km_markers_group ON kilometer_markers(polygon_group_id);

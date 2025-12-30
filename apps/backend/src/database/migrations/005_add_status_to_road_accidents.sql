-- Agregar campos status y polygon_id a road_accidents
-- El campo status controla si el accidente está activo (en el feed de Waze) o inactivo (histórico)
-- El campo polygon_id vincula el accidente con los polígonos de la RAC

ALTER TABLE road_accidents
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
ADD COLUMN IF NOT EXISTS polygon_id VARCHAR(50);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_road_accidents_status ON road_accidents(status);
CREATE INDEX IF NOT EXISTS idx_road_accidents_polygon_id ON road_accidents(polygon_id) WHERE polygon_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_road_accidents_active_polygon ON road_accidents(polygon_id, status) WHERE status = 'active';

-- Comentarios
COMMENT ON COLUMN road_accidents.status IS 'Estado del accidente: active (en feed de Waze) o inactive (histórico)';
COMMENT ON COLUMN road_accidents.polygon_id IS 'ID del polígono de la RAC donde ocurrió el accidente';

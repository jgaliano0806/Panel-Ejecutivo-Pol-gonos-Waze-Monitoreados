-- ===========================================
-- MIGRACIÓN 026: Restaurar polígonos ocultos y grupo Ruta 9 Norte
-- Corrige polígonos con is_active NULL y añade grupo Ruta 9 Norte
-- ===========================================

-- Restaurar is_active para polígonos que quedaron NULL (bug al editar)
UPDATE config_polygons
SET is_active = true, updated_at = NOW()
WHERE is_active IS NULL;

-- Añadir grupo Ruta 9 Norte si no existe
INSERT INTO polygon_groups (name, sort_order)
VALUES ('Ruta 9 Norte', 0)
ON CONFLICT (name) DO NOTHING;

-- Asignar polígonos RN 9 Norte al grupo Ruta 9 Norte
UPDATE config_polygons
SET "group" = 'Ruta 9 Norte', updated_at = NOW()
WHERE name IN ('RN 9 N-1', 'RN 9 N-2', 'RN 9 N-3', 'RN 9 N-4', 'R9N-Vte. Gral Paz');

-- Script para verificar datos de jams en la base de datos
-- Ejecutar en PostgreSQL

-- 1. Contar jams activos totales
SELECT COUNT(*) as total_jams
FROM waze_jams
WHERE is_active = true;

-- 2. Ver jams con polylines
SELECT
    uuid,
    polygon_id,
    level,
    speed_kmh,
    length_meters,
    street,
    CASE
        WHEN polyline IS NULL THEN 'NULL'
        WHEN jsonb_array_length(polyline) = 0 THEN 'EMPTY'
        ELSE 'HAS_DATA (' || jsonb_array_length(polyline) || ' points)'
    END as polyline_status
FROM waze_jams
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 20;

-- 3. Verificar estructura de polylines
SELECT
    polygon_id,
    COUNT(*) as jam_count,
    COUNT(CASE WHEN polyline IS NOT NULL AND jsonb_array_length(polyline) > 1 THEN 1 END) as jams_with_valid_polyline
FROM waze_jams
WHERE is_active = true
GROUP BY polygon_id
ORDER BY jam_count DESC;

-- 4. Ver un ejemplo de polyline
SELECT
    uuid,
    polygon_id,
    polyline
FROM waze_jams
WHERE is_active = true
AND polyline IS NOT NULL
AND jsonb_array_length(polyline) > 1
LIMIT 1;

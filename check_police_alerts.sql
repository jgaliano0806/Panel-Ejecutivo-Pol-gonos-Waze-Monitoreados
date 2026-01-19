-- Script para verificar si hay alertas de policía en la base de datos
-- Ejecutar en PostgreSQL para diagnosticar el problema

-- 1. Contar alertas de policía activas
SELECT
    COUNT(*) as total_police_alerts,
    COUNT(DISTINCT polygon_id) as polygons_with_police
FROM waze_alerts
WHERE type ILIKE '%POLICE%'
AND is_active = true;

-- 2. Ver detalles de alertas de policía en AU9
SELECT
    uuid,
    type,
    subtype,
    polygon_id,
    street,
    latitude,
    longitude,
    pub_millis,
    reliability,
    confidence,
    created_at
FROM waze_alerts
WHERE polygon_id = 'AU9'
AND type ILIKE '%POLICE%'
AND is_active = true
ORDER BY created_at DESC
LIMIT 10;

-- 3. Ver todos los tipos de alertas activas (para comparar)
SELECT
    type,
    subtype,
    COUNT(*) as count
FROM waze_alerts
WHERE is_active = true
GROUP BY type, subtype
ORDER BY count DESC;

-- 4. Verificar si hay alertas de policía en cualquier polígono
SELECT
    polygon_id,
    type,
    subtype,
    COUNT(*) as count
FROM waze_alerts
WHERE type ILIKE '%POLICE%'
AND is_active = true
GROUP BY polygon_id, type, subtype
ORDER BY count DESC
LIMIT 20;

-- Verificación de datos en waze_alerts
-- Ejecutar en pgAdmin o cliente PostgreSQL

-- 1. Total de alertas activas
SELECT COUNT(*) as total_alerts
FROM waze_alerts
WHERE is_active = true;

-- 2. Distribución por tipo y subtipo
SELECT
  type,
  subtype,
  COUNT(*) as count,
  MAX(created_at) as last_seen
FROM waze_alerts
WHERE is_active = true
GROUP BY type, subtype
ORDER BY count DESC;

-- 3. Buscar alertas de policía específicamente
SELECT *
FROM waze_alerts
WHERE is_active = true
  AND (
    type ILIKE '%police%'
    OR subtype ILIKE '%police%'
  )
LIMIT 10;

-- 4. Total de jams y jams con polyline
SELECT
  COUNT(*) as total_jams,
  COUNT(CASE WHEN polyline IS NOT NULL THEN 1 END) as jams_with_polyline,
  COUNT(CASE WHEN jsonb_array_length(polyline) >= 2 THEN 1 END) as jams_with_valid_line
FROM waze_jams
WHERE is_active = true;

-- 5. Ver últimas 20 alertas
SELECT
  uuid,
  type,
  subtype,
  street,
  polygon_id,
  created_at
FROM waze_alerts
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 20;

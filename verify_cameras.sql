-- Verificar si hay alertas de tipo CAMERA en la BD
SELECT
  type,
  subtype,
  COUNT(*) as count,
  MAX(created_at) as last_seen,
  polygon_id
FROM waze_alerts
WHERE is_active = true
  AND (
    type ILIKE '%camera%'
    OR subtype ILIKE '%camera%'
  )
GROUP BY type, subtype, polygon_id
ORDER BY count DESC;

-- Ver todas las alertas del polígono específico
SELECT
  uuid,
  type,
  subtype,
  street,
  latitude,
  longitude,
  created_at
FROM waze_alerts
WHERE polygon_id = 'P001'  -- Cambiar por el ID del polígono
  AND is_active = true
ORDER BY created_at DESC
LIMIT 50;

-- Ver distribución de tipos en todos los polígonos
SELECT
  type,
  COUNT(*) as count
FROM waze_alerts
WHERE is_active = true
GROUP BY type
ORDER BY count DESC;

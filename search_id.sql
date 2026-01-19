-- Buscar ID específico: eabe1424-8078-4e5d-b145-aca8d1e6fad0

-- 1. Buscar en waze_alerts
SELECT
    'ALERT' as source,
    uuid,
    type,
    subtype,
    street,
    latitude,
    longitude,
    pub_millis,
    is_active,
    created_at
FROM waze_alerts
WHERE uuid = 'eabe1424-8078-4e5d-b145-aca8d1e6fad0'
   OR uuid LIKE '%eabe1424%'
   OR uuid LIKE '%8078%'
   OR uuid LIKE '%b145%';

-- 2. Buscar en waze_jams
SELECT
    'JAM' as source,
    uuid,
    polygon_id,
    level,
    speed_kmh,
    street,
    blocking_alert_uuid,
    CASE
        WHEN polyline IS NULL THEN 'NULL'
        WHEN jsonb_array_length(polyline) = 0 THEN 'EMPTY'
        ELSE 'HAS_DATA (' || jsonb_array_length(polyline) || ' points)'
    END as polyline_status,
    is_active,
    created_at
FROM waze_jams
WHERE uuid = 'eabe1424-8078-4e5d-b145-aca8d1e6fad0'
   OR blocking_alert_uuid = 'eabe1424-8078-4e5d-b145-aca8d1e6fad0'
   OR uuid LIKE '%eabe1424%'
   OR uuid LIKE '%8078%'
   OR uuid LIKE '%b145%';

-- 3. Si es un alert, buscar jams que lo referencien
SELECT
    'JAM_REFERENCING_ALERT' as source,
    j.uuid as jam_uuid,
    j.polygon_id,
    j.level,
    j.speed_kmh,
    j.street,
    j.blocking_alert_uuid,
    a.type as alert_type,
    a.subtype as alert_subtype,
    a.street as alert_street,
    CASE
        WHEN j.polyline IS NULL THEN 'NULL'
        WHEN jsonb_array_length(j.polyline) = 0 THEN 'EMPTY'
        ELSE 'HAS_DATA (' || jsonb_array_length(j.polyline) || ' points)'
    END as polyline_status
FROM waze_jams j
INNER JOIN waze_alerts a ON j.blocking_alert_uuid = a.uuid
WHERE a.uuid = 'eabe1424-8078-4e5d-b145-aca8d1e6fad0'
AND j.is_active = true
AND a.is_active = true;

-- 4. Buscar alertas de ROAD_CLOSED activas
SELECT
    uuid,
    type,
    subtype,
    street,
    city,
    latitude,
    longitude,
    polygon_id,
    pub_millis,
    created_at
FROM waze_alerts
WHERE type ILIKE '%ROAD%CLOSED%'
AND is_active = true
ORDER BY created_at DESC
LIMIT 10;

-- 5. Buscar jams con blocking_alert_uuid poblado
SELECT
    j.uuid as jam_uuid,
    j.blocking_alert_uuid,
    j.street as jam_street,
    j.level,
    j.speed_kmh,
    a.type as alert_type,
    a.subtype as alert_subtype,
    a.street as alert_street,
    CASE
        WHEN j.polyline IS NULL THEN 'NULL'
        WHEN jsonb_array_length(j.polyline) = 0 THEN 'EMPTY'
        ELSE 'HAS_DATA (' || jsonb_array_length(j.polyline) || ' points)'
    END as polyline_status
FROM waze_jams j
LEFT JOIN waze_alerts a ON j.blocking_alert_uuid = a.uuid
WHERE j.blocking_alert_uuid IS NOT NULL
AND j.is_active = true
ORDER BY j.created_at DESC
LIMIT 20;

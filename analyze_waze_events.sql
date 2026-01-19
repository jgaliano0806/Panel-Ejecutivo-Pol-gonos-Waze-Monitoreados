-- ============================================================================
-- WAZE EVENTS TECHNICAL ANALYSIS - FEED LITERAL VALUES
-- ============================================================================
-- Objective: Identify ALL types and subtypes present in the feed
-- No translations, no interpretations, just original technical values
-- ============================================================================

-- 1. TOTAL PROCESSED EVENTS
SELECT
    'TOTAL_ALERTS' as metric,
    COUNT(*) as count
FROM waze_alerts
WHERE is_active = true;

-- 2. UNIQUE VALUES OF TYPE
SELECT
    'UNIQUE_TYPES' as metric,
    COUNT(DISTINCT type) as count
FROM waze_alerts
WHERE is_active = true;

-- 3. UNIQUE VALUES OF SUBTYPE (including NULL)
SELECT
    'UNIQUE_SUBTYPES' as metric,
    COUNT(DISTINCT subtype) as count
FROM waze_alerts
WHERE is_active = true;

-- 4. COMPLETE LIST OF TYPE (literal values)
SELECT
    type,
    COUNT(*) as count
FROM waze_alerts
WHERE is_active = true
GROUP BY type
ORDER BY count DESC, type ASC;

-- 5. COMPLETE LIST OF SUBTYPE (literal values, including NULL)
SELECT
    COALESCE(subtype, 'null') as subtype,
    COUNT(*) as count
FROM waze_alerts
WHERE is_active = true
GROUP BY subtype
ORDER BY count DESC, subtype ASC;

-- 6. UNIQUE TYPE + SUBTYPE COMBINATIONS (technical reference table)
SELECT
    type,
    COALESCE(subtype, 'null') as subtype,
    COUNT(*) as count,
    MIN(created_at) as first_seen,
    MAX(created_at) as last_seen
FROM waze_alerts
WHERE is_active = true
GROUP BY type, subtype
ORDER BY type ASC, subtype ASC;

-- 7. TYPES WITHOUT SUBTYPE (subtype IS NULL)
SELECT
    type,
    COUNT(*) as count
FROM waze_alerts
WHERE is_active = true
  AND subtype IS NULL
GROUP BY type
ORDER BY count DESC, type ASC;

-- 8. TYPES WITH SUBTYPE (subtype IS NOT NULL)
SELECT
    type,
    COUNT(DISTINCT subtype) as unique_subtypes,
    COUNT(*) as total_events
FROM waze_alerts
WHERE is_active = true
  AND subtype IS NOT NULL
GROUP BY type
ORDER BY unique_subtypes DESC, type ASC;

-- 9. DISTRIBUTION BY POLYGON (to verify coverage)
SELECT
    polygon_id,
    COUNT(DISTINCT type) as unique_types,
    COUNT(DISTINCT subtype) as unique_subtypes,
    COUNT(*) as total_events
FROM waze_alerts
WHERE is_active = true
GROUP BY polygon_id
ORDER BY total_events DESC;

-- 10. HISTORICAL EVENTS (last 7 days) - to validate temporal variety
SELECT
    type,
    COALESCE(subtype, 'null') as subtype,
    COUNT(*) as count,
    created_at::date as day
FROM waze_alerts
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY type, subtype, created_at::date
ORDER BY day DESC, type ASC, subtype ASC;

-- ============================================================================
-- NORMALIZED JSON FORMAT (for export)
-- ============================================================================
SELECT
    json_object_agg(
        type,
        subtypes
    ) as waze_events_json
FROM (
    SELECT
        type,
        json_agg(DISTINCT COALESCE(subtype, 'null') ORDER BY COALESCE(subtype, 'null')) as subtypes
    FROM waze_alerts
    WHERE is_active = true
    GROUP BY type
) grouped;

-- ============================================================================
-- MANDATORY VALIDATIONS
-- ============================================================================

-- Total processed events
SELECT COUNT(*) as total_processed_events FROM waze_alerts WHERE is_active = true;

-- Total unique type values
SELECT COUNT(DISTINCT type) as total_unique_types FROM waze_alerts WHERE is_active = true;

-- Total unique subtype values (excluding NULL)
SELECT COUNT(DISTINCT subtype) as total_unique_subtypes FROM waze_alerts WHERE is_active = true AND subtype IS NOT NULL;

-- List of types that do not have a subtype
SELECT DISTINCT type FROM waze_alerts WHERE is_active = true AND subtype IS NULL ORDER BY type;

-- Total unique type + subtype combinations
SELECT COUNT(*) as unique_combinations FROM (
    SELECT DISTINCT type, subtype FROM waze_alerts WHERE is_active = true
) unique_combinations;

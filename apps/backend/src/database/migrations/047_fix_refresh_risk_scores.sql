-- ===========================================
-- MIGRATION: 047_fix_refresh_risk_scores
-- Garantiza que refresh_risk_scores_view() sea no-op
-- y que latest_polygon_risk_scores sea vista normal (no materializada)
-- Idempotente: soporta el estado previo materializado (002), vista normal (016)
-- o inexistente, sin abortar por "is not a materialized view".
-- ===========================================

-- 1. Eliminar el objeto previo, sea vista materializada (legacy 002) o vista normal (016).
--    DROP MATERIALIZED VIEW IF EXISTS falla con "is not a materialized view" si el
--    objeto existe como vista normal, por eso se detecta el tipo en el catálogo.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_matviews
        WHERE schemaname = 'public' AND matviewname = 'latest_polygon_risk_scores'
    ) THEN
        EXECUTE 'DROP MATERIALIZED VIEW latest_polygon_risk_scores';
    ELSIF EXISTS (
        SELECT 1 FROM pg_views
        WHERE schemaname = 'public' AND viewname = 'latest_polygon_risk_scores'
    ) THEN
        EXECUTE 'DROP VIEW latest_polygon_risk_scores';
    END IF;
END $$;

-- 2. Recrear como vista normal con predictive_score
CREATE VIEW latest_polygon_risk_scores AS
SELECT DISTINCT ON (polygon_id)
    id,
    polygon_id,
    polygon_name,
    group_name,
    traffic_score,
    incident_score,
    weather_score,
    speed_score,
    delay_score,
    predictive_score,
    final_risk_score,
    risk_level,
    risk_category,
    alert_triggered,
    calculated_at AS updated_at,
    calculated_at
FROM polygon_criticality_scores
ORDER BY polygon_id, calculated_at DESC;

-- 3. Función no-op (vista normal no requiere refresh)
CREATE OR REPLACE FUNCTION refresh_risk_scores_view()
RETURNS void AS $$
BEGIN
    NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_risk_scores_view() IS 'No-op: latest_polygon_risk_scores es vista normal, no materializada';

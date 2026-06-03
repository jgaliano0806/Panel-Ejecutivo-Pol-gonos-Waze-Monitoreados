-- ===========================================
-- MIGRATION: 047_fix_refresh_risk_scores
-- Garantiza que refresh_risk_scores_view() sea no-op
-- y que latest_polygon_risk_scores sea vista normal (no materializada)
-- ===========================================

-- 1. Eliminar vista materializada si existe (legacy de migración 002)
DROP MATERIALIZED VIEW IF EXISTS latest_polygon_risk_scores;

-- 2. Recrear como vista normal con predictive_score
CREATE OR REPLACE VIEW latest_polygon_risk_scores AS
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

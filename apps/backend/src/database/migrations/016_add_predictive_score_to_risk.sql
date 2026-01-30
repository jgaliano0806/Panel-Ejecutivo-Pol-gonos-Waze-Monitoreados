-- ===========================================
-- MIGRATION: 016_add_predictive_score_to_risk
-- Agrega columna predictive_score a las tablas de riesgo
-- ===========================================
-- 1. Tabla base de scores detallados
ALTER TABLE polygon_criticality_scores
ADD COLUMN IF NOT EXISTS predictive_score NUMERIC(5, 2) DEFAULT 0;
-- 2. Actualizar la vista materializada para incluir la nueva columna
DROP VIEW IF EXISTS latest_polygon_risk_scores;
CREATE OR REPLACE VIEW latest_polygon_risk_scores AS
SELECT DISTINCT ON (polygon_id) id,
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
    calculated_at as updated_at,
    calculated_at
FROM polygon_criticality_scores
ORDER BY polygon_id,
    calculated_at DESC;
-- 3. Función de refresco (si existe una vista materializada real, ajustarla)
CREATE OR REPLACE FUNCTION refresh_risk_scores_view() RETURNS void AS $$ BEGIN -- En este esquema parece que usamos una vista normal o materializada
    -- Si es materializada: REFRESH MATERIALIZED VIEW latest_polygon_risk_scores;
    -- Por ahora la recreamos o dejamos que la vista normal actúe.
    NULL;
END;
$$ LANGUAGE plpgsql;

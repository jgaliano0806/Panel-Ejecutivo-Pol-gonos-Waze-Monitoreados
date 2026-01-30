-- ===========================================
-- MIGRATION: 015_extend_snapshot_retention
-- Extiende la retención de snapshots de 7 a 90 días
-- para permitir análisis predictivo histórico.
-- ===========================================

CREATE OR REPLACE FUNCTION cleanup_old_snapshots()
RETURNS void AS $$
BEGIN
    -- Eliminar snapshots globales más antiguos que 90 días (antes 7)
    DELETE FROM historical_snapshots
    WHERE timestamp < NOW() - INTERVAL '90 days';

    -- Eliminar snapshots de polígonos más antiguos que 90 días (antes 7)
    DELETE FROM polygon_snapshots
    WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

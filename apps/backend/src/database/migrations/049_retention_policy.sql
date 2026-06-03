-- ===========================================
-- MIGRATION: 049_retention_policy
-- Política de retención: purgar datos históricos > 30 días
-- ===========================================

-- 1. Función para purgar polygon_snapshots antiguos
CREATE OR REPLACE FUNCTION purge_old_polygon_snapshots(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM polygon_snapshots
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    IF deleted_count > 0 THEN
        RAISE NOTICE 'Purged % polygon_snapshots older than % days', deleted_count, retention_days;
    END IF;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 2. Función para purgar waze_tvt_metrics antiguos (mismo criterio)
CREATE OR REPLACE FUNCTION purge_old_tvt_metrics(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM waze_tvt_metrics
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 3. Función para purgar notifications antiguas (90 días)
CREATE OR REPLACE FUNCTION purge_old_notifications(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Función maestra que ejecuta todas las purgas
CREATE OR REPLACE FUNCTION run_retention_cleanup()
RETURNS TABLE(
    table_name TEXT,
    deleted_rows INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'polygon_snapshots'::TEXT, purge_old_polygon_snapshots(30);
    
    RETURN QUERY
    SELECT 'waze_tvt_metrics'::TEXT, purge_old_tvt_metrics(30);
    
    RETURN QUERY
    SELECT 'notifications'::TEXT, purge_old_notifications(90);
END;
$$ LANGUAGE plpgsql;

-- 5. Crear índice para acelerar purgas (si no existe)
CREATE INDEX IF NOT EXISTS idx_polygon_snapshots_created_at 
    ON polygon_snapshots(created_at);

CREATE INDEX IF NOT EXISTS idx_tvt_metrics_created_at 
    ON waze_tvt_metrics(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
    ON notifications(created_at);

COMMENT ON FUNCTION run_retention_cleanup() IS 
    'Ejecutar periódicamente (cron/pg_cron): SELECT * FROM run_retention_cleanup();';

-- NOTA: Para automatizar, usar pg_cron o un cron externo:
-- Ejemplo pg_cron (requiere extensión):
-- SELECT cron.schedule('retention-cleanup', '0 3 * * *', 'SELECT * FROM run_retention_cleanup()');
--
-- Ejemplo cron externo (ejecutar diariamente a las 3am):
-- 0 3 * * * psql -d panel_waze -c "SELECT * FROM run_retention_cleanup();"

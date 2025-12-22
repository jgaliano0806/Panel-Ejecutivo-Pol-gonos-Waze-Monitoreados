-- ===========================================
-- ESQUEMA DE BASE DE DATOS - PANEL WAZE
-- PostgreSQL Database Schema
-- ===========================================

-- Crear extensión para UUIDs (opcional, pero útil)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- TABLA: historical_snapshots
-- Almacena snapshots globales del sistema
-- ===========================================
CREATE TABLE IF NOT EXISTS historical_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    total_jams INTEGER NOT NULL DEFAULT 0,
    total_incidents INTEGER NOT NULL DEFAULT 0,
    avg_speed NUMERIC(5, 2),
    avg_delay INTEGER NOT NULL DEFAULT 0,
    critical_km NUMERIC(10, 2) NOT NULL DEFAULT 0,
    affected_polygons INTEGER NOT NULL DEFAULT 0,
    critical_polygons INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_historical_snapshots_timestamp ON historical_snapshots(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_historical_snapshots_created_at ON historical_snapshots(created_at DESC);

-- ===========================================
-- TABLA: polygon_snapshots
-- Almacena snapshots por polígono
-- ===========================================
CREATE TABLE IF NOT EXISTS polygon_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    polygon_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    total_jams INTEGER NOT NULL DEFAULT 0,
    total_incidents INTEGER NOT NULL DEFAULT 0,
    avg_speed NUMERIC(5, 2),
    avg_delay INTEGER NOT NULL DEFAULT 0,
    critical_km NUMERIC(10, 2) NOT NULL DEFAULT 0,
    affected_polygons INTEGER NOT NULL DEFAULT 1,
    critical_polygons INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_polygon_snapshots_polygon_id ON polygon_snapshots(polygon_id);
CREATE INDEX IF NOT EXISTS idx_polygon_snapshots_timestamp ON polygon_snapshots(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_polygon_snapshots_polygon_timestamp ON polygon_snapshots(polygon_id, timestamp DESC);

-- ===========================================
-- TABLA: alerts
-- Almacena alertas del sistema
-- ===========================================
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id VARCHAR(100) UNIQUE NOT NULL,
    polygon_id VARCHAR(50),
    polygon_name VARCHAR(255),
    severity INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    location VARCHAR(255),
    message TEXT,
    data JSONB,
    is_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para alertas
CREATE INDEX IF NOT EXISTS idx_alerts_polygon_id ON alerts(polygon_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_is_acknowledged ON alerts(is_acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);

-- ===========================================
-- FUNCIÓN: Limpiar snapshots antiguos
-- Elimina snapshots más antiguos que 7 días
-- ===========================================
CREATE OR REPLACE FUNCTION cleanup_old_snapshots()
RETURNS void AS $$
BEGIN
    -- Eliminar snapshots globales más antiguos que 7 días
    DELETE FROM historical_snapshots
    WHERE timestamp < NOW() - INTERVAL '7 days';

    -- Eliminar snapshots de polígonos más antiguos que 7 días
    DELETE FROM polygon_snapshots
    WHERE timestamp < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- TRIGGER: Actualizar updated_at automáticamente
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_alerts_updated_at
    BEFORE UPDATE ON alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- VISTA: Resumen de datos históricos
-- ===========================================
CREATE OR REPLACE VIEW historical_summary AS
SELECT
    COUNT(*) as total_snapshots,
    MIN(timestamp) as oldest_snapshot,
    MAX(timestamp) as newest_snapshot,
    COUNT(DISTINCT DATE_TRUNC('hour', timestamp)) as unique_hours
FROM historical_snapshots;

-- ===========================================
-- COMENTARIOS EN TABLAS
-- ===========================================
COMMENT ON TABLE historical_snapshots IS 'Snapshots globales del sistema cada hora';
COMMENT ON TABLE polygon_snapshots IS 'Snapshots individuales por polígono';
COMMENT ON TABLE alerts IS 'Alertas del sistema generadas automáticamente';


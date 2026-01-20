-- Migration: 012_incident_types_catalog.sql
-- Description: Tables for incident types and subtypes catalog management
-- Created: 2026-01-19

-- ============================================================================
-- TABLA: incident_types - Tipos principales de incidentes (ACCIDENT, HAZARD, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS incident_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'alert-triangle',
    icon_url VARCHAR(255),
    color VARCHAR(20) DEFAULT '#6b7280',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLA: incident_subtypes - Subtipos de incidentes (ACCIDENT_MINOR, HAZARD_ON_ROAD_POT_HOLE, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS incident_subtypes (
    id SERIAL PRIMARY KEY,
    type_id INTEGER NOT NULL REFERENCES incident_types(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    severity VARCHAR(20) DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    icon_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(type_id, code)
);

-- ============================================================================
-- ÍNDICES PARA OPTIMIZAR CONSULTAS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_incident_types_code ON incident_types(code);
CREATE INDEX IF NOT EXISTS idx_incident_types_active ON incident_types(is_active);
CREATE INDEX IF NOT EXISTS idx_incident_subtypes_type_id ON incident_subtypes(type_id);
CREATE INDEX IF NOT EXISTS idx_incident_subtypes_code ON incident_subtypes(code);
CREATE INDEX IF NOT EXISTS idx_incident_subtypes_active ON incident_subtypes(is_active);

-- ============================================================================
-- TRIGGER: Actualizar updated_at automáticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION update_incident_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_incident_types_updated_at ON incident_types;
CREATE TRIGGER trigger_incident_types_updated_at
    BEFORE UPDATE ON incident_types
    FOR EACH ROW
    EXECUTE FUNCTION update_incident_types_updated_at();

DROP TRIGGER IF EXISTS trigger_incident_subtypes_updated_at ON incident_subtypes;
CREATE TRIGGER trigger_incident_subtypes_updated_at
    BEFORE UPDATE ON incident_subtypes
    FOR EACH ROW
    EXECUTE FUNCTION update_incident_types_updated_at();

-- ============================================================================
-- DATOS INICIALES - Tipos principales de Waze
-- ============================================================================
INSERT INTO incident_types (code, name, description, icon, color) VALUES
    ('ACCIDENT', 'Siniestro vial', 'Accidentes de tránsito reportados por usuarios', 'car', '#ef4444'),
    ('JAM', 'Congestión', 'Embotellamientos y tráfico lento', 'clock', '#f97316'),
    ('HAZARD', 'Peligro', 'Peligros en la vía (objetos, baches, etc.)', 'alert-triangle', '#eab308'),
    ('WEATHERHAZARD', 'Peligro climático', 'Condiciones climáticas adversas', 'cloud', '#3b82f6'),
    ('CONSTRUCTION', 'Obra vial', 'Construcción o mantenimiento de vías', 'hard-hat', '#d97706'),
    ('ROAD_CLOSED', 'Corte de ruta', 'Caminos cerrados temporal o permanentemente', 'x-circle', '#dc2626'),
    ('POLICE', 'Control policial', 'Presencia policial o controles de tránsito', 'shield', '#3b82f6')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ============================================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ============================================================================
COMMENT ON TABLE incident_types IS 'Catálogo de tipos principales de incidentes de Waze';
COMMENT ON TABLE incident_subtypes IS 'Catálogo de subtipos de incidentes de Waze';
COMMENT ON COLUMN incident_types.code IS 'Código único del tipo (ej: ACCIDENT, HAZARD)';
COMMENT ON COLUMN incident_subtypes.severity IS 'Nivel de severidad: LOW, MEDIUM, HIGH, CRITICAL';

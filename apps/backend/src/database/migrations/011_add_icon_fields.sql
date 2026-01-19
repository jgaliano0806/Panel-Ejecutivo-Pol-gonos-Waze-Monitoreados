-- ════════════════════════════════════════════════════════════════
-- MIGRATION: 011_add_icon_fields
-- Fecha: 2026-01-15
-- Descripción: Agregar campos para URL de iconos customizados
-- ════════════════════════════════════════════════════════════════

BEGIN;

-- Agregar columna icon_url a incident_types
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'incident_types'
        AND column_name = 'icon_url'
    ) THEN
        ALTER TABLE incident_types ADD COLUMN icon_url TEXT;
    END IF;
END $$;

-- Agregar columna icon_url a incident_subtypes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'incident_subtypes'
        AND column_name = 'icon_url'
    ) THEN
        ALTER TABLE incident_subtypes ADD COLUMN icon_url TEXT;
    END IF;
END $$;

COMMIT;

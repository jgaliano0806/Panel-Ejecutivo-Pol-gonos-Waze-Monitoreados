-- Migration: Add icon_url column to incident_types table
-- Description: Permite almacenar URLs personalizadas de iconos SVG para tipos de incidentes

-- Add icon_url column to incident_types
ALTER TABLE incident_types
ADD COLUMN IF NOT EXISTS icon_url VARCHAR(500);

-- Add comment
COMMENT ON COLUMN incident_types.icon_url IS 'URL del icono SVG personalizado (opcional, si se usa en lugar del icono predeterminado)';

-- Create index for faster lookups if needed
CREATE INDEX IF NOT EXISTS idx_incident_types_icon_url ON incident_types(icon_url) WHERE icon_url IS NOT NULL;

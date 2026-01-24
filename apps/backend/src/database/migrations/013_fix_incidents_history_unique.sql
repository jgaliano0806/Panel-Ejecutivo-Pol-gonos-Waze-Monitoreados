-- =========================================================
-- MIGRATION 013: Agregar UNIQUE constraint a incidents_history
-- Necesario para que ON CONFLICT (incident_id) funcione
-- =========================================================

-- Primero, eliminar duplicados si existen (mantener el más reciente)
DELETE FROM incidents_history a
USING incidents_history b
WHERE a.id < b.id
  AND a.incident_id = b.incident_id;

-- Agregar constraint UNIQUE a incident_id
-- Esto permite usar ON CONFLICT (incident_id) DO UPDATE
ALTER TABLE incidents_history
ADD CONSTRAINT incidents_history_incident_id_unique UNIQUE (incident_id);

-- Crear índice para mejorar performance de búsquedas
CREATE INDEX IF NOT EXISTS idx_incidents_history_incident_id
ON incidents_history(incident_id);

-- Verificar que la constraint existe
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'incidents_history'
AND constraint_type = 'UNIQUE';

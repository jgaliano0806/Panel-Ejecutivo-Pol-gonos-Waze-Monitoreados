-- Actualizar todos los tipos de incidente a activo
UPDATE incident_types SET is_active = true WHERE is_active IS NULL OR is_active = false;

-- Actualizar todos los subtipos de incidente a activo
UPDATE incident_subtypes SET is_active = true WHERE is_active IS NULL OR is_active = false;

-- Verificar
SELECT code, name, is_active FROM incident_types ORDER BY code;

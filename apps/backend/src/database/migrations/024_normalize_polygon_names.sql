-- ===========================================
-- MIGRACIÓN 024: Normalizar espacios en nombres de polígonos
-- Regla: " - " → "-", " -" → "-", "- " → "-" (consistencia alrededor del guion)
-- ===========================================
UPDATE config_polygons
SET name = TRIM(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(name, '\s+-\s+', '-', 'g'),
      '\s+-', '-', 'g'),
    '-\s+', '-', 'g')
),
    updated_at = NOW()
WHERE name ~ '\s+-\s+' OR name ~ '\s+-' OR name ~ '-\s+';

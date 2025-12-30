-- ════════════════════════════════════════════════════════════════
-- MIGRATION: 007_normalize_naming
-- Fecha: 2025-12-30
-- Descripción: Estandarización de nombres (snake_case)
-- ════════════════════════════════════════════════════════════════

BEGIN;

-- La auditoría no reveló columnas en CamelCase masivo en el esquema public.
-- La mayoría de las tablas usan snake_case (e.g., polygon_id, created_at).

-- Ejemplo de normalización si se detectaran casos futuros:
-- ALTER TABLE IF EXISTS some_table RENAME COLUMN "camelCaseCol" TO camel_case_col;

-- Asegurar consistencia en nombramiento de claves foráneas
-- (Este paso es preventivo para asegurar que nuevas columnas sigan el estándar)

-- Normalizar nombres de Constraints si fuera necesario (Postgres auto-names are generally ok)

COMMIT;

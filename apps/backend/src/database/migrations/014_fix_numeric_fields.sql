-- =========================================================
-- MIGRATION 014: Corregir campos numéricos en incidents_history
-- Los campos confidence y reliability usan DECIMAL(3,2) que
-- solo acepta 0.00-9.99, pero Waze envía valores 0-10
-- =========================================================

-- Ampliar confidence de DECIMAL(3,2) a DECIMAL(4,2) para aceptar 10.00
ALTER TABLE incidents_history
ALTER COLUMN confidence TYPE DECIMAL(4,2);

-- Ampliar reliability de DECIMAL(3,2) a DECIMAL(4,2) para aceptar 10.00
ALTER TABLE incidents_history
ALTER COLUMN reliability TYPE DECIMAL(4,2);

-- Verificar los cambios
SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'incidents_history'
AND column_name IN ('confidence', 'reliability');

-- Migración 028: Corregir columnas INTEGER que reciben valores decimales
-- avg_delay en polygon_snapshots: es un promedio de delays, puede tener decimales
-- wazers_count en waze_tvt_metrics: Waze API retorna wazersCount como float

ALTER TABLE polygon_snapshots
  ALTER COLUMN avg_delay TYPE NUMERIC(10, 2);

-- waze_tvt_metrics se crea inline con CREATE TABLE IF NOT EXISTS,
-- puede que ya exista con tipo INTEGER
ALTER TABLE waze_tvt_metrics
  ALTER COLUMN wazers_count TYPE NUMERIC(10, 2);

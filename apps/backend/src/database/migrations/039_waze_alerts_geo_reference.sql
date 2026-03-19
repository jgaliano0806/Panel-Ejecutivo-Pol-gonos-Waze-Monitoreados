-- =========================================================
-- Migración 039: Geo-referencia y TTS en waze_alerts
-- Agrega columnas para hito kilométrico más cercano y texto TTS
-- =========================================================
ALTER TABLE waze_alerts ADD COLUMN IF NOT EXISTS nearest_km_name VARCHAR(150);
ALTER TABLE waze_alerts ADD COLUMN IF NOT EXISTS nearest_km_route VARCHAR(255);
ALTER TABLE waze_alerts ADD COLUMN IF NOT EXISTS nearest_km_distance DECIMAL(10,2);
ALTER TABLE waze_alerts ADD COLUMN IF NOT EXISTS tts_text TEXT;

CREATE INDEX IF NOT EXISTS idx_alerts_nearest_km ON waze_alerts(nearest_km_name) WHERE nearest_km_name IS NOT NULL;
